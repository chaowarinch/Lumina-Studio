/// <reference lib="deno.ns" />
// สร้าง Deps จริงสำหรับ Edge Functions (Deno) — service role ใช้เฉพาะฝั่ง server ตรงนี้เท่านั้น
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { DbError, type Deps, type OrderRow } from "./handlers.ts";
import { parseOrigins } from "./http.ts";
import { createOmiseClient } from "./omise.ts";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

/** service role key: รองรับทั้งคีย์แบบเดิมและ SUPABASE_SECRET_KEYS แบบใหม่ */
function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
  const k = keys.default ?? Object.values(keys)[0];
  if (!k) throw new Error("missing service role key");
  return k;
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let cached: Promise<Deps> | null = null;

export function getDeps(): Promise<Deps> {
  cached ??= (async () => {
    const url = env("SUPABASE_URL");
    const key = serviceKey();
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // public URL ของ function (ภายใน container SUPABASE_URL อาจเป็น host ภายใน)
    const publicBase = Deno.env.get("PUBLIC_FUNCTIONS_URL") ?? `${url}/functions/v1`;
    return {
      async getUserId(jwt) {
        const { data, error } = await admin.auth.getUser(jwt);
        return error ? null : (data.user?.id ?? null);
      },
      async rpc(fn, args) {
        const { data, error } = await admin.rpc(fn, args);
        if (error) throw new DbError(error.message);
        return data;
      },
      async getOrder(id) {
        const { data, error } = await admin
          .from("orders")
          .select("id, user_id, status, total_satang, payment_method, provider_charge_id, expires_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw new DbError(error.message);
        return data as OrderRow | null;
      },
      omise: createOmiseClient(env("OMISE_SECRET_KEY"), Deno.env.get("OMISE_API_BASE") ?? "https://api.omise.co"),
      appOrigins: parseOrigins(env("APP_ORIGINS")),
      downloadUrl: `${publicBase}/download`,
      // ใช้ DOWNLOAD_SIGNING_SECRET ถ้าตั้งไว้ ไม่งั้นสร้างจาก service role key (ไม่ออกนอก server)
      downloadSecret: Deno.env.get("DOWNLOAD_SIGNING_SECRET") ?? (await sha256Hex("lumina-download:" + key)),
      log: (msg, extra) => console.error(msg, extra ?? ""),
    } satisfies Deps;
  })();
  return cached;
}
