/**
 * Client-side session helpers.
 *
 * Sessions are stored in localStorage for instant re-authentication on page load.
 * Transfer history is fetched from the server (Prisma DB) when logged in,
 * and falls back to localStorage for anonymous users.
 */
import type { UserSession, TransferRecord } from "../../types";
import { connectSocket } from "../socket/client";

const SESSION_KEY  = "portaldrop_session";
const HISTORY_KEY  = "portaldrop_history_anon"; // only used when not logged in

// ── Session ───────────────────────────────────────────────────────────────────

export function saveSession(session: UserSession): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ── History: server-backed (logged-in) ───────────────────────────────────────

/**
 * Save a transfer record to the server DB (when logged in)
 * AND to localStorage as a fast local cache.
 */
export function saveTransferRecord(record: TransferRecord): void {
  // Always cache locally
  saveLocalHistory(record);

  // Persist to server if we have a session
  const session = loadSession();
  if (!session) return;

  const socket = connectSocket();
  socket.emit("history:save", {
    token:      session.token,
    direction:  record.direction,
    fileName:   record.fileName,
    fileSize:   record.fileSize,
    fileType:   record.fileType,
    peerName:   record.peerName,
    roomId:     record.roomId,
    status:     record.status,
    durationMs: record.durationMs,
  });
}

/**
 * Fetch history from the server. Returns a promise that resolves with records.
 * Falls back to local cache on error.
 */
export function fetchServerHistory(
  token: string,
  options?: { limit?: number; offset?: number }
): Promise<TransferRecord[]> {
  return new Promise(resolve => {
    const socket = connectSocket();
    const timeout = setTimeout(() => resolve(loadLocalHistory()), 5000);

    socket.once("history:data", ({ records }: { records: TransferRecord[] }) => {
      clearTimeout(timeout);
      resolve(records);
    });

    socket.once("history:error", () => {
      clearTimeout(timeout);
      resolve(loadLocalHistory());
    });

    socket.emit("history:fetch", {
      token,
      limit:  options?.limit  ?? 100,
      offset: options?.offset ?? 0,
    });
  });
}

export function clearServerHistory(token: string): void {
  const socket = connectSocket();
  socket.emit("history:clear", { token });
  clearLocalHistory();
}

// ── History: localStorage fallback (anonymous) ────────────────────────────────

function saveLocalHistory(record: TransferRecord): void {
  try {
    const existing = loadLocalHistory();
    const updated = [record, ...existing].slice(0, 200);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function loadLocalHistory(): TransferRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TransferRecord[]) : [];
  } catch { return []; }
}

export function clearLocalHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}
