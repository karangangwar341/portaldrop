export interface RoomHistoryItem {
  roomId: string;
  password: string;
  role: "host" | "guest";
  timestamp: number;
}

const STORAGE_KEY = "portaldrop_room_history";
const MAX_HISTORY = 10;

export function getRoomHistory(): RoomHistoryItem[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveToHistory(item: Omit<RoomHistoryItem, "timestamp">): void {
  if (typeof window === "undefined") return;
  const history = getRoomHistory();
  
  // Remove existing entry for same roomId
  const filtered = history.filter(h => h.roomId !== item.roomId);
  
  // Add to front
  const newItem: RoomHistoryItem = {
    ...item,
    timestamp: Date.now(),
  };
  
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearRoomHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
