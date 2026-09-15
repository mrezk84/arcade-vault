"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

function readUser(): User {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

function readScores(): SavedScore[] {
  try {
    return JSON.parse(localStorage.getItem("av_scores") || "[]");
  } catch {
    return [];
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [scores, setScores] = useState<SavedScore[]>([]);

  useEffect(() => {
    setUser(readUser());
    setScores(readScores());
  }, []);

  const login = (u: User) => {
    setUser(u);
    try {
      localStorage.setItem("av_user", JSON.stringify(u));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {}
  };

  const saveScore = (entry: { game: string; score: number; name: string }) => {
    const next = [...scores, { ...entry, at: Date.now() }];
    setScores(next);
    try {
      localStorage.setItem("av_scores", JSON.stringify(next));
    } catch {}
  };

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
