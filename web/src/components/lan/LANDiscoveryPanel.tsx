"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Zap, Radio } from "lucide-react";
import type { LANPeer } from "../../types";

interface Props {
  peers: LANPeer[];
  isAnnounced: boolean;
  onAnnounce: () => void;
  onStop: () => void;
  onConnect: (peer: LANPeer) => void;
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

export function LANDiscoveryPanel({ peers, isAnnounced, onAnnounce, onStop, onConnect }: Props) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">LAN Discovery</span>
          {isAnnounced && <PulsingDot />}
        </div>
        <button
          onClick={isAnnounced ? onStop : onAnnounce}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
            isAnnounced
              ? "border border-zinc-600 text-zinc-400 hover:border-red-500/40 hover:text-red-400"
              : "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
          }`}
        >
          {isAnnounced ? "Stop" : "Announce"}
        </button>
      </div>

      {!isAnnounced ? (
        <p className="text-xs text-zinc-600">Click Announce to appear to nearby devices on the same network.</p>
      ) : peers.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-zinc-600">
          <Wifi className="h-5 w-5 mb-1.5 animate-pulse" />
          <p className="text-xs">Scanning for nearby devices…</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {peers.map(peer => (
              <motion.div
                key={peer.socketId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2"
              >
                <Avatar name={peer.displayName} color={peer.avatarColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{peer.displayName}</p>
                  <p className="text-xs text-zinc-500">On this network</p>
                </div>
                <button
                  onClick={() => onConnect(peer)}
                  className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
                >
                  <Zap className="h-3 w-3" />
                  Connect
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
