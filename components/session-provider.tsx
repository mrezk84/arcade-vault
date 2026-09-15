"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type User = { name: string } | null;
export type SavedScore = { game: string; score: number; name: string; at: number };

type SessionContextValue = {
  user: User;
  login: (u: User) => void;
  logout: () => void;
  saveScore: (entry: { game: string; score: number; name: string }) => void;
  bestScoreFor: (gameId: string) => SavedScore | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Store externo respaldado por localStorage, leído vía useSyncExternalStore
// para evitar setState dentro de un efecto y desajustes de hidratación SSR/cliente.
const listeners = new Set<() => void>();
let userCache: User | undefined;
let scoresCache: SavedScore[] | undefined;

function loadUser(): User {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

function loadScores(): SavedScore[] {
  try {
    return JSON.parse(localStorage.getItem("av_scores") || "[]");
  } catch {
    return [];
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

function getScoresSnapshot(): SavedScore[] {
  if (scoresCache === undefined) scoresCache = loadScores();
  return scoresCache;
}

function getScoresServerSnapshot(): SavedScore[] {
  return [];
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

function pushScoreCache(entry: { game: string; score: number; name: string }) {
  const next = [...(scoresCache ?? loadScores()), { ...entry, at: Date.now() }];
  scoresCache = next;
  try {
    localStorage.setItem("av_scores", JSON.stringify(next));
  } catch {}
  emit();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getUserSnapshot, getUserServerSnapshot);
  const scores = useSyncExternalStore(subscribe, getScoresSnapshot, getScoresServerSnapshot);

  const login = (u: User) => setUserCache(u);
  const logout = () => clearUserCache();
  const saveScore = (entry: { game: string; score: number; name: string }) =>
    pushScoreCache(entry);

  const bestScoreFor = (gameId: string): SavedScore | null => {
    if (!user) return null;
    const mine = scores.filter((s) => s.game === gameId && s.name === user.name);
    if (mine.length === 0) return null;
    return mine.reduce((best, s) => (s.score > best.score ? s : best));
  };

  return (
    <SessionContext.Provider value={{ user, login, logout, saveScore, bestScoreFor }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
