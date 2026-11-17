"use client";

import type { MediaRegistry } from "@/engine/renderer/media";
import { getSupabase } from "@/lib/supabase/client";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { checkMediaFile, isUuid, mediaPath, type MediaCheck } from "./media-rules";

/** อายุ signed URL ของสื่อ (วินาที) — ยาวพอสำหรับการแสดงงานหนึ่งรอบ */
const MEDIA_URL_TTL = 6 * 60 * 60;

export class MediaUploadError extends Error {
  constructor(public readonly reason: Exclude<MediaCheck, { ok: true }>["reason"] | "auth" | "upload") {
    super(reason);
  }
}

/** PUT ไฟล์ขึ้น Storage ด้วย XHR เพื่อรายงานความคืบหน้า */
function putObject(path: string, file: Blob, token: string, onProgress?: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/media/${path.split("/").map(encodeURIComponent).join("/")}`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/** อัปโหลดสื่อและบันทึกข้อมูลไฟล์ คืนค่า asset id (uuid) */
export async function uploadMedia(
  userId: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<{ id: string; kind: "image" | "video" }> {
  const check = checkMediaFile(file);
  if (!check.ok) throw new MediaUploadError(check.reason);
  const sb = getSupabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  if (!sb || !token) throw new MediaUploadError("auth");

  const id = crypto.randomUUID();
  const path = mediaPath(userId, id, check.ext);
  try {
    await putObject(path, file, token, onProgress);
  } catch {
    throw new MediaUploadError("upload");
  }
  const { error } = await sb.from("media_assets").insert({
    id,
    kind: check.kind,
    mime_type: file.type,
    size_bytes: file.size,
    storage_path: path,
    file_name: file.name.slice(0, 255),
  });
  if (error) {
    await sb.storage.from("media").remove([path]);
    throw new MediaUploadError("upload");
  }
  return { id, kind: check.kind };
}

/**
 * โหลดสื่อบนคลาวด์ที่โปรเจกต์อ้างถึงเข้า MediaRegistry
 * คืนค่า id ที่โหลดไม่ได้ (ไฟล์ถูกลบหรือไม่มีสิทธิ์)
 */
export async function resolveCloudMedia(ids: string[], registry: MediaRegistry): Promise<string[]> {
  const sb = getSupabase();
  const want = ids.filter((id) => isUuid(id) && !registry.get(id));
  if (!sb || !want.length) return [];
  const { data, error } = await sb.from("media_assets").select("id, storage_path, kind").in("id", want);
  if (error) return want;
  const { data: signed } = await sb.storage.from("media").createSignedUrls(
    data.map((r) => r.storage_path),
    MEDIA_URL_TTL,
  );
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  const missing = new Set(want);
  await Promise.all(
    data.map(async (r) => {
      const url = urlByPath.get(r.storage_path);
      if (!url) return;
      try {
        await registry.loadUrl(r.id, url, r.kind);
        missing.delete(r.id);
      } catch {
        // ปล่อยให้อยู่ใน missing
      }
    }),
  );
  return [...missing];
}
