import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/supabase/redirect";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

/** ปลายทางจาก Google OAuth: แลก code เป็น session แล้วกลับไปหน้าที่ตั้งใจไว้ */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (supabaseConfigured && code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const fail = new URL("/login", url.origin);
  fail.searchParams.set("error", "callback");
  fail.searchParams.set("next", next);
  return NextResponse.redirect(fail);
}
