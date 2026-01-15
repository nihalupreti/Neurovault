"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { ENDPOINTS } from "@/api/endpoints";

interface AuthState {
  role: "admin" | "guest";
  isAdmin: boolean;
  login: (secret: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  role: "guest",
  isAdmin: false,
  login: async () => false,
  logout: () => {},
});

const STORAGE_KEY = "nv_admin_secret";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSecret(stored);
  }, []);

  useEffect(() => {
    if (secret) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${secret}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [secret]);

  const login = useCallback(async (value: string): Promise<boolean> => {
    try {
      const { data } = await axios.post(ENDPOINTS.auth.login, { secret: value });
      if (data.authenticated) {
        localStorage.setItem(STORAGE_KEY, value);
        setSecret(value);
        return true;
      }
    } catch {
      // invalid
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSecret(null);
  }, []);

  const value = useMemo(
    () => ({
      role: secret ? "admin" as const : "guest" as const,
      isAdmin: !!secret,
      login,
      logout,
    }),
    [secret, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
