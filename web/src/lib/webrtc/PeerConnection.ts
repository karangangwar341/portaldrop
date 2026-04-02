import { Socket } from "socket.io-client";
import { ICE_CONFIG, DATA_CHANNEL_OPTIONS, CHUNK_SIZE, BUFFER_HIGH_WATERMARK, BUFFER_LOW_WATERMARK } from "./config";
import type { OutgoingTransfer, IncomingTransfer, ReceivedText, FolderTransfer } from "../../types";
import {
  generateKeyPair, exportPublicKey, importPublicKey,
  deriveSharedKey, encryptChunk, decryptChunk,
  packEncrypted, unpackEncrypted, type KeyPair
} from "../encryption/e2e";

export type PeerEventMap = {
  connectionStateChange: (state: RTCPeerConnectionState) => void;
  dataChannelOpen: () => void;
  dataChannelClose: () => void;
  outgoingTransferUpdate: (transfer: OutgoingTransfer) => void;
  incomingTransferUpdate: (transfer: IncomingTransfer) => void;
  folderTransferUpdate: (folder: FolderTransfer) => void;
  textReceived: (text: ReceivedText) => void;
  encryptionReady: () => void;
  error: (err: Error) => void;
};

type EventListener<K extends keyof PeerEventMap> = PeerEventMap[K];

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket;
  private roomId: string;
  private role: "host" | "guest";
  private fromSocketId?: string;
  private polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;

  // Encryption
  private keyPair: KeyPair | null = null;
  private sharedKey: CryptoKey | null = null;
  private encryptionEnabled = false;
  private encryptionReady = false;

  // Outgoing
  private isPaused = false;
  private chunkResolve: (() => void) | null = null;
  private abortControllers = new Map<string, AbortController>();

  // Incoming
  private incomingBuffers = new Map<string, { chunks: ArrayBuffer[]; meta: any; bytesReceived: number }>();
  private currentIncomingId: string | null = null;

  // Folder transfers
  private folderTransfers = new Map<string, FolderTransfer>();

  // Resume state
  private resumeCallbacks = new Map<string, (fromChunk: number) => void>();

  // Event listeners
  private listeners: Partial<{ [K in keyof PeerEventMap]: EventListener<K>[] }> = {};

   constructor(socket: Socket, roomId: string, role: "host" | "guest", fromSocketId?: string) {
     this.socket = socket;
     this.roomId = roomId;
     this.role = role;
     this.fromSocketId = fromSocketId;
     this.polite = role === "guest";
     this.pc = new RTCPeerConnection(ICE_CONFIG);
     this.setupPeerConnection();
     this.setupSignalingListeners();
   }

  on<K extends keyof PeerEventMap>(event: K, listener: EventListener<K>): void {
    if (!this.listeners[event]) (this.listeners as any)[event] = [];
    (this.listeners[event] as any[]).push(listener);
  }

  private emit<K extends keyof PeerEventMap>(event: K, ...args: Parameters<PeerEventMap[K]>): void {
    const list = this.listeners[event] as any[];
    if (list) list.forEach(fn => fn(...args));
  }

  private setupPeerConnection(): void {
    this.pc.onconnectionstatechange = () => this.emit("connectionStateChange", this.pc.connectionState);
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit("ice-candidate", { roomId: this.roomId, candidate: candidate.toJSON(), targetSocketId: this.fromSocketId });
      }
    };
     this.pc.ondatachannel = event => this.attachDataChannel(event.channel);
     this.pc.onnegotiationneeded = async () => {
       try {
         this.makingOffer = true;
         await this.pc.setLocalDescription();
         this.socket.emit("offer", { 
           roomId: this.roomId, 
           offer: this.pc.localDescription, 
           targetSocketId: this.fromSocketId 
         });
       } catch (err) {
         console.error("[WebRTC] Negotiation failed:", err);
       } finally {
         this.makingOffer = false;
       }
     };
 
     if (this.role === "host") {
      const channel = this.pc.createDataChannel("transfer", DATA_CHANNEL_OPTIONS);
      this.attachDataChannel(channel);
    }
  }

  private attachDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;
    channel.onopen = async () => {
      console.log("[WebRTC] DataChannel open");
      this.emit("dataChannelOpen");
      await this.initiateEncryptionHandshake();
    };
    channel.onclose = () => { console.log("[WebRTC] DataChannel closed"); this.emit("dataChannelClose"); };
    channel.onbufferedamountlow = () => {
      if (this.isPaused && this.chunkResolve) {
        this.isPaused = false;
        const r = this.chunkResolve; this.chunkResolve = null; r();
      }
    };
    channel.onmessage = event => this.handleMessage(event.data);
  }

  private handleOffer = async ({ offer, fromSocketId }: { offer: RTCSessionDescriptionInit; fromSocketId?: string }) => {
    // Drop offers from other peers if we are already bound to a specific socket
    if (this.fromSocketId && fromSocketId && this.fromSocketId !== fromSocketId) return;

    try {
      const offerCollision = this.makingOffer || this.pc.signalingState !== "stable";
      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) return;

      if (fromSocketId) this.fromSocketId = fromSocketId;
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      await this.pc.setLocalDescription();
      this.socket.emit("answer", { 
        roomId: this.roomId, 
        answer: this.pc.localDescription, 
        targetSocketId: fromSocketId 
      });
    } catch (err) {
      console.error("[WebRTC] Offer error:", err);
    }
  };

  private handleAnswer = async ({ answer, fromSocketId }: { answer: RTCSessionDescriptionInit; fromSocketId?: string }) => {
    if (this.fromSocketId && fromSocketId && this.fromSocketId !== fromSocketId) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("[WebRTC] Answer error:", err);
    }
  };

  private handleIceCandidate = async ({ candidate, fromSocketId }: { candidate: RTCIceCandidateInit; fromSocketId?: string }) => {
    if (this.fromSocketId && fromSocketId && this.fromSocketId !== fromSocketId) return;
    try { await this.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  };

  private setupSignalingListeners(): void {
     this.socket.on("offer", this.handleOffer);
     this.socket.on("answer", this.handleAnswer);
     this.socket.on("ice-candidate", this.handleIceCandidate);
  }

  async initiateOffer(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.socket.emit("offer", { roomId: this.roomId, offer, targetSocketId: this.fromSocketId });
  }

  // ── Encryption Handshake ──────────────────────────────────────────────────

  private async initiateEncryptionHandshake(): Promise<void> {
    try {
      this.keyPair = await generateKeyPair();
      const publicKeyB64 = await exportPublicKey(this.keyPair.publicKey);
      this.send(JSON.stringify({ type: "encrypt-handshake", publicKey: publicKeyB64 }));
    } catch (e) {
      console.warn("[Encryption] Handshake init failed:", e);
    }
  }

  private async handleEncryptHandshake(peerPublicKeyB64: string): Promise<void> {
    if (!this.keyPair) {
      this.keyPair = await generateKeyPair();
      const myKey = await exportPublicKey(this.keyPair.publicKey);
      this.send(JSON.stringify({ type: "encrypt-handshake", publicKey: myKey }));
    }
    const peerKey = await importPublicKey(peerPublicKeyB64);
    this.sharedKey = await deriveSharedKey(this.keyPair.privateKey, peerKey);
    this.encryptionEnabled = true;
    this.encryptionReady = true;
    this.emit("encryptionReady");
    console.log("[Encryption] E2E shared key derived ✓");
  }

  // ── Message Handling ──────────────────────────────────────────────────────

  private handleMessage(data: ArrayBuffer | string): void {
    if (data instanceof ArrayBuffer) { this.handleChunkData(data); return; }
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case "encrypt-handshake": this.handleEncryptHandshake(msg.publicKey); break;
      case "file-meta": this.handleFileMeta(msg); break;
      case "folder-meta": this.handleFolderMeta(msg); break;
      case "folder-complete": this.handleFolderComplete(msg.transferId); break;
      case "file-complete": this.handleFileComplete(msg.transferId); break;
      case "file-error": this.handleFileError(msg); break;
      case "file-resume-request": this.handleResumeRequest(msg); break;
      case "file-resume-ack": this.handleResumeAck(msg); break;
      case "file-resume": this.handleFileResume(msg); break;
      case "text-message": this.emit("textReceived", { id: msg.id, content: msg.content, timestamp: msg.timestamp }); break;
      case "ping": this.send(JSON.stringify({ type: "pong", timestamp: msg.timestamp })); break;
    }
  }

  private handleFileMeta(msg: any): void {
    this.currentIncomingId = msg.transferId;
    this.incomingBuffers.set(msg.transferId, { chunks: [], meta: msg, bytesReceived: 0 });
    this.emit("incomingTransferUpdate", {
      id: msg.transferId, fileName: msg.fileName, fileSize: msg.fileSize,
      fileType: msg.fileType, status: "transferring", progress: 0,
      bytesReceived: 0, startTime: Date.now(),
      encrypted: msg.encrypted ?? false,
      folderTransferId: msg.folderTransferId,
      relativePath: msg.relativePath,
    });
  }

  private handleFolderMeta(msg: any): void {
    const folder: FolderTransfer = {
      id: msg.transferId, folderName: msg.folderName,
      totalFiles: msg.totalFiles, totalSize: msg.totalSize,
      completedFiles: 0, direction: "incoming", fileIds: [],
    };
    this.folderTransfers.set(msg.transferId, folder);
    this.emit("folderTransferUpdate", { ...folder });
  }

  private handleFolderComplete(transferId: string): void {
    const folder = this.folderTransfers.get(transferId);
    if (folder) { this.emit("folderTransferUpdate", { ...folder, completedFiles: folder.totalFiles }); }
  }

  private handleChunkData(data: ArrayBuffer): void {
    if (!this.currentIncomingId) return;
    const buffer = this.incomingBuffers.get(this.currentIncomingId);
    if (!buffer) return;

    let chunkData = data;

    // Decrypt if encryption is active
    if (this.encryptionEnabled && this.sharedKey && buffer.meta.encrypted) {
      // Decryption happens async but we queue synchronously to preserve order
      this.decryptAndUpdate(this.currentIncomingId, data);
      return;
    }

    buffer.chunks.push(chunkData);
    buffer.bytesReceived += chunkData.byteLength;
    const progress = Math.min(100, Math.round((buffer.bytesReceived / buffer.meta.fileSize) * 100));
    this.emit("incomingTransferUpdate", {
      id: buffer.meta.transferId, fileName: buffer.meta.fileName,
      fileSize: buffer.meta.fileSize, fileType: buffer.meta.fileType,
      status: "transferring", progress, bytesReceived: buffer.bytesReceived,
    });
  }

  private async decryptAndUpdate(transferId: string, data: ArrayBuffer): Promise<void> {
    const buffer = this.incomingBuffers.get(transferId);
    if (!buffer || !this.sharedKey) return;
    try {
      const { iv, ciphertext } = unpackEncrypted(data);
      const plain = await decryptChunk(this.sharedKey, iv, ciphertext);
      buffer.chunks.push(plain);
      buffer.bytesReceived += plain.byteLength;
      const progress = Math.min(100, Math.round((buffer.bytesReceived / buffer.meta.fileSize) * 100));
      this.emit("incomingTransferUpdate", {
        id: buffer.meta.transferId, fileName: buffer.meta.fileName,
        fileSize: buffer.meta.fileSize, fileType: buffer.meta.fileType,
        status: "transferring", progress, bytesReceived: buffer.bytesReceived,
      });
    } catch (e) { console.error("[Decrypt] Failed:", e); }
  }

  private handleFileComplete(transferId: string): void {
    const buffer = this.incomingBuffers.get(transferId);
    if (!buffer) return;
    const blob = new Blob(buffer.chunks, { type: buffer.meta.fileType || "application/octet-stream" });
    const downloadUrl = URL.createObjectURL(blob);
    this.emit("incomingTransferUpdate", {
      id: transferId, fileName: buffer.meta.fileName, fileSize: buffer.meta.fileSize,
      fileType: buffer.meta.fileType, status: "complete", progress: 100,
      bytesReceived: blob.size, blob, downloadUrl, endTime: Date.now(),
    });
    // Update folder progress
    if (buffer.meta.folderTransferId) {
      const folder = this.folderTransfers.get(buffer.meta.folderTransferId);
      if (folder) { folder.completedFiles++; folder.fileIds.push(transferId); this.emit("folderTransferUpdate", { ...folder }); }
    }
    this.incomingBuffers.delete(transferId);
    this.currentIncomingId = null;
  }

  private handleFileError(msg: any): void {
    const buffer = this.incomingBuffers.get(msg.transferId);
    if (buffer) {
      this.emit("incomingTransferUpdate", {
        id: msg.transferId, fileName: buffer.meta.fileName, fileSize: buffer.meta.fileSize,
        fileType: buffer.meta.fileType, status: "error", progress: 0, bytesReceived: 0,
        error: msg.reason,
      });
      this.incomingBuffers.delete(msg.transferId);
    }
  }

  private handleResumeRequest(msg: any): void {
    const cb = this.resumeCallbacks.get(msg.transferId);
    if (cb) { cb(msg.resumeFromChunk); this.resumeCallbacks.delete(msg.transferId); }
  }

  private handleResumeAck(msg: any): void {
    console.log(`[Resume] ACK for ${msg.transferId} from chunk ${msg.fromChunk}`);
  }

  private handleFileResume(msg: any): void {
    const buffer = this.incomingBuffers.get(msg.transferId);
    if (buffer) {
       console.log(`[Resume] Peer resuming ${msg.transferId} from chunk ${msg.fromChunk}`);
       // Update metadata if needed
    }
  }

  // ── File Sending ──────────────────────────────────────────────────────────

  async sendFile(file: File, options?: { folderTransferId?: string; relativePath?: string; resumeFromChunk?: number }): Promise<void> {
    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const abort = new AbortController();
    this.abortControllers.set(transferId, abort);

    const startChunk = options?.resumeFromChunk ?? 0;
    const isResuming = startChunk > 0;

    const transfer: OutgoingTransfer = {
      id: transferId, file, status: isResuming ? "resuming" : "transferring", 
      progress: Math.round((startChunk / totalChunks) * 100), 
      bytesSent: startChunk * CHUNK_SIZE,
      startTime: Date.now(), encrypted: this.encryptionEnabled,
      folderTransferId: options?.folderTransferId, relativePath: options?.relativePath,
      lastChunkSent: startChunk,
    };
    this.emit("outgoingTransferUpdate", { ...transfer });

    if (isResuming) {
      this.send(JSON.stringify({ type: "file-resume", transferId, fromChunk: startChunk }));
    } else {
      this.send(JSON.stringify({
        type: "file-meta", transferId, fileName: file.name, fileSize: file.size,
        fileType: file.type, totalChunks, chunkSize: CHUNK_SIZE,
        folderTransferId: options?.folderTransferId, relativePath: options?.relativePath,
        encrypted: this.encryptionEnabled,
      }));
    }

    for (let i = startChunk; i < totalChunks; i++) {
      if (abort.signal.aborted) {
         transfer.status = "paused";
         this.emit("outgoingTransferUpdate", { ...transfer });
         break;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      let chunk = await file.slice(start, end).arrayBuffer();

      if (this.encryptionEnabled && this.sharedKey) {
        const { iv, ciphertext } = await encryptChunk(this.sharedKey, chunk);
        chunk = packEncrypted(iv, ciphertext);
      }

      if (this.dataChannel && this.dataChannel.bufferedAmount > BUFFER_HIGH_WATERMARK) {
        this.isPaused = true;
        await new Promise<void>(resolve => { this.chunkResolve = resolve; });
      }

      this.dataChannel?.send(chunk);

      const bytesSent = Math.min((i + 1) * CHUNK_SIZE, file.size);
      const progress = Math.round((bytesSent / file.size) * 100);
      transfer.lastChunkSent = i;
      transfer.status = "transferring";

      this.emit("outgoingTransferUpdate", { ...transfer, bytesSent, progress, lastChunkSent: i });
    }

    if (!abort.signal.aborted) {
      this.send(JSON.stringify({ type: "file-complete", transferId }));
      this.emit("outgoingTransferUpdate", { ...transfer, status: "complete", progress: 100, bytesSent: file.size, endTime: Date.now() });
    }

    this.abortControllers.delete(transferId);
  }

  async sendFolder(files: File[], folderName: string): Promise<void> {
    const folderTransferId = crypto.randomUUID();
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const folder: FolderTransfer = {
      id: folderTransferId, folderName, totalFiles: files.length,
      totalSize, completedFiles: 0, direction: "outgoing", fileIds: [],
    };
    this.folderTransfers.set(folderTransferId, folder);
    this.emit("folderTransferUpdate", { ...folder });

    this.send(JSON.stringify({ type: "folder-meta", transferId: folderTransferId, folderName, totalFiles: files.length, totalSize }));

    for (const file of files) {
      const relativePath = (file as any).webkitRelativePath || file.name;
      await this.sendFile(file, { folderTransferId, relativePath });
      folder.completedFiles++;
      folder.fileIds.push(file.name);
      this.emit("folderTransferUpdate", { ...folder });
    }

    this.send(JSON.stringify({ type: "folder-complete", transferId: folderTransferId }));
  }

  pauseTransfer(transferId: string): void {
    const abort = this.abortControllers.get(transferId);
    if (abort) abort.abort();
  }

  sendText(content: string): void {
    this.send(JSON.stringify({ type: "text-message", id: crypto.randomUUID(), content, timestamp: Date.now() }));
  }

  private send(data: string | ArrayBuffer): void {
    if (this.dataChannel?.readyState === "open") this.dataChannel.send(data as any);
  }

  isDataChannelOpen(): boolean { return this.dataChannel?.readyState === "open"; }
  isEncrypted(): boolean { return this.encryptionReady; }

  destroy(): void {
    this.socket.off("offer", this.handleOffer); 
    this.socket.off("answer", this.handleAnswer); 
    this.socket.off("ice-candidate", this.handleIceCandidate);
    this.dataChannel?.close(); this.pc.close(); this.listeners = {};
    this.abortControllers.forEach(c => c.abort());
  }
}
