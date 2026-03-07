"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserSettings } from "@/lib/services/firestore";
import type { UserSettings } from "@/types";

interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  settings: null,
  loading: true,
  refreshSettings: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    if (user) {
      try {
        const s = await getUserSettings(user.uid);
        setSettings(s);
      } catch {
        // silently fail on settings refresh
      }
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const s = await getUserSettings(firebaseUser.uid);
          setSettings(s);
        } catch {
          setSettings(null);
        }
      } else {
        setSettings(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, settings, loading, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
