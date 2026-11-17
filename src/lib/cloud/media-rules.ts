/** ขนาดไฟล์สื่อสูงสุด 50 MB (ตรงกับ bucket "media" และ check ในฐานข้อมูล) */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export const MEDIA_TYPES: Readonly<Record<string, { kind: "image" | "video"; ext: string }>> = {
  "image/png": { kind: "image", ext: "png" },
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

export type MediaCheck =
  | { ok: true; kind: "image" | "video"; ext: string }
  | { ok: false; reason: "type" | "size" | "empty" };

export function checkMediaFile(f: { type: string; size: number }): MediaCheck {
  const t = MEDIA_TYPES[f.type];
  if (!t) return { ok: false, reason: "type" };
  if (f.size <= 0) return { ok: false, reason: "empty" };
  if (f.size > MAX_MEDIA_BYTES) return { ok: false, reason: "size" };
  return { ok: true, ...t };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string): boolean => UUID.test(s);

/** path ใน Storage: {user_id}/{asset_id}.{ext} — โฟลเดอร์แรกต้องเป็น user id (ตาม RLS) */
export function mediaPath(userId: string, assetId: string, ext: string): string {
  if (!isUuid(userId) || !isUuid(assetId)) throw new Error("invalid id");
  return `${userId}/${assetId}.${ext}`;
}

export function thumbnailPath(userId: string, projectId: string): string {
  if (!isUuid(userId) || !isUuid(projectId)) throw new Error("invalid id");
  return `${userId}/${projectId}.jpg`;
}

/** id สื่อทั้งหมดที่โปรเจกต์อ้างถึง (ไม่ซ้ำ) */
export function collectMediaIds(surfaces: readonly { media: string | null }[]): string[] {
  return [...new Set(surfaces.map((s) => s.media).filter((m): m is string => !!m))];
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
