"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithGoogle, signInWithPassword, useAuth } from "@/lib/auth/useAuth";
import { devLoginEnabled, supabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/supabase/redirect";
import { th } from "@/lib/i18n/th";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const status = useAuth((s) => s.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? th.auth.callbackError : null);

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  const google = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle(next);
    if (err) {
      setBusy(false);
      setError(th.auth.callbackError);
    }
  };

  const dev = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const err = await signInWithPassword(String(f.get("email")), String(f.get("password")));
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="grid gap-4">
      {!supabaseConfigured && (
        <p className="rounded-lg border border-warn/50 bg-warn/10 p-3 text-[13px] text-warn">{th.auth.notConfigured}</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-ac/50 bg-ac/10 p-3 text-[13px] text-ac2">
          {error}
        </p>
      )}
      <button
        className="btn flex items-center justify-center gap-3 !bg-white py-3 font-semibold !text-[#1f1f1f] hover:!bg-[#f2f2f2]"
        onClick={google}
        disabled={!supabaseConfigured || busy}
      >
        <GoogleMark />
        {busy ? th.auth.redirecting : th.auth.google}
      </button>
      <p className="hint">{th.auth.guestNote}</p>
      <Link href="/studio" className="btn ghost inline-flex items-center justify-center">
        {th.auth.continueGuest}
      </Link>

      {devLoginEnabled && supabaseConfigured && (
        <form onSubmit={dev} className="sec grid gap-2">
          <h3>{th.auth.devTitle}</h3>
          <label htmlFor="email">{th.auth.email}</label>
          <input id="email" name="email" type="email" required className="field" autoComplete="username" />
          <label htmlFor="password">{th.auth.password}</label>
          <input id="password" name="password" type="password" required className="field" autoComplete="current-password" />
          <button className="btn" disabled={busy}>
            {th.auth.devSubmit}
          </button>
        </form>
      )}
    </div>
  );
}
