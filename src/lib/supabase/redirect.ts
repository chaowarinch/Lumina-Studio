/**
 * ตรวจปลายทางหลังล็อกอิน: อนุญาตเฉพาะ path ภายในเว็บ กัน open redirect
 * เช่น "//evil.com" หรือ "https://evil.com" → "/studio"
 */
export function safeNextPath(next: string | null | undefined, fallback = "/studio"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const u = new URL(next, "http://local.invalid");
    if (u.origin !== "http://local.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
