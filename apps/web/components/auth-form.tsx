"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { login, register } from "@/lib/api/client";
import { destinationAfterAuth } from "@/lib/auth/safe-next";
import { ApiError } from "@/lib/api/errors";

const LOGIN_ERROR = "Email ou mot de passe incorrect.";

const fieldClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Mode = "login" | "register";

function registerError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Un compte existe déjà avec cet email.";
  }
  if (error instanceof ApiError && error.status === 400) {
    return "Email invalide, ou mot de passe de moins de 8 caractères.";
  }
  return "Impossible de créer le compte. Réessayez.";
}

function otherPage(mode: Mode, next: string | null): string {
  const path = mode === "login" ? "/register" : "/login";
  if (!next) return path;
  return `${path}?${new URLSearchParams({ next }).toString()}`;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setError(null);
    setPending(true);
    try {
      const credentials = { email, password };
      if (isLogin) await login(credentials);
      else await register(credentials);
      router.push(destinationAfterAuth(next));
    } catch (caught) {
      setError(isLogin ? LOGIN_ERROR : registerError(caught));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Sonar</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Retrouvez les pistes de votre métier."
            : "Créez un compte pour consulter les pistes."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={fieldClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={isLogin ? undefined : 8}
            className={fieldClassName}
          />
        </div>

        {error ? (
          <p id="auth-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={pending}
          aria-describedby={error ? "auth-error" : undefined}
        >
          {pending
            ? "En cours…"
            : isLogin
              ? "Se connecter"
              : "Créer le compte"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <Link
          href={otherPage(mode, next)}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isLogin ? "Créer un compte" : "Se connecter"}
        </Link>
      </p>
    </div>
  );
}

export function AuthFormFallback() {
  return <p className="text-sm text-muted-foreground">Chargement…</p>;
}
