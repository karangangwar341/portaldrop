"use client";
import { motion } from "framer-motion";
import { ShieldCheck, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { ConnectionState } from "../../types";

interface Props {
  state: ConnectionState;
  roomId?: string;
  onDisconnect?: () => void;
}

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; color: string; icon: React.ReactNode; pulse?: boolean }
> = {
  idle: {
    label: "Not connected",
    color: "text-zinc-400 border-zinc-700 bg-zinc-800/50",
    icon: <WifiOff className="h-3.5 w-3.5" />,
  },
  creating: {
    label: "Creating session…",
    color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  waiting: {
    label: "Waiting for peer…",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    pulse: true,
  },
  joining: {
    label: "Joining session…",
    color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  connecting: {
    label: "Establishing P2P…",
    color: "text-violet-400 border-violet-500/20 bg-violet-500/10",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  connected: {
    label: "Secure connection",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    pulse: true,
  },
  disconnected: {
    label: "Disconnected",
    color: "text-zinc-400 border-zinc-700 bg-zinc-800/50",
    icon: <WifiOff className="h-3.5 w-3.5" />,
  },
  error: {
    label: "Connection error",
    color: "text-red-400 border-red-500/20 bg-red-500/10",
    icon: <WifiOff className="h-3.5 w-3.5" />,
  },
};

export function ConnectionStatusBadge({ state, roomId, onDisconnect }: Props) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-center gap-3">
      <motion.div
        layout
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${config.color}`}
      >
        {config.pulse && state === "connected" ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        ) : (
          config.icon
        )}
        <span>{config.label}</span>
        {roomId && state === "connected" && (
          <span className="ml-1 font-mono text-xs opacity-60">{roomId}</span>
        )}
      </motion.div>

      {state === "connected" && onDisconnect && (
        <button
          onClick={onDisconnect}
          className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
