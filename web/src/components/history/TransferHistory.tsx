"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, Upload, Download, CheckCircle2, AlertCircle, Trash2, Loader2, RefreshCw } from "lucide-react";
import { loadSession } from "../../lib/auth/userSession";
import { fetchServerHistory, clearServerHistory, loadLocalHistory, clearLocalHistory } from "../../lib/auth/userSession";
import type { TransferRecord } from "../../types";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}
function formatDate(ts: number | string | Date) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatDuration(ms?: number | null) {
  if (!ms) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TransferHistory({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const session = loadSession();

  const load = async () => {
    setLoading(true);
    if (session) {
      const data = await fetchServerHistory(session.token, { limit: 100 });
      setRecords(data);
    } else {
      setRecords(loadLocalHistory());
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleClear = () => {
    if (session) clearServerHistory(session.token);
    else clearLocalHistory();
    setRecords([]);
  };

  const filtered = filter === "all" ? records : records.filter(r => r.direction === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-semibold text-white">Transfer History</span>
          {!loading && (
            <span className="text-xs text-zinc-600">{records.length} record{records.length !== 1 ? "s" : ""}</span>
          )}
          {session && (
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
              Cloud synced
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 transition">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {records.length > 0 && (
            <button onClick={handleClear} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-red-400 transition">
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 transition">Close</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white/5 px-5 py-2">
        {(["all", "sent", "received"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
              filter === f ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
            <History className="h-6 w-6 mb-2" />
            <p className="text-sm">No transfer history</p>
            {!session && <p className="text-xs text-zinc-700 mt-1">Sign in to sync history across devices</p>}
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="flex items-start gap-3 border-b border-white/5 px-5 py-3 hover:bg-white/3 transition">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                r.direction === "sent" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {r.direction === "sent" ? <Upload className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{r.fileName}</p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(r.fileSize)} · {r.peerName} · {formatDate(r.timestamp)}
                </p>
                {r.durationMs && <p className="text-xs text-zinc-600">{formatDuration(r.durationMs)}</p>}
              </div>
              <div className="shrink-0 mt-0.5">
                {r.status === "complete"
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
