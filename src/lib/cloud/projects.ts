"use client";

import { parseProject, serializeProject } from "@/engine/project/schema";
import type { Project } from "@/engine/project/types";
import { getSupabase, type Supabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { thumbnailPath } from "./media-rules";
import type { SaveResult } from "./save-queue";

export interface CloudProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
}

export interface CloudProject {
  id: string;
  version: number;
  project: Project;
}

const SIGNED_URL_TTL = 60 * 60;

function sb(): Supabase {
  const c = getSupabase();
  if (!c) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
  return c;
}

/** แยกความผิดพลาดจากเน็ตหลุดออกจากความผิดพลาดอื่น */
export function isNetworkError(e: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const m = e?.message ?? "";
  return /fetch|network|Load failed|timeout/i.test(m);
}

const toJson = (p: Project): Json => JSON.parse(serializeProject(p, undefined)).project as Json;

export async function listCloudProjects(): Promise<CloudProjectSummary[]> {
  const { data, error } = await sb()
    .from("projects")
    .select("id, name, updated_at, thumbnail_path")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const paths = data.map((r) => r.thumbnail_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await sb().storage.from("thumbnails").createSignedUrls(paths, SIGNED_URL_TTL);
    for (const s of signed ?? []) if (s.path && s.signedUrl && !s.error) urls.set(s.path, s.signedUrl);
  }
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_at,
    thumbnailPath: r.thumbnail_path,
    thumbnailUrl: r.thumbnail_path ? (urls.get(r.thumbnail_path) ?? null) : null,
  }));
}

export async function loadCloudProject(id: string): Promise<CloudProject | null> {
  const { data, error } = await sb().from("projects").select("id, name, data, version").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = parseProject(data.data);
  if (!r.ok) throw new Error("ข้อมูลโปรเจกต์เสีย: " + r.error);
  return { id: data.id, version: data.version, project: { ...r.project, name: data.name } };
}

export async function createCloudProject(userId: string, project: Project): Promise<CloudProject> {
  const id = crypto.randomUUID();
  const { data, error } = await sb()
    .from("projects")
    .insert({ id, name: project.name, data: toJson(project), thumbnail_path: thumbnailPath(userId, id) })
    .select("id, version")
    .single();
  if (error) throw error;
  return { id: data.id, version: data.version, project };
}

/** บันทึกแบบ optimistic concurrency: สำเร็จเฉพาะเมื่อ version ในฐานข้อมูลยังเท่าเดิม */
export async function saveCloudProject(
  id: string,
  project: Project,
  version: number,
): Promise<SaveResult & { version?: number }> {
  const { data, error } = await sb()
    .from("projects")
    .update({ name: project.name, data: toJson(project) })
    .eq("id", id)
    .eq("version", version)
    .select("version")
    .maybeSingle();
  if (error) return { ok: false, reason: isNetworkError(error) ? "network" : "error" };
  if (!data) return { ok: false, reason: "conflict" };
  return { ok: true, version: data.version };
}

export async function renameCloudProject(id: string, name: string): Promise<void> {
  const { data, error } = await sb().from("projects").select("data").eq("id", id).single();
  if (error) throw error;
  const d = { ...(data.data as Record<string, Json>), name };
  const { error: e2 } = await sb().from("projects").update({ name, data: d }).eq("id", id);
  if (e2) throw e2;
}

export async function duplicateCloudProject(userId: string, id: string, suffix: string): Promise<string> {
  const src = await loadCloudProject(id);
  if (!src) throw new Error("ไม่พบโปรเจกต์");
  const copy = await createCloudProject(userId, { ...src.project, name: src.project.name + suffix });
  await sb().storage.from("thumbnails").copy(thumbnailPath(userId, id), thumbnailPath(userId, copy.id)).catch(() => {});
  return copy.id;
}

export async function deleteCloudProject(id: string, thumb: string | null): Promise<void> {
  const { error } = await sb().from("projects").delete().eq("id", id);
  if (error) throw error;
  if (thumb) await sb().storage.from("thumbnails").remove([thumb]);
}

export async function uploadThumbnail(userId: string, projectId: string, jpeg: Blob): Promise<void> {
  await sb()
    .storage.from("thumbnails")
    .upload(thumbnailPath(userId, projectId), jpeg, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
}
