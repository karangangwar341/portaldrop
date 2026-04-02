"use client";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FolderOpen, FolderArchive } from "lucide-react";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";

interface Props {
  onFiles: (files: File[]) => void;
  onFolder?: (files: File[], folderName: string) => void;
  disabled?: boolean;
}

export function DropZone({ onFiles, onFolder, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { isDragging, dragProps } = useDragAndDrop(files => {
    if (files.length === 0) return;
    // If all files share a common prefix treat as folder
    const first = (files[0] as any).webkitRelativePath as string | undefined;
    if (first && onFolder) {
      const folderName = first.split("/")[0];
      onFolder(files, folderName);
    } else {
      onFiles(files);
    }
  });

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  }, [onFiles]);

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const folderName = (files[0] as any).webkitRelativePath?.split("/")[0] ?? "folder";
    if (onFolder) onFolder(files, folderName);
    else onFiles(files);
    e.target.value = "";
  }, [onFiles, onFolder]);

  return (
    <div className="space-y-2">
      <div
        {...dragProps}
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all
          ${disabled ? "cursor-not-allowed opacity-40 border-white/10" : ""}
          ${isDragging ? "border-blue-400/70 bg-blue-500/10" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => e.key === "Enter" && !disabled && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileInput} disabled={disabled} />
        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div key="drag" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-2 text-blue-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20"><Upload className="h-6 w-6" /></div>
              <span className="text-sm font-medium">Drop to send</span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-zinc-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5"><FolderOpen className="h-6 w-6" /></div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Drop files here</p>
                <p className="mt-0.5 text-xs text-zinc-500">or click to browse</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {onFolder && (
        <button
          onClick={() => !disabled && folderInputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/3 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FolderArchive className="h-3.5 w-3.5" />
          Send Folder
          <input
            ref={folderInputRef}
            type="file"
            className="sr-only"
            // @ts-ignore
            webkitdirectory=""
            multiple
            onChange={handleFolderInput}
            disabled={disabled}
          />
        </button>
      )}
    </div>
  );
}
