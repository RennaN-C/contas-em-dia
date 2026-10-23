import type { User } from "../../types/user";

export type Session = {
  token: string;
  user: User;
};

const SESSION_KEY = "contasemdia:session";

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const stored = localStorage.getItem(SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    const session = JSON.parse(stored) as Partial<Session>;

    if (typeof session.token !== "string" || !session.user?.id) {
      clearSession();
      return null;
    }

    return session as Session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
