import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm, AuthFormFallback } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Inscription — Sonar",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-16">
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="register" />
      </Suspense>
    </main>
  );
}
