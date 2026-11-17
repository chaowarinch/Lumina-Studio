"use client";

import { create } from "zustand";
import type { Project } from "@/engine/project/types";
import { useAuth } from "@/lib/auth/useAuth";
import { collectMediaIds, isUuid } from "@/lib/cloud/media-rules";
import { MediaUploadError, resolveCloudMedia, uploadMedia } from "@/lib/cloud/media";
import { createCloudProject, loadCloudProject, saveCloudProject, uploadThumbnail } from "@/lib/cloud/projects";
import { SaveQueue, type SaveStatus } from "@/lib/cloud/save-queue";
import { th } from "@/lib/i18n/th";
import { runtime } from "./runtime";
import { useStudio } from "./store";

interface CloudState {
  /** โปรเจกต์บนคลาวด์ที่เปิดอยู่ (null = เก็บในเบราว์เซอร์) */
  projectId: string | null;
  version: number;
  status: SaveStatus;
  /** กำลังเปิดโปรเจกต์จากคลาวด์ */
  opening: boolean;
  upload: { name: string; pct: number } | null;
}

export const useCloud = create<CloudState>()(() => ({
  projectId: null,
  version: 0,
  status: "idle",
  opening: false,
  upload: null,
}));

const THUMB_INTERVAL_MS = 30_000;
let lastThumbAt = 0;

// ---------------------------------------------------------------------------
// สื่อ
// ---------------------------------------------------------------------------

/** อัปโหลดไฟล์ขึ้นคลาวด์พร้อมแสดงความคืบหน้า คืนค่า asset id หรือ null ถ้าล้มเหลว */
export async function uploadWithProgress(file: File): Promise<string | null> {
  const user = useAuth.getState().user;
  if (!user) return null;
  useCloud.setState({ upload: { name: file.name.slice(0, 30), pct: 0 } });
  try {
    const { id } = await uploadMedia(user.id, file, (f) =>
      useCloud.setState({ upload: { name: file.name.slice(0, 30), pct: Math.round(f * 100) } }),
    );
    return id;
  } catch (e) {
    const reason = e instanceof MediaUploadError ? e.reason : "upload";
    useStudio.getState().showToast(th.cloud.uploadFail[reason]);
    return null;
  } finally {
    useCloud.setState({ upload: null });
  }
}

/**
 * อัปโหลดสื่อที่ยังอยู่ในเครื่อง (เลือกไว้ตอนยังไม่ล็อกอิน) แล้วเปลี่ยน id ในโปรเจกต์
 * คืนค่าโปรเจกต์ล่าสุดหลังเปลี่ยน id
 */
async function ensureMediaUploaded(): Promise<Project> {
  const ids = collectMediaIds(useStudio.getState().project.surfaces).filter((id) => !isUuid(id));
  for (const localId of ids) {
    const file = runtime.media.get(localId)?.file;
    if (!file) continue;
    const assetId = await uploadWithProgress(file);
    if (!assetId) continue;
    runtime.media.alias(localId, assetId);
    const st = useStudio.getState();
    for (const s of st.project.surfaces) if (s.media === localId) st.patchSurface(s.id, { media: assetId });
  }
  return useStudio.getState().project;
}

/** โหลดสื่อบนคลาวด์ที่โปรเจกต์ปัจจุบันอ้างถึง */
export async function resolveProjectMedia(): Promise<void> {
  if (useAuth.getState().status !== "signed-in") return;
  const missing = await resolveCloudMedia(collectMediaIds(useStudio.getState().project.surfaces), runtime.media);
  if (missing.length) useStudio.getState().showToast(th.cloud.mediaMissing(missing.length));
}

// ---------------------------------------------------------------------------
// ภาพหน้าปก
// ---------------------------------------------------------------------------

function captureThumbnail(): Promise<Blob | null> {
  const src = runtime.renderer?.canvas;
  if (!src) return Promise.resolve(null);
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 270;
  c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
}

async function maybeUploadThumbnail(force = false) {
  const user = useAuth.getState().user;
  const id = useCloud.getState().projectId;
  if (!user || !id) return;
  if (!force && Date.now() - lastThumbAt < THUMB_INTERVAL_MS) return;
  lastThumbAt = Date.now();
  const blob = await captureThumbnail();
  if (blob) await uploadThumbnail(user.id, id, blob).catch(() => {});
}

// ---------------------------------------------------------------------------
// เปิด / บันทึก
// ---------------------------------------------------------------------------

const queue = new SaveQueue(
  async () => {
    const { projectId, version } = useCloud.getState();
    if (!projectId) return { ok: true };
    const project = await ensureMediaUploaded();
    const r = await saveCloudProject(projectId, project, version);
    if (r.ok && r.version !== undefined) {
      useCloud.setState({ version: r.version });
      void maybeUploadThumbnail();
    }
    return r;
  },
  { delay: 2000, retryDelay: 5000, onStatus: (status) => useCloud.setState({ status }) },
);

/** เปิดโปรเจกต์จากคลาวด์ คืนค่า false ถ้าไม่พบหรือไม่มีสิทธิ์ */
export async function openCloudProject(id: string): Promise<boolean> {
  useCloud.setState({ opening: true });
  try {
    const cp = isUuid(id) ? await loadCloudProject(id) : null;
    if (!cp) {
      useStudio.getState().showToast(th.cloud.notFound);
      return false;
    }
    queue.resolveConflict();
    useCloud.setState({ projectId: cp.id, version: cp.version, status: "saved" });
    useStudio.getState().loadProject(cp.project);
    runtime.t = 0;
    void resolveProjectMedia();
    return true;
  } catch {
    useStudio.getState().showToast(th.cloud.openFail);
    return false;
  } finally {
    useCloud.setState({ opening: false });
  }
}

/** บันทึกโปรเจกต์ปัจจุบันเป็นโปรเจกต์ใหม่บนคลาวด์ คืนค่า id */
export async function saveAsNewCloudProject(nameSuffix = ""): Promise<string | null> {
  const user = useAuth.getState().user;
  if (!user) return null;
  try {
    const project = await ensureMediaUploaded();
    const named = { ...project, name: (project.name || th.library.newName) + nameSuffix };
    const cp = await createCloudProject(user.id, named);
    queue.resolveConflict();
    useCloud.setState({ projectId: cp.id, version: cp.version, status: "saved" });
    if (nameSuffix) useStudio.getState().renameProject(named.name);
    await maybeUploadThumbnail(true);
    useStudio.getState().showToast(th.cloud.created);
    return cp.id;
  } catch {
    useStudio.getState().showToast(th.cloud.createFail);
    return null;
  }
}

export function saveNow(): Promise<void> {
  lastThumbAt = 0;
  queue.markDirty();
  return queue.flush();
}

/** แก้ conflict: โหลดเวอร์ชันล่าสุดจากคลาวด์ */
export async function resolveConflictReload(): Promise<void> {
  const id = useCloud.getState().projectId;
  queue.resolveConflict();
  if (id) await openCloudProject(id);
}

/** แก้ conflict: บันทึกงานในหน้านี้เป็นโปรเจกต์ใหม่ */
export function resolveConflictSaveCopy(): Promise<string | null> {
  queue.resolveConflict();
  return saveAsNewCloudProject(th.cloud.copySuffix);
}

/** กลับไปโหมดเก็บในเบราว์เซอร์ (เช่น ออกจากระบบ) */
export function detachCloud(): void {
  queue.resolveConflict();
  useCloud.setState({ projectId: null, version: 0, status: "idle" });
}

export const hasUnsavedCloudChanges = () => queue.hasUnsaved;

/** ติดตามการแก้ไขแล้ว autosave ขึ้นคลาวด์ */
export function startCloudSync(): () => void {
  const unsub = useStudio.subscribe((s, prev) => {
    if (s.project !== prev.project && useCloud.getState().projectId && !useCloud.getState().opening) queue.markDirty();
  });
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (!queue.hasUnsaved) return;
    void queue.flush();
    e.preventDefault();
  };
  addEventListener("beforeunload", beforeUnload);
  return () => {
    unsub();
    removeEventListener("beforeunload", beforeUnload);
    void queue.flush();
  };
}
