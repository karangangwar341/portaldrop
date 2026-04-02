"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, Trash2, ExternalLink, Copy, Check, 
  Calendar, Shield, ShieldCheck, Users, Zap, Clock, History
} from "lucide-react";
import type { RoomHistoryItem } from "../../lib/auth/roomHistory";

interface Room {
  id: string;
  password: string;
  isMultiPeer: boolean;
  maxPeers: number;
  createdAt: string | Date;
  expiresAt: string | Date;
}

 interface RoomsDashboardProps {
   rooms: Room[];
   roomHistory: RoomHistoryItem[];
   onJoin: (roomId: string, password: string) => void;
   onDelete: (roomId: string) => void;
   onClearHistory: () => void;
   onClose: () => void;
   isLoading?: boolean;
 }

 function formatRelative(date: string | Date | number) {
   const now = new Date();
   const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

 export function RoomsDashboard({ rooms, roomHistory, onJoin, onDelete, onClearHistory, onClose, isLoading }: RoomsDashboardProps) {
   const [activeTab, setActiveTab] = useState<"created" | "recent">("created");
   const [copiedId, setCopiedId] = useState<string | null>(null);
 
   const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text);
     setCopiedId(text);
     setTimeout(() => setCopiedId(null), 2000);
   };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold text-white">My Rooms</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex border-b border-white/5 px-2">
        <button
          onClick={() => setActiveTab("created")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-medium transition ${
            activeTab === "created" ? "text-blue-400 border-b-2 border-blue-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Zap className="h-3.5 w-3.5" /> Created Labs
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-medium transition ${
            activeTab === "recent" ? "text-violet-400 border-b-2 border-violet-400" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <History className="h-3.5 w-3.5" /> Recent Hubs
        </button>
      </div>

       <div className="max-h-[400px] overflow-y-auto p-4 scrollbar-hide">
         {isLoading ? (
           <div className="flex flex-col items-center justify-center py-12">
             <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
             <p className="mt-4 text-sm text-zinc-500">Loading your rooms...</p>
           </div>
         ) : activeTab === "created" ? (
           rooms.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-600">
                 <Shield className="h-6 w-6" />
               </div>
               <p className="text-sm font-medium text-zinc-400">No rooms found</p>
               <p className="mt-1 text-xs text-zinc-600">Create a new connection to get started</p>
             </div>
           ) : (
             <div className="grid gap-3">
               {rooms.map((room) => (
                 <div
                   key={room.id}
                   className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/10 hover:bg-white/8"
                 >
                   <div className="flex items-center justify-between">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-bold tracking-wider text-blue-400">#{room.id}</span>
                         {room.isMultiPeer ? (
                           <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                             <Users className="h-3 w-3" /> Group
                           </span>
                         ) : (
                           <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                             <ShieldCheck className="h-3 w-3" /> 1-on-1
                           </span>
                         )}
                       </div>
                       <div className="flex items-center gap-3 text-xs text-zinc-500">
                         <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" /> 
                           {formatRelative(room.createdAt)}
                         </span>
                       </div>
                     </div>
 
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => onJoin(room.id, room.password)}
                         className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95"
                       >
                         <ExternalLink className="h-3 w-3" /> Join
                       </button>
                       <button
                         onClick={() => onDelete(room.id)}
                         className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   </div>
                   
                   <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/20 p-2">
                      <div className="flex-1">
                         <p className="text-[10px] uppercase tracking-wider text-zinc-600">Password</p>
                         <p className="text-xs font-mono text-zinc-300">{room.password}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(room.password)}
                        className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                      >
                        {copiedId === room.password ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                   </div>
                 </div>
               ))}
             </div>
           )
         ) : (
           /* Room History Tab */
           (!roomHistory || roomHistory.length === 0) ? (
             <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-600">
                 <Clock className="h-6 w-6" />
               </div>
               <p className="text-sm font-medium text-zinc-400">No history yet</p>
               <p className="mt-1 text-xs text-zinc-600">Rooms you join will appear here</p>
             </div>
           ) : (
             <div className="grid gap-3">
               <div className="flex justify-end pr-1">
                 <button onClick={onClearHistory} className="text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400">
                   Clear History
                 </button>
               </div>
               {roomHistory?.map((item) => (
                 <div
                   key={item.roomId}
                   className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/10 hover:bg-white/8"
                 >
                   <div className="flex items-center justify-between">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-bold tracking-wider text-zinc-300">#{item.roomId}</span>
                         <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                           item.role === 'host' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400'
                         }`}>
                           {item.role === 'host' ? 'Host' : 'Guest'}
                         </span>
                       </div>
                       <div className="flex items-center gap-3 text-xs text-zinc-500">
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3" /> 
                           {formatRelative(item.timestamp)}
                         </span>
                       </div>
                     </div>
 
                     <button
                       onClick={() => onJoin(item.roomId, item.password)}
                       className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 active:scale-95"
                     >
                       <ExternalLink className="h-3 w-3" /> Go Back
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )
         )}
       </div>
 
       <div className="border-t border-white/5 bg-white/5 p-4 text-center">
         <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
           {activeTab === 'created' ? 'Rooms expire after 30 days of inactivity' : 'Showing last 10 lab connections'}
         </p>
       </div>
    </motion.div>
  );
}
