"use client";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, XCircle, Loader2, PauseCircle, FolderOpen, Download } from "lucide-react";
import type { OutgoingTransfer, IncomingTransfer, FolderTransfer } from "../../types";

type Transfer = OutgoingTransfer | IncomingTransfer;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getFileName(t: Transfer): string { return "file" in t ? t.file.name : t.fileName; }
function getFileSize(t: Transfer): number { return "file" in t ? t.file.size : t.fileSize; }

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "paused") return <PauseCircle className="h-4 w-4 text-amber-400" />;
  if (status === "transferring" || status === "resuming") return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
  if (status === "resuming") return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
  return null;
}

 interface TransferProps {
   transfer: Transfer;
   direction: "outgoing" | "incoming";
   onPause?: (id: string) => void;
   onResume?: (id: string) => void;
 }

 export function TransferProgressCard({ transfer, direction, onPause, onResume }: TransferProps) {
  const fileName = getFileName(transfer);
  const fileSize = getFileSize(transfer);
  const isComplete = transfer.status === "complete";
  const isError = transfer.status === "error";
  const isTransferring = transfer.status === "transferring" || transfer.status === "resuming";
  const isPaused = transfer.status === "paused";
  const downloadUrl = direction === "incoming" && "downloadUrl" in transfer ? transfer.downloadUrl : undefined;

  const barColor = isComplete ? "bg-emerald-500" : isPaused ? "bg-amber-500" : "bg-blue-500";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{fileName}</p>
            <div className="flex items-center gap-1.5">
              {"encrypted" in transfer && transfer.encrypted && (
                <span className="text-[10px] text-emerald-400 font-mono border border-emerald-500/20 rounded px-1">E2E</span>
              )}
              <StatusIcon status={transfer.status} />
            </div>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {formatBytes(fileSize)}
            {isTransferring && <span className="ml-2 text-zinc-400">{transfer.progress}%</span>}
          </p>
          {(isTransferring || isComplete || isPaused) && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div className={`h-full rounded-full ${barColor}`} initial={{ width: "0%" }} animate={{ width: `${transfer.progress}%` }} transition={{ ease: "easeOut" }} />
            </div>
          )}
          {isError && <p className="mt-1 text-xs text-red-400">{transfer.error ?? "Transfer failed"}</p>}
          <div className="mt-2 flex items-center gap-2">
            {isComplete && downloadUrl && (
              <a href={downloadUrl} download={fileName} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/25">
                <Download className="h-3 w-3" />
                Download
              </a>
            )}
            {isTransferring && onPause && direction === "outgoing" && (
              <button onClick={() => onPause(transfer.id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20">
                <PauseCircle className="h-3 w-3" />
                Pause
              </button>
            )}
            {isPaused && onResume && direction === "outgoing" && (
               <button onClick={() => onResume(transfer.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20">
                 <Loader2 className="h-3 w-3" />
                 Resume
               </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface FolderProps {
  folder: FolderTransfer;
}

export function FolderProgressCard({ folder }: FolderProps) {
  const progress = folder.totalFiles === 0 ? 0 : Math.round((folder.completedFiles / folder.totalFiles) * 100);
  const isComplete = folder.completedFiles === folder.totalFiles;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{folder.folderName}</p>
            {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
          </div>
          <p className="text-xs text-zinc-500">{folder.completedFiles} / {folder.totalFiles} files</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div className={`h-full rounded-full ${isComplete ? "bg-emerald-500" : "bg-violet-500"}`} initial={{ width: "0%" }} animate={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
