"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Lock, User, LogOut, History, Bell, Users, Radio } from "lucide-react";
import { CreateConnectionCard } from "../components/pairing/CreateConnectionCard";
import { JoinConnectionForm } from "../components/pairing/JoinConnectionForm";
import { TransferRoom } from "../components/transfer/TransferRoom";
import { AuthModal } from "../components/auth/AuthModal";
import { NotificationPanel, NotificationBell } from "../components/notifications/NotificationPanel";
import { LANDiscoveryPanel } from "../components/lan/LANDiscoveryPanel";
import { TransferHistory } from "../components/history/TransferHistory";
import { RoomsDashboard } from "../components/rooms/RoomsDashboard";
import { useRoomSession } from "../hooks/useRoomSession";
import { useAuth } from "../hooks/useAuth";
import { useNotifications, requestNotificationPermission } from "../hooks/useNotifications";
import { useLANDiscovery } from "../hooks/useLANDiscovery";
import type { LANPeer } from "../types";

type View = "home" | "create" | "join" | "rooms";
type Panel = "none" | "notifications" | "history";

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [showAuth, setShowAuth] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [multiPeer, setMultiPeer] = useState(false);

  const auth = useAuth();
  const { push: notify, ...notifs } = useNotifications();
  const lan = useLANDiscovery();

  const {
    connectionState, session, error,
    outgoingTransfers, incomingTransfers, folderTransfers,
    receivedTexts, connectedPeers, isEncrypted,
    createRoom, joinRoom, disconnect, sendFile, sendFolder, sendText, pauseTransfer, resumeTransfer,
    userRooms, isRoomsLoading, fetchUserRooms, deleteUserRoom,
    roomHistory = [], fetchHistory, clearHistory,
  } = useRoomSession(auth.user, notify);

  // Auto-request notification permission on load
  useEffect(() => { requestNotificationPermission(); }, []);

  // When a LAN peer is selected, pre-fill the join flow
  const handleLANConnect = (peer: LANPeer) => {
    setView("join");
  };

  // Connected view
  if ((connectionState === "connected" || connectionState === "connecting" || connectionState === "waiting") && session) {
    return (
      <TransferRoom
        connectionState={connectionState}
        session={session}
        outgoingTransfers={outgoingTransfers}
        incomingTransfers={incomingTransfers}
        folderTransfers={folderTransfers}
        receivedTexts={receivedTexts}
        connectedPeers={connectedPeers}
        isEncrypted={isEncrypted}
        onSendFiles={files => files.forEach(f => sendFile(f))}
        onSendFolder={auth.user ? sendFolder : undefined}
        onSendText={sendText}
        onPause={pauseTransfer}
        onResume={resumeTransfer}
        onDisconnect={() => { disconnect(); setView("home"); }}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="relative">
          <NotificationBell count={notifs.unreadCount} onClick={() => setPanel(p => p === "notifications" ? "none" : "notifications")} />
          <AnimatePresence>
            {panel === "notifications" && (
              <NotificationPanel
                notifications={notifs.notifications}
                unreadCount={notifs.unreadCount}
                onMarkRead={notifs.markRead}
                onMarkAllRead={notifs.markAllRead}
                onDismiss={notifs.dismiss}
                onClose={() => setPanel("none")}
              />
            )}
          </AnimatePresence>
        </div>

        {auth.user ? (
          <div className="flex items-center gap-2">
            <button
               onClick={() => { setView("rooms"); fetchUserRooms(); }}
               className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white flex items-center gap-2"
            >
              <Zap className="h-3.5 w-3.5 text-blue-400" />
              My Rooms
            </button>
            <button
              onClick={() => setPanel(p => p === "history" ? "none" : "history")}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <History className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: auth.user.avatarColor }}>
                {auth.user.displayName.charAt(0)}
              </div>
              <span className="text-xs font-medium text-zinc-300">{auth.user.displayName}</span>
            </div>
            <button onClick={auth.logout} className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white">
            <User className="h-3.5 w-3.5" />
            Sign In
          </button>
        )}
      </div>

      {/* History panel */}
      {panel === "history" && auth.user && (
        <div className="absolute top-16 right-4 w-96 z-40">
          <TransferHistory onClose={() => setPanel("none")} />
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Shield className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">PortalDrop</h1>
          <p className="mt-2 text-zinc-400">
            Secure browser-to-browser file transfer.
            <br />
            <span className="text-zinc-500 text-sm">E2E encrypted · No server upload · Direct P2P</span>
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <button
                onClick={() => { setView("create"); createRoom({ isMultiPeer: multiPeer }); }}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-5 text-left transition hover:border-blue-400/30 hover:bg-white/6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Create Connection</p>
                    <p className="mt-0.5 text-sm text-zinc-500">Get a pairing ID and password</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setView("join")}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-5 text-left transition hover:border-violet-400/30 hover:bg-white/6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Join Connection</p>
                    <p className="mt-0.5 text-sm text-zinc-500">Enter a pairing ID and password</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition">
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
              </button>

              {/* Group room toggle */}
              {auth.user && (
                <button
                  onClick={() => setMultiPeer(p => !p)}
                  className={`w-full flex items-center gap-3 rounded-2xl border px-5 py-3 text-left transition ${multiPeer ? "border-violet-500/30 bg-violet-500/8" : "border-white/10 bg-white/3 hover:bg-white/5"}`}
                >
                  <Users className={`h-4 w-4 ${multiPeer ? "text-violet-400" : "text-zinc-500"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${multiPeer ? "text-violet-300" : "text-zinc-300"}`}>Group Room</p>
                    <p className="text-xs text-zinc-600">Allow up to 8 peers in one room</p>
                  </div>
                  <div className={`h-4 w-7 rounded-full transition-colors ${multiPeer ? "bg-violet-500" : "bg-white/10"}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${multiPeer ? "translate-x-3" : "translate-x-0"}`} />
                  </div>
                </button>
              )}

              {/* LAN Discovery */}
              {auth.user && (
                <LANDiscoveryPanel
                  peers={lan.peers}
                  isAnnounced={lan.isAnnounced}
                  onAnnounce={() => lan.announce(auth.user)}
                  onStop={lan.stopAnnouncing}
                  onConnect={handleLANConnect}
                />
              )}

              {/* Advanced Features Prompt */}
              {!auth.user && (
                <div className="w-full rounded-2xl border border-white/5 bg-white/2 p-4 text-center transition hover:border-white/10 hover:bg-white/4">
                  <p className="text-sm font-medium text-zinc-400">Unlock advanced features</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    <button onClick={() => setShowAuth(true)} className="text-blue-400 hover:text-blue-300 transition hover:underline">
                      Sign in
                    </button>
                    {" "}to use group rooms, transfer entire folders, and discover devices on your local network.
                  </p>
                </div>
              )}

              {/* Feature badges */}
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {["End-to-end encrypted", "No account needed", "Files never leave your browser", "Folder transfer", "Resume transfers"].map(f => (
                  <span key={f} className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-zinc-500">{f}</span>
                ))}
              </div>
            </motion.div>
          )}

          {view === "create" && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <CreateConnectionCard session={session} isCreating={connectionState === "creating"} isWaiting={connectionState === "waiting"} onCreateRoom={() => createRoom({ isMultiPeer: multiPeer })} />
              <button onClick={() => { disconnect(); setView("home"); }} className="mt-4 w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition">← Back</button>
            </motion.div>
          )}

          {view === "join" && (
            <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <JoinConnectionForm isJoining={connectionState === "joining" || connectionState === "connecting"} error={connectionState === "error" ? error : null} onJoin={joinRoom} />
              <button onClick={() => { disconnect(); setView("home"); }} className="mt-4 w-full text-center text-sm text-zinc-600 hover:text-zinc-400 transition">← Back</button>
            </motion.div>
          )}

          {view === "rooms" && (
            <motion.div key="rooms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <RoomsDashboard 
                rooms={userRooms} 
                roomHistory={roomHistory}
                onJoin={(id, pwd) => { joinRoom(id, pwd); }}
                onDelete={deleteUserRoom}
                onClearHistory={clearHistory}
                onClose={() => setView("home")}
                isLoading={isRoomsLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAuth && <AuthModal auth={auth} onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}
