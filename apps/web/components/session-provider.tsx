"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, onUnauthorized } from "@/lib/api/client";
import {
  outcomeFromError,
  SESSION_LOADING,
  shouldClearSessionAfterLogoutError,
  sessionAfterUnauthorized,
  sessionFromOutcome,
  SESSION_SIGNED_OUT,
  type MeOutcome,
  type SessionState,
} from "@/lib/session/session";

type SessionContextValue = {
  session: SessionState;
  /** Déconnecte, vide l'état partagé et va à l'accueil ; en cas d'échec réseau, ne change rien. */
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession doit être utilisé dans SessionProvider");
  return value;
}

async function fetchOutcome(): Promise<MeOutcome> {
  try {
    return { ok: true, user: await getMe() };
  } catch (error) {
    return outcomeFromError(error);
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(SESSION_LOADING);
  const signingOut = useRef(false);

  // Vérification unique au montage du cadre (cookie HttpOnly : lecture côté navigateur).
  useEffect(() => {
    let cancelled = false;
    void fetchOutcome().then((outcome) => {
      if (!cancelled) setSession(sessionFromOutcome(outcome));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tout 401 reçu par un appel navigateur fait passer le menu à « Connexion ».
  useEffect(
    () => onUnauthorized(() => setSession(sessionAfterUnauthorized)),
    [],
  );

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await logout();
    } catch (error) {
      // 401 : session déjà terminée. Tout autre échec : on reste connecté, nouvel essai possible.
      if (!shouldClearSessionAfterLogoutError(error)) return;
    } finally {
      signingOut.current = false;
    }
    setSession(SESSION_SIGNED_OUT);
    router.push("/");
  }, [router]);

  const value = useMemo(() => ({ session, signOut }), [session, signOut]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
