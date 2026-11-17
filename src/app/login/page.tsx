import type { Metadata } from "next";
import { Suspense } from "react";
import { th } from "@/lib/i18n/th";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: `${th.auth.login} · ${th.app.name}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-[440px] flex-col px-4 pt-16 pb-16">
      <h2 className="mb-2">{th.auth.loginTitle}</h2>
      <p className="mb-6 text-mu">{th.auth.loginBody}</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
