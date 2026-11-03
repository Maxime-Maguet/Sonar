import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandLink } from "@/components/brand-link";
import { AuthForm, AuthFormFallback } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Connexion — Sonar",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-16">
      <BrandLink className="mb-8 self-start" />
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
