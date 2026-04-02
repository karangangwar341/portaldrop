"use client";
import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { LogIn, AlertCircle } from "lucide-react";

interface Props {
  isJoining: boolean;
  error: string | null;
  onJoin: (roomId: string, password: string) => void;
}

export function JoinConnectionForm({ isJoining, error, onJoin }: Props) {
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (roomId.trim() && password.trim()) {
      onJoin(roomId.trim(), password.trim());
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
          <LogIn className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-medium text-white">Join Connection</h2>
          <p className="text-xs text-zinc-400">Enter the credentials from the other device</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="roomId" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Pairing ID
          </label>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="e.g. X7KQP2"
            maxLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-lg tracking-widest text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Password
          </label>
          <input
            id="password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value.toUpperCase())}
            placeholder="e.g. N3KA"
            maxLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-lg tracking-widest text-white placeholder-zinc-600 outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={!roomId.trim() || !password.trim() || isJoining}
          className="mt-2 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isJoining ? "Connecting…" : "Connect"}
        </button>
      </form>
    </motion.div>
  );
}
