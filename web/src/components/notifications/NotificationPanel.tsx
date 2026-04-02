"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCircle2, AlertCircle, Users, Upload, Info } from "lucide-react";
import type { AppNotification } from "../../types";

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

const icons: Record<string, React.ReactNode> = {
  "transfer-complete": <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  "peer-joined": <Users className="h-4 w-4 text-blue-400" />,
  "peer-left": <Users className="h-4 w-4 text-zinc-400" />,
  "transfer-request": <Upload className="h-4 w-4 text-violet-400" />,
  "info": <Info className="h-4 w-4 text-blue-400" />,
  "error": <AlertCircle className="h-4 w-4 text-red-400" />,
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function NotificationPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, onDismiss, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-zinc-500 hover:text-zinc-300 transition">Mark all read</button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:text-white transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
            <Bell className="h-6 w-6 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => onMarkRead(n.id)}
                className={`group flex items-start gap-3 border-b border-white/5 px-4 py-3 cursor-pointer transition hover:bg-white/5 ${!n.read ? "bg-white/3" : ""}`}
              >
                <div className="mt-0.5 shrink-0">{icons[n.type] ?? icons.info}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${!n.read ? "text-white" : "text-zinc-300"}`}>{n.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{n.message}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{timeAgo(n.timestamp)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                  className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition hover:text-zinc-300 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

export function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
