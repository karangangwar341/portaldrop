// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  createdAt: number;
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface RegisterPayload {
  username: string;
  displayName: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  session?: UserSession;
  error?: string;
}

// ─── Transfer History ─────────────────────────────────────────────────────────

export interface TransferRecord {
  id: string;
  userId: string;
  direction: "sent" | "received";
  fileName: string;
  fileSize: number;
  fileType: string;
  peerName: string;
  roomId: string;
  timestamp: number;
  status: "complete" | "error" | "interrupted";
  durationMs?: number;
}

// ─── Room / Session ───────────────────────────────────────────────────────────

export interface Room {
  id: string;
  password: string;
  hostSocketId: string;
  hostUserId?: string;
  peers: string[];
  guestSocketId: string | null;
  createdAt: number;
  expiresAt: number;
  isMultiPeer: boolean;
  maxPeers: number;
}

export type ConnectionState =
  | "idle"
  | "creating"
  | "waiting"
  | "joining"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// ─── LAN Discovery ────────────────────────────────────────────────────────────

export interface LANPeer {
  socketId: string;
  userId?: string;
  displayName: string;
  avatarColor: string;
  roomId?: string;
  timestamp: number;
}

export interface LANAnnouncePayload {
  displayName: string;
  avatarColor: string;
  userId?: string;
}

export interface LANPeersPayload {
  peers: LANPeer[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "transfer-complete"
  | "peer-joined"
  | "peer-left"
  | "transfer-request"
  | "info"
  | "error";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, unknown>;
}

// ─── Signaling Events ─────────────────────────────────────────────────────────

export interface CreateRoomPayload {
  roomId: string;
  password: string;
  isMultiPeer?: boolean;
  maxPeers?: number;
}

export interface JoinRoomPayload {
  roomId: string;
  password: string;
}

export interface RoomCreatedPayload {
  roomId: string;
  password: string;
  expiresAt: number;
  isMultiPeer: boolean;
}

export interface RoomJoinedPayload {
  roomId: string;
  peerId: string;
  peerCount: number;
}

export interface RoomErrorPayload {
  code: "NOT_FOUND" | "WRONG_PASSWORD" | "FULL" | "EXPIRED" | "UNKNOWN";
  message: string;
}

export interface PeerInfo {
  socketId: string;
  userId?: string;
  displayName?: string;
  avatarColor?: string;
}

export interface PeerConnectedPayload {
  peer: PeerInfo;
  peerCount: number;
}

export interface PeerDisconnectedPayload {
  socketId: string;
  peerCount: number;
}

// ─── Transfer Types ───────────────────────────────────────────────────────────

export type TransferStatus =
  | "pending"
  | "transferring"
  | "paused"
  | "resuming"
  | "complete"
  | "error"
  | "rejected";

export interface OutgoingTransfer {
  id: string;
  file: File;
  status: TransferStatus;
  progress: number;
  bytesSent: number;
  startTime?: number;
  endTime?: number;
  error?: string;
  encrypted?: boolean;
  folderTransferId?: string;
  relativePath?: string;
  lastChunkSent?: number;
}

export interface IncomingTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: TransferStatus;
  progress: number;
  bytesReceived: number;
  blob?: Blob;
  downloadUrl?: string;
  startTime?: number;
  endTime?: number;
  error?: string;
  encrypted?: boolean;
  folderTransferId?: string;
  relativePath?: string;
  resumeFromChunk?: number;
}

export interface FolderTransfer {
  id: string;
  folderName: string;
  totalFiles: number;
  totalSize: number;
  completedFiles: number;
  direction: "outgoing" | "incoming";
  fileIds: string[];
}

export interface ReceivedText {
  id: string;
  content: string;
  timestamp: number;
}

export interface TransferRecord {
  id: string;
  userId: string;
  direction: "sent" | "received";
  fileName: string;
  fileSize: number;
  fileType: string;
  peerName: string;
  roomId: string;
  timestamp: number;
  status: "complete" | "error" | "interrupted";
  durationMs?: number;
}

export interface LANPeer {
  socketId: string;
  userId?: string;
  displayName: string;
  avatarColor: string;
  timestamp: number;
}

export interface AppNotification {
  id: string;
  type: "transfer-complete" | "peer-joined" | "peer-left" | "transfer-request" | "info" | "error";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, unknown>;
}
