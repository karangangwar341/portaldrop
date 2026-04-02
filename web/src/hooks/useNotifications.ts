"use client";
import { useState, useCallback, useRef } from "react";
import type { AppNotification } from "../types";

export interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export function useNotifications(): NotificationsState {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const idxRef = useRef(0);

  const push = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const notif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${idxRef.current++}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50));

    // Browser notification if permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(n.title, { body: n.message, icon: "/favicon.ico" });
      } catch {}
    }
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, push, markRead, markAllRead, dismiss, clear };
}

export async function requestNotificationPermission(): Promise<void> {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
}
