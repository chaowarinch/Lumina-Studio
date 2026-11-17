"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
}

export type AuthStatus = "loading" | "guest" | "signed-in";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

export const useAuth = create<AuthState>()(() => ({ status: "loading", user: null }));

function toAuthUser(u: User): AuthUser {
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    name: (m.full_name as string) || (m.name as string) || u.email?.split("@")[0] || "ผู้ใช้",
    avatarUrl: (m.avatar_url as string) || (m.picture as string) || null,
    email: u.email ?? null,
  };
}

let started = false;

/** เริ่มติดตามสถานะล็อกอิน (เรียกครั้งเดียวจาก AuthBootstrap) */
export function startAuthListener(): void {
  if (started) return;
  started = true;
  const sb = getSupabase();
  if (!sb) {
    useAuth.setState({ status: "guest", user: null });
    return;
  }
  sb.auth.onAuthStateChange((_event, session) => {
    useAuth.setState(
      session?.user ? { status: "signed-in", user: toAuthUser(session.user) } : { status: "guest", user: null },
    );
  });
}

/** รอจนรู้สถานะล็อกอิน */
export function whenAuthReady(): Promise<AuthState> {
  const s = useAuth.getState();
  if (s.status !== "loading") return Promise.resolve(s);
  return new Promise((resolve) => {
    const unsub = useAuth.subscribe((st) => {
      if (st.status !== "loading") {
        unsub();
        resolve(st);
      }
    });
  });
}

export async function signInWithGoogle(next: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "not-configured";
  const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  return error?.message ?? null;
}

export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "not-configured";
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
