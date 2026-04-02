"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { connectSocket } from "../lib/socket/client";
import type { LANPeer, User } from "../types";

export interface LANDiscoveryState {
  peers: LANPeer[];
  isAnnounced: boolean;
  announce: (user?: User | null) => void;
  stopAnnouncing: () => void;
  pingPeer: (socketId: string) => void;
}

export function useLANDiscovery(): LANDiscoveryState {
  const [peers, setPeers] = useState<LANPeer[]>([]);
  const [isAnnounced, setIsAnnounced] = useState(false);
  const announcedRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    socket.on("lan:peers", ({ peers: p }: { peers: LANPeer[] }) => setPeers(p));

    socket.on("lan:peer-appeared", ({ peer }: { peer: LANPeer }) => {
      setPeers(prev => {
        const exists = prev.find(p => p.socketId === peer.socketId);
        return exists ? prev : [...prev, peer];
      });
    });

    socket.on("lan:peer-gone", ({ socketId }: { socketId: string }) => {
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
    });

    return () => {
      socket.off("lan:peers");
      socket.off("lan:peer-appeared");
      socket.off("lan:peer-gone");
    };
  }, []);

  const announce = useCallback((user?: User | null) => {
    const socket = connectSocket();
    const displayName = user?.displayName ?? `Guest-${Math.floor(Math.random() * 9999)}`;
    const avatarColor = user?.avatarColor ?? "#6366F1";
    socket.emit("lan:announce", { displayName, avatarColor, userId: user?.id });
    setIsAnnounced(true);
    announcedRef.current = true;
  }, []);

  const stopAnnouncing = useCallback(() => {
    const socket = connectSocket();
    socket.emit("lan:leave");
    setIsAnnounced(false);
    announcedRef.current = false;
    setPeers([]);
  }, []);

  const pingPeer = useCallback((socketId: string) => {
    const socket = connectSocket();
    socket.emit("lan:ping-peer", { targetSocketId: socketId });
  }, []);

  return { peers, isAnnounced, announce, stopAnnouncing, pingPeer };
}
