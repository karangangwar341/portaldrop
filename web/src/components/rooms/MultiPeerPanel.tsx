"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, WifiOff } from "lucide-react";
import type { ConnectedPeer } from "../../types";

interface Props {
  peers: ConnectedPeer[];
  isEncrypted: boolean;
}

function PeerAvatar({ peer }: { peer: ConnectedPeer }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: peer.avatarColor }}>
        {peer.displayName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-white">{peer.displayName}</p>
        <p className="text-[10px] text-zinc-600 font-mono">{peer.socketId.slice(0, 8)}…</p>
      </div>
      <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </motion.div>
  );
}

export function MultiPeerPanel({ peers, isEncrypted }: Props) {
  if (peers.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">Connected Peers</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs text-zinc-300">{peers.length}</span>
        </div>
        {isEncrypted && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
            <Shield className="h-3 w-3" />
            E2E Encrypted
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <AnimatePresence>
          {peers.map(peer => <PeerAvatar key={peer.socketId} peer={peer} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
