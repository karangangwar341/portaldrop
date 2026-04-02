"use client";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { DropZone } from "./DropZone";
import { TransferProgressCard, FolderProgressCard } from "./TransferProgressCard";
import { TextSharePanel } from "./TextSharePanel";
import { ConnectionStatusBadge } from "../pairing/ConnectionStatusBadge";
import { MultiPeerPanel } from "../rooms/MultiPeerPanel";
import type { ConnectionState, RoomSession, OutgoingTransfer, IncomingTransfer, ReceivedText, FolderTransfer, ConnectedPeer } from "../../types";

interface Props {
  connectionState: ConnectionState;
  session: RoomSession;
  outgoingTransfers: OutgoingTransfer[];
  incomingTransfers: IncomingTransfer[];
  folderTransfers: FolderTransfer[];
  receivedTexts: ReceivedText[];
  connectedPeers: ConnectedPeer[];
  isEncrypted: boolean;
  onSendFiles: (files: File[]) => void;
  onSendFolder?: (files: File[], folderName: string) => void;
  onSendText: (content: string) => void;
   onDisconnect: () => void;
   onPause: (id: string) => void;
   onResume: (id: string) => void;
 }

 export function TransferRoom({
   connectionState, session, outgoingTransfers, incomingTransfers,
   folderTransfers, receivedTexts, connectedPeers, isEncrypted,
   onSendFiles, onSendFolder, onSendText, onDisconnect, onPause, onResume,
 }: Props) {
  const isConnected = connectionState === "connected";
  const outgoingFolderIds = new Set(outgoingTransfers.map(t => t.folderTransferId).filter(Boolean));
  const incomingFolderIds = new Set(incomingTransfers.map(t => t.folderTransferId).filter(Boolean));
  const standaloneOutgoing = outgoingTransfers.filter(t => !t.folderTransferId);
  const standaloneIncoming = incomingTransfers.filter(t => !t.folderTransferId);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-sm text-zinc-600">/</span>
              <span className="text-sm font-medium text-zinc-300">Secure Session</span>
              {isEncrypted && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">🔒 E2E</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SessionPill label="Pair ID" value={session.roomId} />
              <SessionPill label="Password" value={session.password} />
              {session.isMultiPeer && (
                <span className="flex items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400">Group Room</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatusBadge state={connectionState} roomId={session.roomId} onDisconnect={onDisconnect} />
            <button 
              onClick={onDisconnect}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              Exit Room
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {connectedPeers.length > 0 && (
          <div className="mb-4">
            <MultiPeerPanel peers={connectedPeers} isEncrypted={isEncrypted} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Panel */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <SectionLabel label="Send" />
            <DropZone onFiles={onSendFiles} onFolder={onSendFolder} disabled={!isConnected} />
            <TextSharePanel onSendText={onSendText} receivedTexts={[]} disabled={!isConnected} />
            {folderTransfers.filter(f => f.direction === "outgoing").map(f => <FolderProgressCard key={f.id} folder={f} />)}
             {standaloneOutgoing.length > 0 && (
               <div className="space-y-2">
                 <p className="text-xs text-zinc-500">Outgoing files</p>
                 {standaloneOutgoing.map(t => <TransferProgressCard key={t.id} transfer={t} direction="outgoing" onPause={onPause} onResume={onResume} />)}
               </div>
             )}
          </motion.div>

          {/* Receive Panel */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <SectionLabel label="Receive" />
            {standaloneIncoming.length === 0 && receivedTexts.length === 0 && folderTransfers.filter(f => f.direction === "incoming").length === 0 ? (
              <EmptyReceive />
            ) : (
              <>
                {folderTransfers.filter(f => f.direction === "incoming").map(f => <FolderProgressCard key={f.id} folder={f} />)}
                {standaloneIncoming.map(t => <TransferProgressCard key={t.id} transfer={t} direction="incoming" />)}
                {receivedTexts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Received text</p>
                    <TextSharePanel onSendText={() => {}} receivedTexts={receivedTexts} disabled />
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function SessionPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="font-mono text-sm font-semibold text-zinc-100">{value}</span>
      </div>
      <button onClick={() => navigator.clipboard.writeText(value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 transition">Copy</button>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-medium text-zinc-300">{label}</h2>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}

function EmptyReceive() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/8 text-center">
      <p className="text-sm text-zinc-500">Nothing received yet</p>
      <p className="mt-1 text-xs text-zinc-600">Files and text sent from peers appear here</p>
    </div>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold">P</span>
      <span className="text-sm font-semibold text-white">PortalDrop</span>
    </span>
  );
}
