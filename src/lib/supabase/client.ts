"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

export type Supabase = SupabaseClient<Database>;

let client: Supabase | null = null;

/** Supabase client ฝั่งเบราว์เซอร์ (null ถ้ายังไม่ได้ตั้งค่า) — สิทธิ์ทั้งหมดคุมด้วย RLS */
export function getSupabase(): Supabase | null {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
