// ลิงก์ดาวน์โหลดแบบมีวันหมดอายุ: token = base64url(payload).base64url(HMAC-SHA256(payload))

export const DOWNLOAD_TTL_SECONDS = 10 * 60;

export interface DownloadClaims {
  /** license id */
  l: string;
  /** user id */
  u: string;
  /** หมดอายุ (unix seconds) */
  e: number;
}

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function signDownload(secret: string, claims: DownloadClaims): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  return payload + "." + b64url(await hmac(secret, payload));
}

export async function verifyDownload(secret: string, token: string, nowSec = Date.now() / 1000): Promise<DownloadClaims | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!timingSafeEqual(fromB64url(sig), await hmac(secret, payload))) return null;
    const c = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as DownloadClaims;
    if (typeof c.l !== "string" || typeof c.u !== "string" || typeof c.e !== "number") return null;
    return c.e > nowSec ? c : null;
  } catch {
    return null;
  }
}

/** ชื่อไฟล์ดาวน์โหลด (ASCII สำหรับ Content-Disposition) */
export function packageFileName(title: string): string {
  return (title.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "lumina-preset") + ".lumina.json";
}
