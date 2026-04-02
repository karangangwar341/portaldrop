import { nanoid } from "nanoid";
import { prisma } from "../db/prisma";

export interface Room {
  id: string;
  password: string;
  hostUserId?: string | null;
  isMultiPeer: boolean;
  maxPeers: number;
  createdAt: Date;
  expiresAt: Date;
  // Ephemeral state
  hostSocketId?: string;
  peers: { socketId: string; userId?: string | null; peerSessionId?: string }[]; 
}

const GUEST_ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const USER_ROOM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class RoomManager {
   // roomId -> ephemeral state
   private activePeers = new Map<string, { socketId: string; userId?: string | null; peerSessionId?: string }[]>();
   private roomHosts = new Map<string, string>(); // roomId -> hostSocketId

  async createRoom(hostSocketId: string, options?: { isMultiPeer?: boolean; maxPeers?: number; hostUserId?: string; peerSessionId?: string }): Promise<Room> {
    const id = nanoid(6).toUpperCase();
    const password = nanoid(4).toUpperCase();
    const ttl = options?.hostUserId ? USER_ROOM_TTL_MS : GUEST_ROOM_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl);

    const room = await prisma.room.create({
      data: {
        id,
        password,
        hostUserId: options?.hostUserId || null,
        isMultiPeer: options?.isMultiPeer ?? false,
        maxPeers: options?.maxPeers ?? (options?.isMultiPeer ? 8 : 2),
        expiresAt,
      },
    });

     const peerObj = { socketId: hostSocketId, userId: options?.hostUserId, peerSessionId: options?.peerSessionId };
     this.activePeers.set(id, [peerObj]);
     this.roomHosts.set(id, hostSocketId);

    console.log(`[Rooms] Created room ${id} (hostUserId=${options?.hostUserId})`);
     return {
       ...room,
       hostSocketId,
       peers: [peerObj],
     };
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return undefined;

    return {
      ...room,
      hostSocketId: this.roomHosts.get(roomId),
      peers: this.activePeers.get(roomId) || [],
    };
  }
   async joinRoom(
      roomId: string,
      password: string,
      socketId: string,
      userId?: string | null,
      peerSessionId?: string
    ): Promise<{ success: true; room: Room; kickedSockets?: string[] } | { success: false; code: string; message: string }> {
     const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      return { success: false, code: "NOT_FOUND", message: "Room not found." };
    }

    if (new Date() > room.expiresAt) {
      await prisma.room.delete({ where: { id: roomId } }).catch(() => {});
      this.activePeers.delete(roomId);
      this.roomHosts.delete(roomId);
      return { success: false, code: "EXPIRED", message: "This room has expired." };
    }

    if (room.password !== password) {
      return { success: false, code: "WRONG_PASSWORD", message: "Incorrect password." };
    }

      let peers = this.activePeers.get(roomId) || [];
      const kickedSockets: string[] = [];
      
      // Clean up any existing entries for this USER (zombie sessions or other sockets)
      if (userId) {
        peers.forEach(p => { if (p.userId === userId && p.socketId !== socketId) kickedSockets.push(p.socketId); });
        peers = peers.filter(p => p.userId !== userId);
      }
      
      if (peerSessionId) {
        peers.forEach(p => { if (p.peerSessionId === peerSessionId && p.socketId !== socketId && !kickedSockets.includes(p.socketId)) kickedSockets.push(p.socketId); });
        peers = peers.filter(p => p.peerSessionId !== peerSessionId);
      }
      
      // Clean up any entry for this SOCKET (shouldn't happen but safe)
      peers.forEach(p => { if (p.socketId === socketId && !kickedSockets.includes(p.socketId)) kickedSockets.push(p.socketId); });
      peers = peers.filter(p => p.socketId !== socketId);
 
     if (!room.isMultiPeer && peers.length >= 2) {
        return { success: false, code: "FULL", message: "Room is full." };
     }
 
     if (room.isMultiPeer && peers.length >= room.maxPeers) {
       return { success: false, code: "FULL", message: `Room is full (max ${room.maxPeers} peers).` };
     }
 
     peers.push({ socketId, userId, peerSessionId });
     this.activePeers.set(roomId, peers);
     
     console.log(`[Rooms] Peer join: ${socketId} (user=${userId}, session=${peerSessionId}) -> ${roomId}`);
     return {
       success: true,
       room: {
         ...room,
         hostSocketId: this.roomHosts.get(roomId),
         peers,
       },
       kickedSockets
     };
  }

  async reclaimRoom(socketId: string, roomId: string, password: string, userId: string, peerSessionId?: string): Promise<{ room: Room; kickedSockets: string[] } | null> {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.password !== password || room.hostUserId !== userId) return null;

     // Re-assign host and clean up old host entries
     const oldHostSocketId = this.roomHosts.get(roomId);
     this.roomHosts.set(roomId, socketId);
     
     const kickedSockets: string[] = [];
     let peers = (this.activePeers.get(roomId) || []).filter(p => {
       const isOld = p.socketId === oldHostSocketId || p.userId === userId || p.socketId === socketId || (peerSessionId && p.peerSessionId === peerSessionId);
       if (isOld && p.socketId !== socketId) kickedSockets.push(p.socketId);
       return !isOld;
     });
     
     peers.push({ socketId, userId, peerSessionId });
     this.activePeers.set(roomId, peers);

    return {
      room: {
        ...room,
        hostSocketId: socketId,
        peers,
      },
      kickedSockets
    };
  }

   removeSocketFromRoom(socketId: string): { roomId: string; peers: { socketId: string; userId?: string | null; peerSessionId?: string }[] } | undefined {
     for (const [roomId, peers] of this.activePeers.entries()) {
       const idx = peers.findIndex(p => p.socketId === socketId);
       if (idx !== -1) {
         peers.splice(idx, 1);
        
        // If host left, assign new host if peers remain
        if (this.roomHosts.get(roomId) === socketId) {
          if (peers.length > 0) {
            this.roomHosts.set(roomId, peers[0].socketId);
          } else {
            this.roomHosts.delete(roomId);
          }
        }

        if (peers.length === 0) {
          // We don't delete from DB, just clean up memory
          this.activePeers.delete(roomId);
          this.roomHosts.delete(roomId);
        } else {
          this.activePeers.set(roomId, peers);
        }

        return { roomId, peers };
      }
    }
    return undefined;
  }

  async deleteRoom(roomId: string, userId?: string): Promise<boolean> {
    if (userId) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (room?.hostUserId !== userId) return false;
    }
    
    await prisma.room.delete({ where: { id: roomId } }).catch(() => {});
    this.activePeers.delete(roomId);
    this.roomHosts.delete(roomId);
    return true;
  }

  async fetchUserRooms(userId: string) {
    return prisma.room.findMany({
      where: { hostUserId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async cleanExpiredRooms(): Promise<number> {
    const result = await prisma.room.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
