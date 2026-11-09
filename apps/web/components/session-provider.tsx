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
import { toast } from "sonner";
import { getMe, logout, onUnauthorized } from "@/lib/api/client";
import { clearSessionHint, readSessionHint } from "@/lib/session/hint";
import { SIGNED_OUT_TOAST } from "@/lib/session/messages";
import {
  initialSessionCheck,
  outcomeFromError,
  SESSION_LOADING,
  shouldClearHintAfterOutcome,
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

  // Vérification unique au montage : l'indice (cookie lisible) évite l'appel réseau
  // pour un visiteur sans session. L'état initial reste « loading » (SSR identique).
  useEffect(() => {
    let cancelled = false;
    if (initialSessionCheck(readSessionHint()) === "skip") {
      // Sans appel réseau. `Promise.resolve().then` contourne volontairement la règle lint
      // react-hooks/set-state-in-effect (pas de setState synchrone dans l'effet).
      void Promise.resolve().then(() => {
        if (!cancelled) setSession(SESSION_SIGNED_OUT);
      });
    } else {
      void fetchOutcome().then((outcome) => {
        // Garde `!cancelled` : après démontage, un 401 tardif ne doit pas effacer un indice
        // fraîchement posé (ex. login sur /login après le démontage du cadre).
        if (cancelled) return;
        if (shouldClearHintAfterOutcome(outcome)) clearSessionHint();
        setSession(sessionFromOutcome(outcome));
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Tout 401 reçu par un appel navigateur fait passer le menu à « Connexion »
  // et efface l'indice périmé.
  useEffect(
    () =>
      onUnauthorized(() => {
        clearSessionHint();
        setSession(sessionAfterUnauthorized);
      }),
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
    clearSessionHint();
    setSession(SESSION_SIGNED_OUT);
    router.push("/");
    toast(SIGNED_OUT_TOAST);
  }, [router]);

  const value = useMemo(() => ({ session, signOut }), [session, signOut]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
