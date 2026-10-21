import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthToken, setUnauthorizedHandler } from "../../services/api";
import type { User } from "../../types/user";
import { fetchCurrentUser } from "./auth.service";
import { clearSession, loadSession, saveSession, type Session } from "./session";

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login(session: Session): void;
  logout(): void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function restoreSession(): Session | null {
  const session = loadSession();
  setAuthToken(session?.token ?? null);
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(restoreSession);

  const login = useCallback((newSession: Session) => {
    saveSession(newSession);
    setAuthToken(newSession.token);
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const token = session?.token;

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    fetchCurrentUser()
      .then((user) => {
        if (!active) {
          return;
        }

        const refreshed = { token, user };
        saveSession(refreshed);
        setSession(refreshed);
      })
      .catch(() => {
        // 401 já encerra a sessão pelo unauthorizedHandler; falha de rede mantém a sessão salva.
      });

    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
