"use client";
import { motion } from "framer-motion";
import { Shield, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { RoomSession } from "../../types";

interface Props {
  session: RoomSession | null;
  isCreating: boolean;
  isWaiting: boolean;
  onCreateRoom: () => void;
}

export function CreateConnectionCard({ session, isCreating, isWaiting, onCreateRoom }: Props) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);



  async function copyToClipboard(text: string, which: "id" | "pw") {
    await navigator.clipboard.writeText(text);
    if (which === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    }
  }

  if (!session) {
    return (
      <motion.button
        onClick={onCreateRoom}
        disabled={isCreating}
        className="w-full group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm transition-all hover:border-blue-400/40 hover:bg-white/8 disabled:opacity-60"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">
              {isCreating ? "Creating session…" : "Create Connection"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Generate a pairing ID and password to share
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-medium text-white">Share these credentials</h2>
          <p className="text-xs text-zinc-400">Enter on the other device to connect</p>
        </div>
      </div>

      <div className="space-y-3">
        <CredentialRow
          label="Pairing ID"
          value={session.roomId || ""}
          copied={copiedId}
          onCopy={() => copyToClipboard(session.roomId, "id")}
        />
        <CredentialRow
          label="Password"
          value={session.password || ""}
          copied={copiedPw}
          onCopy={() => copyToClipboard(session.password, "pw")}
        />
      </div>

      <div className="mt-6 flex items-center gap-2">
        {isWaiting ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-sm text-zinc-400">Waiting for another device…</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-sm text-zinc-400">Device connected — establishing link…</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-widest text-white break-all">
          {value || "—"}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="ml-3 flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-300 transition-all hover:bg-white/15 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
