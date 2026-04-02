"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare } from "lucide-react";
import type { ReceivedText } from "../../types";

interface Props {
  onSendText: (content: string) => void;
  receivedTexts: ReceivedText[];
  disabled?: boolean;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TextSharePanel({ onSendText, receivedTexts, disabled }: Props) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendText(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Text / Clipboard</span>
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type or paste text to send…"
          rows={3}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex h-auto w-11 items-start justify-center pt-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label="Send text"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {receivedTexts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/8 bg-white/4 p-3"
          >
            <p className="whitespace-pre-wrap text-sm text-zinc-200 break-words">{t.content}</p>
            <p className="mt-1.5 text-xs text-zinc-600">{formatTime(t.timestamp)}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
