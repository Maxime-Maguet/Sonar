"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { login, register } from "@/lib/api/client";
import { destinationAfterAuth } from "@/lib/auth/safe-next";
import { authFailureSentence } from "@/lib/auth/failure-copy";
import {
  validateAuthFields,
  validateField,
  type AuthField,
  type AuthFieldErrors,
} from "@/lib/auth/field-errors";

const fieldClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Mode = "login" | "register";

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
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const isLogin = mode === "login";

  // Re-valide un champ déjà en erreur pour que le message disparaisse dès la correction.
  function onFieldChange(field: AuthField, value: string) {
    if (!fieldErrors[field]) return;
    setFieldErrors((current) => ({
      ...current,
      [field]: validateField(mode, field, value),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setError(null);
    const errors = validateAuthFields(mode, { email, password });
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      const first = errors.email ? "email" : "password";
      document.getElementById(first)?.focus();
      return;
    }
    setPending(true);
    try {
      const credentials = { email, password };
      if (isLogin) await login(credentials);
      else await register(credentials);
      router.push(destinationAfterAuth(next));
    } catch (caught) {
      setError(authFailureSentence(mode, caught));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Retrouvez les pistes de votre métier."
            : "Créez un compte pour consulter les pistes."}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={(event) => onFieldChange("email", event.target.value)}
            className={fieldClassName}
          />
          {fieldErrors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
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
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            onChange={(event) => onFieldChange("password", event.target.value)}
            className={fieldClassName}
          />
          {fieldErrors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          ) : null}
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
