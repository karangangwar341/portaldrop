import { Socket, Server } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { UserStore } from "../auth/UserStore";
import { prisma } from "../db/prisma";

// ── LAN peer registry (in-memory, ephemeral by design) ────────────────────────
const lanPeers = new Map<string, {
  socketId: string; displayName: string;
  avatarColor: string; userId?: string; timestamp: number;
}>();

export function registerSocketHandlers(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  userStore: UserStore
): void {

  // ── Auth ───────────────────────────────────────────────────────────────────

  socket.on("auth:register", async ({ username, displayName, password }: {
    username: string; displayName: string; password: string;
  }) => {
    const result = await userStore.register(username, displayName, password);
    if (result.success) {
      socket.emit("auth:success", { token: result.token, user: result.user });
    } else {
      socket.emit("auth:error", { message: result.error });
    }
  });

  socket.on("auth:login", async ({ username, password }: { username: string; password: string }) => {
    const result = await userStore.login(username, password);
    if (result.success) {
      socket.emit("auth:success", { token: result.token, user: result.user });
    } else {
      socket.emit("auth:error", { message: result.error });
    }
  });

  socket.on("auth:validate", async ({ token }: { token: string }) => {
    const user = await userStore.validateToken(token);
    if (user) {
      socket.emit("auth:success", { token, user });
    } else {
      socket.emit("auth:invalid", {});
    }
  });

  socket.on("auth:logout", async ({ token }: { token: string }) => {
    await userStore.logout(token);
    socket.emit("auth:logged-out", {});
  });

  // ── Transfer History (server-side persistence) ─────────────────────────────

  socket.on("history:save", async ({
    token, direction, fileName, fileSize, fileType,
    peerName, roomId, status, durationMs,
  }: {
    token: string; direction: "sent" | "received";
    fileName: string; fileSize: number; fileType: string;
    peerName: string; roomId: string;
    status: "complete" | "error" | "interrupted";
    durationMs?: number;
  }) => {
    const user = await userStore.validateToken(token);
    if (!user) return;

    await prisma.transferRecord.create({
      data: {
        direction,
        fileName,
        fileSize: BigInt(fileSize),
        fileType,
        peerName,
        roomId,
        status,
        durationMs,
        sentById:     direction === "sent"     ? user.id : null,
        receivedById: direction === "received" ? user.id : null,
      },
    });
  });

  socket.on("history:fetch", async ({ token, limit = 50, offset = 0 }: {
    token: string; limit?: number; offset?: number;
  }) => {
    const user = await userStore.validateToken(token);
    if (!user) { socket.emit("history:error", { message: "Unauthorized" }); return; }

    const records = await prisma.transferRecord.findMany({
      where: {
        OR: [{ sentById: user.id }, { receivedById: user.id }],
      },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 200),
      skip: offset,
    });

    socket.emit("history:data", {
      records: records.map(r => ({
        ...r,
        fileSize: Number(r.fileSize), // BigInt → number for JSON
      })),
    });
  });

  socket.on("history:clear", async ({ token }: { token: string }) => {
    const user = await userStore.validateToken(token);
    if (!user) return;
    await prisma.transferRecord.deleteMany({
      where: { OR: [{ sentById: user.id }, { receivedById: user.id }] },
    });
    socket.emit("history:cleared", {});
  });

  // ── LAN Discovery ──────────────────────────────────────────────────────────

  socket.on("lan:announce", ({
    displayName, avatarColor, userId,
  }: { displayName: string; avatarColor: string; userId?: string }) => {
    lanPeers.set(socket.id, { socketId: socket.id, displayName, avatarColor, userId, timestamp: Date.now() });
    const others = Array.from(lanPeers.values()).filter(p => p.socketId !== socket.id);
    socket.emit("lan:peers", { peers: others });
    socket.broadcast.emit("lan:peer-appeared", {
      peer: { socketId: socket.id, displayName, avatarColor, userId, timestamp: Date.now() },
    });
  });

  socket.on("lan:leave", () => {
    lanPeers.delete(socket.id);
    socket.broadcast.emit("lan:peer-gone", { socketId: socket.id });
  });

  socket.on("lan:ping-peer", ({ targetSocketId }: { targetSocketId: string }) => {
    const self = lanPeers.get(socket.id);
    io.to(targetSocketId).emit("lan:ping-from", {
      fromSocketId: socket.id,
      displayName: self?.displayName ?? "Unknown",
    });
  });

  // ── Create Room ────────────────────────────────────────────────────────────

  socket.on("create-room", async ({
    isMultiPeer, maxPeers, token, peerSessionId
  }: { isMultiPeer?: boolean; maxPeers?: number; token?: string; peerSessionId?: string }) => {
    try {
      const user = token ? await userStore.validateToken(token) : null;
      const room = await roomManager.createRoom(socket.id, {
        isMultiPeer,
        maxPeers: maxPeers ?? (isMultiPeer ? 8 : 2),
        hostUserId: user?.id,
        peerSessionId,
      });
      socket.join(room.id);
      socket.emit("room-created", {
        roomId: room.id, password: room.password,
        expiresAt: room.expiresAt, isMultiPeer: room.isMultiPeer,
        existingPeers: []
      });
    } catch (err) {
      console.error("[Socket] Create room error:", err);
      socket.emit("room-error", { code: "UNKNOWN", message: "Failed to create room." });
    }
  });

  // ── Reclaim Room (Host Re-connect) ──────────────────────────────────────────

  socket.on("reclaim-room", async ({
    roomId, password, token, peerSessionId
  }: { roomId: string; password: string; token: string; peerSessionId?: string }) => {
    try {
      const user = await userStore.validateToken(token);
      if (!user) { socket.emit("room-error", { code: "UNAUTHORIZED", message: "Session expired." }); return; }

      const result = await roomManager.reclaimRoom(socket.id, roomId, password, user.id, peerSessionId);
      if (!result) {
        socket.emit("room-error", { code: "NOT_FOUND", message: "Could not reclaim room." });
        return;
      }

      const room = result.room;
      socket.join(room.id);

      if (result.kickedSockets && result.kickedSockets.length > 0) {
        for (const kicked of result.kickedSockets) {
          socket.to(room.id).emit("peer-disconnected", { socketId: kicked });
        }
      }

      const otherPeers = room.peers.filter(p => p.socketId !== socket.id);
      socket.emit("room-created", {
        roomId: room.id, password: room.password,
        expiresAt: room.expiresAt, isMultiPeer: room.isMultiPeer,
        existingPeers: otherPeers
      });

      // Notify existing guests that the host is back!
      const peerInfo = {
        socketId: socket.id,
        userId: user.id,
        displayName: user.displayName || "Host",
        avatarColor: user.avatarColor || "#6366F1",
      };
      socket.to(roomId).emit("peer-connected", { peer: peerInfo, peerCount: room.peers.length });
    } catch (err) {
      socket.emit("room-error", { code: "UNKNOWN", message: "Failed to reclaim room." });
    }
  });

  // ── Join Room ──────────────────────────────────────────────────────────────

  socket.on("join-room", async ({
    roomId, password, token, displayName, avatarColor, peerSessionId
  }: { roomId: string; password: string; token?: string; displayName?: string; avatarColor?: string; peerSessionId?: string }) => {
    try {
      const user = token ? await userStore.validateToken(token) : null;
      const result = await roomManager.joinRoom(
        roomId.trim().toUpperCase(),
        password.trim().toUpperCase(),
        socket.id,
        user?.id,
        peerSessionId
      );
      if (!result.success) {
        socket.emit("room-error", { code: result.code, message: result.message });
        return;
      }
      const room = result.room;
      socket.join(roomId);

      if (result.kickedSockets && result.kickedSockets.length > 0) {
        for (const kicked of result.kickedSockets) {
          socket.to(roomId).emit("peer-disconnected", { socketId: kicked });
        }
      }
      
      const otherPeers = room.peers.filter(p => p.socketId !== socket.id);
      socket.emit("room-joined", { 
        roomId, 
        peerId: socket.id, 
        peerCount: room.peers.length,
        existingPeers: otherPeers
      });

      const peerInfo = {
        socketId: socket.id,
        userId: user?.id,
        displayName: user?.displayName ?? displayName ?? "Guest",
        avatarColor: user?.avatarColor ?? avatarColor ?? "#6366F1",
      };
      socket.to(roomId).emit("peer-connected", { peer: peerInfo, peerCount: room.peers.length });
    } catch (err) {
      console.error("[Socket] Join room error:", err);
      socket.emit("room-error", { code: "UNKNOWN", message: "Failed to join room." });
    }
  });

  // ── Rooms Dashboard ────────────────────────────────────────────────────────

  socket.on("rooms:fetch", async ({ token }: { token: string }) => {
    const user = await userStore.validateToken(token);
    if (!user) { socket.emit("rooms:error", { message: "Unauthorized" }); return; }

    const rooms = await roomManager.fetchUserRooms(user.id);
    socket.emit("rooms:data", { rooms });
  });

  socket.on("rooms:delete", async ({ token, roomId }: { token: string; roomId: string }) => {
    const user = await userStore.validateToken(token);
    if (!user) { socket.emit("rooms:error", { message: "Unauthorized" }); return; }

    const success = await roomManager.deleteRoom(roomId, user.id);
    if (success) {
      io.to(roomId).emit("room:deleted", { roomId });
      // Force leave for everyone in room
      const roomSockets = await io.in(roomId).fetchSockets();
      for (const s of roomSockets) {
        s.leave(roomId);
      }
      socket.emit("rooms:deleted", { roomId });
    } else {
      socket.emit("rooms:error", { message: "Failed to delete room or unauthorized." });
    }
  });

  // ── WebRTC Signaling ───────────────────────────────────────────────────────

  socket.on("offer", ({ roomId, offer, targetSocketId }: {
    roomId: string; offer: RTCSessionDescriptionInit; targetSocketId?: string;
  }) => {
    if (targetSocketId) io.to(targetSocketId).emit("offer", { offer, fromSocketId: socket.id });
    else socket.to(roomId).emit("offer", { offer, fromSocketId: socket.id });
  });

  socket.on("answer", ({ roomId, answer, targetSocketId }: {
    roomId: string; answer: RTCSessionDescriptionInit; targetSocketId?: string;
  }) => {
    if (targetSocketId) io.to(targetSocketId).emit("answer", { answer, fromSocketId: socket.id });
    else socket.to(roomId).emit("answer", { answer, fromSocketId: socket.id });
  });

  socket.on("ice-candidate", ({ roomId, candidate, targetSocketId }: {
    roomId: string; candidate: RTCIceCandidateInit; targetSocketId?: string;
  }) => {
    if (targetSocketId) io.to(targetSocketId).emit("ice-candidate", { candidate, fromSocketId: socket.id });
    else socket.to(roomId).emit("ice-candidate", { candidate, fromSocketId: socket.id });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    lanPeers.delete(socket.id);
    socket.broadcast.emit("lan:peer-gone", { socketId: socket.id });

    const room = roomManager.removeSocketFromRoom(socket.id);
    if (room) {
      io.to(room.roomId).emit("peer-disconnected", {
        socketId: socket.id, peerCount: room.peers.length,
      });
    }
  });

  socket.on("leave-room", async ({ roomId, token }: { roomId: string, token?: string }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("peer-disconnected", { socketId: socket.id, peerCount: 0 });
    
    // Only delete from DB if explicitly requested and authorized or if guest room
    const user = token ? await userStore.validateToken(token) : null;
    if (!user) {
      await roomManager.deleteRoom(roomId);
    }
  });

  socket.on("room:notify", ({ roomId, notification }: { roomId: string; notification: object }) => {
    socket.to(roomId).emit("room:notification", notification);
  });
}
