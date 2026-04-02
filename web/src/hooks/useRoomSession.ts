"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket/client";
import { PeerConnection } from "../lib/webrtc/PeerConnection";
import { saveTransferRecord } from "../lib/auth/userSession";
import { saveToHistory, getRoomHistory, clearRoomHistory, type RoomHistoryItem } from "../lib/auth/roomHistory";
import type {
  ConnectionState, RoomSession, OutgoingTransfer, IncomingTransfer,
  ReceivedText, FolderTransfer, ConnectedPeer, User, TransferRecord,
} from "../types";

export interface RoomSessionState {
  connectionState: ConnectionState;
  session: RoomSession | null;
  error: string | null;
  outgoingTransfers: OutgoingTransfer[];
  incomingTransfers: IncomingTransfer[];
  folderTransfers: FolderTransfer[];
  receivedTexts: ReceivedText[];
  connectedPeers: ConnectedPeer[];
  isEncrypted: boolean;
  userRooms: any[];
  isRoomsLoading: boolean;
  createRoom: (options?: { isMultiPeer?: boolean; maxPeers?: number }) => void;
  joinRoom: (roomId: string, password: string) => void;
  disconnect: () => void;
  sendFile: (file: File) => Promise<void>;
  sendFolder: (files: File[], folderName: string) => Promise<void>;
  sendText: (content: string) => void;
  pauseTransfer: (id: string) => void;
  resumeTransfer: (id: string) => void;
  fetchUserRooms: () => void;
  deleteUserRoom: (roomId: string) => void;
  roomHistory: RoomHistoryItem[];
  fetchHistory: () => void;
  clearHistory: () => void;
}

export function useRoomSession(user?: User | null, onNotify?: (n: any) => void): RoomSessionState {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [session, setSession] = useState<RoomSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outgoingTransfers, setOutgoingTransfers] = useState<OutgoingTransfer[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [folderTransfers, setFolderTransfers] = useState<FolderTransfer[]>([]);
  const [receivedTexts, setReceivedTexts] = useState<ReceivedText[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<ConnectedPeer[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [userRooms, setUserRooms] = useState<any[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [roomHistory, setRoomHistory] = useState<RoomHistoryItem[]>([]);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);

  // multi-peer: map from socketId → PeerConnection
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const sessionRef = useRef<RoomSession | null>(null);

  const saveActiveSession = (sess: RoomSession) => {
    localStorage.setItem("portaldrop_active_room", JSON.stringify(sess));
  };

  const clearActiveSession = () => {
    localStorage.removeItem("portaldrop_active_room");
  };

  const getPeerSessionId = () => {
    if (typeof window === "undefined") return undefined;
    let id = localStorage.getItem("portaldrop_peer_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("portaldrop_peer_id", id);
    }
    return id;
  };

  const handleError = useCallback((msg: string) => { setError(msg); setConnectionState("error"); }, []);

  const disconnect = useCallback(() => {
    const socket = connectSocket();
    const stored = typeof window !== "undefined" ? localStorage.getItem("portaldrop_session") : null;
    const token = stored ? JSON.parse(stored).token : undefined;

    if (sessionRef.current) socket.emit("leave-room", { roomId: sessionRef.current.roomId, token });
    peersRef.current.forEach(p => p.destroy());
    peersRef.current.clear();
    disconnectSocket();
    clearActiveSession();
    setConnectionState("idle"); setSession(null); sessionRef.current = null;
    setOutgoingTransfers([]); setIncomingTransfers([]); setFolderTransfers([]);
    setReceivedTexts([]); setConnectedPeers([]); setIsEncrypted(false);
  }, []);

  const setupPeer = useCallback((roomId: string, role: "host" | "guest", fromSocketId?: string) => {
    const socket = connectSocket();
    const peer = new PeerConnection(socket, roomId, role, fromSocketId);
    const key = fromSocketId ?? "primary";
    peersRef.current.set(key, peer);

    peer.on("connectionStateChange", state => {
      if (state === "connected") setConnectionState("connected");
      if (state === "disconnected" || state === "failed" || state === "closed") setConnectionState("disconnected");
    });
    peer.on("dataChannelOpen", () => setConnectionState("connected"));
    peer.on("encryptionReady", () => {
      setIsEncrypted(true);
      onNotify?.({ type: "info", title: "Encrypted", message: "End-to-end encryption active" });
    });
    peer.on("outgoingTransferUpdate", t => {
      setOutgoingTransfers(prev => {
        const idx = prev.findIndex(x => x.id === t.id);
        if (idx === -1) return [...prev, t];
        const next = [...prev]; next[idx] = t; return next;
      });
      if (t.status === "complete") {
        onNotify?.({ type: "transfer-complete", title: "Transfer complete", message: `Sent ${t.file.name}` });
        if (user) {
          const rec: TransferRecord = {
            id: t.id, direction: "sent", fileName: t.file.name, fileSize: t.file.size,
            fileType: t.file.type, peerName: "Peer", roomId: sessionRef.current?.roomId ?? "",
            timestamp: t.startTime ?? Date.now(), status: "complete",
            durationMs: t.endTime && t.startTime ? t.endTime - t.startTime : undefined,
          };
          saveTransferRecord(rec);
        }
      }
    });
    peer.on("incomingTransferUpdate", t => {
      setIncomingTransfers(prev => {
        const idx = prev.findIndex(x => x.id === t.id);
        if (idx === -1) return [...prev, t];
        const next = [...prev]; next[idx] = t; return next;
      });
      if (t.status === "complete") {
        onNotify?.({ type: "transfer-complete", title: "File received", message: t.fileName });
        if (user) {
          const rec: TransferRecord = {
            id: t.id, direction: "received", fileName: t.fileName, fileSize: t.fileSize,
            fileType: t.fileType, peerName: "Peer", roomId: sessionRef.current?.roomId ?? "",
            timestamp: t.startTime ?? Date.now(), status: "complete",
            durationMs: t.endTime && t.startTime ? t.endTime - t.startTime : undefined,
          };
          saveTransferRecord(rec);
        }
      }
    });
    peer.on("folderTransferUpdate", f => {
      setFolderTransfers(prev => {
        const idx = prev.findIndex(x => x.id === f.id);
        if (idx === -1) return [...prev, f];
        const next = [...prev]; next[idx] = f; return next;
      });
    });
    peer.on("textReceived", text => setReceivedTexts(prev => [...prev, text]));
    return peer;
  }, [user, onNotify]);

  const createRoom = useCallback((options?: { isMultiPeer?: boolean; maxPeers?: number; reclaim?: boolean }) => {
    setConnectionState("creating"); setError(null);
    const socket = connectSocket();
    const stored = typeof window !== "undefined" ? localStorage.getItem("portaldrop_session") : null;
    const token = stored ? JSON.parse(stored).token : undefined;

    const onCreated = async ({ roomId, password, expiresAt, isMultiPeer, existingPeers }: any) => {
      const sess: RoomSession = { roomId, password, role: "host", expiresAt, isMultiPeer };
      setSession(sess); sessionRef.current = sess;
      saveActiveSession(sess);
      saveToHistory({ roomId, password, role: "host" });
      setRoomHistory(getRoomHistory());

      const hasPeers = existingPeers && existingPeers.length > 0;
      setConnectionState(hasPeers ? "connecting" : "waiting");

      if (existingPeers && existingPeers.length > 0) {
        setConnectedPeers(existingPeers.filter((p: any) => p.socketId !== socket.id).map((p: any) => ({
          socketId: p.socketId,
          displayName: p.displayName ?? "Guest",
          avatarColor: p.avatarColor ?? "#6366F1",
          userId: p.userId,
        })));

        for (const peer of existingPeers) {
          if (peer.socketId !== socket.id) {
            setupPeer(roomId, "host", peer.socketId);
          }
        }
      }

      socket.on("peer-connected", async ({ peer }: { peer: { socketId: string; displayName?: string; avatarColor?: string; userId?: string } }) => {
        // Filter out by exact socket ID, OR if they're a guest with the exact same userId (stale browser session)
        setConnectedPeers(prev => {
          const filtered = prev.filter(p => p.socketId !== peer.socketId && (!p.userId || p.userId !== peer.userId));
          return [...filtered, {
            socketId: peer.socketId,
            displayName: peer.displayName ?? "Guest",
            avatarColor: peer.avatarColor ?? "#6366F1",
            userId: peer.userId,
          }];
        });

        if (peer.socketId !== socket.id) {
          setConnectionState("connecting");
          onNotify?.({ type: "peer-joined", title: "Peer joined", message: `${peer.displayName ?? "Guest"} connected` });
          setupPeer(roomId, "host", peer.socketId);
        }
      });

      socket.on("peer-disconnected", ({ socketId }: { socketId: string }) => {
        setConnectedPeers(prev => prev.filter(p => p.socketId !== socketId));
        peersRef.current.get(socketId)?.destroy();
        peersRef.current.delete(socketId);
        onNotify?.({ type: "peer-left", title: "Peer disconnected", message: "A peer left the room" });
      });
    };

    socket.off("room-created");
    socket.off("peer-connected");
    socket.off("peer-disconnected");
    socket.off("room:deleted");
    socket.off("room-error");

    socket.on("room-created", onCreated);

    socket.on("room:deleted", () => {
      onNotify?.({ type: "error", title: "Room deleted", message: "The host has closed this room" });
      disconnect();
    });

    socket.on("room-error", ({ message }: any) => handleError(message));

    if (options?.reclaim) {
      const saved = localStorage.getItem("portaldrop_active_room");
      if (saved && token) {
        const { roomId, password } = JSON.parse(saved);
        socket.emit("reclaim-room", { roomId, password, token, peerSessionId: getPeerSessionId() });
        return;
      }
    }

    socket.emit("create-room", { isMultiPeer: options?.isMultiPeer, maxPeers: options?.maxPeers, token, peerSessionId: getPeerSessionId() });
  }, [setupPeer, handleError, onNotify, disconnect]);

  const joinRoom = useCallback((roomId: string, password: string) => {
    setConnectionState("joining"); setError(null);
    const socket = connectSocket();
    const stored = typeof window !== "undefined" ? localStorage.getItem("portaldrop_session") : null;
    const token = stored ? JSON.parse(stored).token : undefined;

    socket.off("room-joined");
    socket.off("peer-connected");
    socket.off("peer-disconnected");
    socket.off("room:deleted");
    socket.off("room-error");

    socket.on("room-joined", ({ roomId: id, existingPeers }: any) => {
      const sess: RoomSession = { roomId: id, password, role: "guest" };
      setSession(sess); sessionRef.current = sess;
      setConnectionState("connecting");
      saveActiveSession(sess);
      saveToHistory({ roomId: id, password, role: "guest" });
      setRoomHistory(getRoomHistory());

      if (existingPeers && existingPeers.length > 0) {
        setConnectedPeers(existingPeers.filter((p: any) => p.socketId !== socket.id).map((p: any) => ({
          socketId: p.socketId,
          displayName: p.displayName ?? "Host/Guest",
          avatarColor: p.avatarColor ?? "#3B82F6",
          userId: p.userId,
        })));

        existingPeers
          .filter((p: any) => p.socketId !== socket.id)
          .forEach((p: any) => setupPeer(id, "guest", p.socketId));
      }
    });

    socket.on("peer-connected", ({ peer }: any) => {
      setConnectedPeers(prev => {
        const filtered = prev.filter(p => p.socketId !== peer.socketId && (!p.userId || p.userId !== peer.userId));
        return [...filtered, {
          socketId: peer.socketId, displayName: peer.displayName ?? "Unknown",
          avatarColor: peer.avatarColor ?? "#3B82F6", userId: peer.userId,
        }];
      });
      // If we don't have a peer connection for this ID, create one
      if (!peersRef.current.has(peer.socketId) && peer.socketId !== socket.id) {
        setConnectionState("connecting");
        setupPeer(sessionRef.current?.roomId ?? "", "guest", peer.socketId);
      }

      // If we are guest and a host re-connected, we might want to remind them to offer
      // Or just wait. For now, let's ensure we clean up any "stale" connections from the same user/role
      // (This is tricky without stable user IDs, so we'll rely on peer-disconnected)
    });

    socket.on("peer-disconnected", ({ socketId }: { socketId: string }) => {
      setConnectedPeers(prev => prev.filter(p => p.socketId !== socketId));
      peersRef.current.get(socketId)?.destroy();
      peersRef.current.delete(socketId);
      onNotify?.({ type: "peer-left", title: "Peer disconnected", message: "A peer left the room" });
      // Don't auto-disconnect if multi-peer
      if (!sessionRef.current?.isMultiPeer) {
        setConnectionState("disconnected");
      }
    });

    socket.on("room:deleted", () => {
      onNotify?.({ type: "error", title: "Room deleted", message: "The host has closed this room" });
      disconnect();
    });

    socket.on("room-error", ({ message }: any) => handleError(message));
    socket.emit("join-room", {
      roomId: roomId.trim().toUpperCase(), password: password.trim().toUpperCase(),
      token, displayName: user?.displayName, avatarColor: user?.avatarColor,
      peerSessionId: getPeerSessionId(),
    });
  }, [setupPeer, handleError, user, onNotify]);


  const sendFile = useCallback(async (file: File) => {
    const peers = Array.from(peersRef.current.values()).filter(p => p.isDataChannelOpen());
    if (peers.length === 0) { setError("Not connected"); return; }
    for (const p of peers) await p.sendFile(file);
  }, []);

  const sendFolder = useCallback(async (files: File[], folderName: string) => {
    const peers = Array.from(peersRef.current.values()).filter(p => p.isDataChannelOpen());
    if (peers.length === 0) { setError("Not connected"); return; }
    for (const p of peers) await p.sendFolder(files, folderName);
  }, []);

  const sendText = useCallback((content: string) => {
    peersRef.current.forEach(p => { if (p.isDataChannelOpen()) p.sendText(content); });
  }, []);

  const fetchUserRooms = useCallback(() => {
    setIsRoomsLoading(true);
    const socket = connectSocket();
    const stored = typeof window !== "undefined" ? localStorage.getItem("portaldrop_session") : null;
    const token = stored ? JSON.parse(stored).token : undefined;

    if (!token) { setIsRoomsLoading(false); return; }

    socket.on("rooms:data", ({ rooms }: any) => {
      setUserRooms(rooms);
      setIsRoomsLoading(false);
      socket.off("rooms:data");
    });
    socket.on("rooms:error", () => setIsRoomsLoading(false));
    socket.emit("rooms:fetch", { token });
  }, []);

  const deleteUserRoom = useCallback((roomId: string) => {
    const socket = connectSocket();
    const stored = typeof window !== "undefined" ? localStorage.getItem("portaldrop_session") : null;
    const token = stored ? JSON.parse(stored).token : undefined;

    socket.on("rooms:deleted", ({ roomId: deletedId }: any) => {
      setUserRooms(prev => prev.filter(r => r.id !== deletedId));
      socket.off("rooms:deleted");
    });
    socket.emit("rooms:delete", { token, roomId });
  }, []);

  const fetchHistory = useCallback(() => {
    setRoomHistory(getRoomHistory());
  }, []);

  const clearHistory = useCallback(() => {
    clearRoomHistory();
    setRoomHistory([]);
  }, []);

  const pauseTransfer = useCallback((id: string) => {
    peersRef.current.forEach(p => p.pauseTransfer(id));
  }, []);

  const resumeTransfer = useCallback(async (id: string) => {
    const t = outgoingTransfers.find(x => x.id === id);
    if (!t || !t.file || t.status !== "paused") return;

    const peers = Array.from(peersRef.current.values()).filter(p => p.isDataChannelOpen());
    if (peers.length === 0) { setError("Not connected"); return; }

    for (const p of peers) {
      await p.sendFile(t.file, {
        folderTransferId: t.folderTransferId,
        relativePath: t.relativePath,
        resumeFromChunk: t.lastChunkSent
      });
    }
  }, [outgoingTransfers]);

  // Auto-reconnect effect
  useEffect(() => {
    if (hasAutoJoined) return;
    const saved = localStorage.getItem("portaldrop_active_room");
    if (saved) {
      const { roomId, password, role } = JSON.parse(saved);
      if (role === "host") {
        createRoom({ reclaim: true });
      } else {
        joinRoom(roomId, password);
      }
    }
    setHasAutoJoined(true);
    setRoomHistory(getRoomHistory());
  }, [createRoom, joinRoom, hasAutoJoined]);

  useEffect(() => () => { peersRef.current.forEach(p => p.destroy()); disconnectSocket(); }, []);

  return {
    connectionState, session, error, outgoingTransfers, incomingTransfers,
    folderTransfers, receivedTexts, connectedPeers, isEncrypted,
    createRoom, joinRoom, disconnect, sendFile, sendFolder, sendText, pauseTransfer, resumeTransfer,
    userRooms, isRoomsLoading, fetchUserRooms, deleteUserRoom,
    roomHistory, fetchHistory, clearHistory,
  };
}
