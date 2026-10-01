"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type User = { name: string } | null;

type SessionContextValue = {
  user: User;
  login: (u: User) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Store externo respaldado por localStorage, leído vía useSyncExternalStore
// para evitar setState dentro de un efecto y desajustes de hidratación SSR/cliente.
const listeners = new Set<() => void>();
let userCache: User | undefined;

function loadUser(): User {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit() {
  listeners.forEach((l) => l());
}

function getUserSnapshot(): User {
  if (userCache === undefined) userCache = loadUser();
  return userCache;
}

function getUserServerSnapshot(): User {
  return null;
}

function setUserCache(u: User) {
  userCache = u;
  try {
    localStorage.setItem("av_user", JSON.stringify(u));
  } catch {}
  emit();
}

function clearUserCache() {
  userCache = null;
  try {
    localStorage.removeItem("av_user");
  } catch {}
  emit();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getUserSnapshot, getUserServerSnapshot);

  const login = (u: User) => setUserCache(u);
  const logout = () => clearUserCache();
  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
