export type ConnectionState =
  | "idle" | "creating" | "waiting" | "joining"
  | "connecting" | "connected" | "disconnected" | "error";

export type TransferStatus =
  | "pending" | "transferring" | "paused" | "resuming"
  | "complete" | "error" | "rejected";

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
}

export interface RoomSession {
  roomId: string;
  password: string;
  role: "host" | "guest";
  expiresAt?: number;
  isMultiPeer?: boolean;
}

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

export interface ConnectedPeer {
  socketId: string;
  displayName: string;
  avatarColor: string;
  userId?: string;
}
