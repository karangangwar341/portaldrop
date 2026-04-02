"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Lock, Eye, EyeOff, Loader2, UserPlus, LogIn } from "lucide-react";
import type { AuthState } from "../../hooks/useAuth";

interface Props {
  auth: AuthState;
  onClose: () => void;
}

export function AuthModal({ auth, onClose }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === "login") await auth.login(username, password);
      else await auth.register(username, displayName, password);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (auth.user) onClose();
  }, [auth.user, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {auth.error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {auth.error}
          </div>
        )}

        <div className="space-y-3">
          <Field icon={<User className="h-4 w-4" />} placeholder="Username" value={username} onChange={setUsername} />
          {mode === "register" && (
            <Field icon={<User className="h-4 w-4" />} placeholder="Display name (optional)" value={displayName} onChange={setDisplayName} />
          )}
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
            />
            <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !username || !password}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          onClick={() => setMode(m => m === "login" ? "register" : "login")}
          className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange }: { icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
      />
    </div>
  );
}
