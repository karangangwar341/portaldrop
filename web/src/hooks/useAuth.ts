"use client";
import { useState, useCallback, useEffect } from "react";
import { connectSocket } from "../lib/socket/client";
import { saveSession, loadSession, clearSession } from "../lib/auth/userSession";
import type { User, UserSession } from "../types";

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => void;
  register: (username: string, displayName: string, password: string) => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      const socket = connectSocket();
      socket.on("auth:success", ({ token, user: u }: { token: string; user: User }) => {
        setUser(u);
        saveSession({ user: u, token });
        setIsLoading(false);
      });
      socket.on("auth:invalid", () => {
        clearSession();
        setIsLoading(false);
      });
      socket.emit("auth:validate", { token: stored.token });
      setTimeout(() => setIsLoading(false), 3000);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((username: string, password: string) => {
    setError(null);
    const socket = connectSocket();
    const onSuccess = ({ token, user: u }: { token: string; user: User }) => {
      setUser(u);
      saveSession({ user: u, token });
      socket.off("auth:success", onSuccess);
      socket.off("auth:error", onError);
    };
    const onError = ({ message }: { message: string }) => {
      setError(message);
      socket.off("auth:success", onSuccess);
      socket.off("auth:error", onError);
    };
    socket.on("auth:success", onSuccess);
    socket.on("auth:error", onError);
    socket.emit("auth:login", { username, password });
  }, []);

  const register = useCallback((username: string, displayName: string, password: string) => {
    setError(null);
    const socket = connectSocket();
    const onSuccess = ({ token, user: u }: { token: string; user: User }) => {
      setUser(u);
      saveSession({ user: u, token });
      socket.off("auth:success", onSuccess);
      socket.off("auth:error", onError);
    };
    const onError = ({ message }: { message: string }) => {
      setError(message);
      socket.off("auth:success", onSuccess);
      socket.off("auth:error", onError);
    };
    socket.on("auth:success", onSuccess);
    socket.on("auth:error", onError);
    socket.emit("auth:register", { username, displayName, password });
  }, []);

  const logout = useCallback(() => {
    const stored = loadSession();
    if (stored) {
      const socket = connectSocket();
      socket.emit("auth:logout", { token: stored.token });
    }
    clearSession();
    setUser(null);
  }, []);

  return { user, isLoading, error, login, register, logout };
}
