"use client";

import { parseProject } from "@/engine/project/schema";
import type { Surface } from "@/engine/project/types";

const KEY = "lumina.pendingImport";

/** เก็บพรีเซ็ตที่ซื้อไว้ แล้วให้ Studio นำเข้าเป็นเลเยอร์ใหม่เมื่อเปิด */
export function queuePresetImport(manifest: unknown, title: string): boolean {
  const r = parseProject(manifest);
  if (!r.ok || !r.project.surfaces.length) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ title, surfaces: r.project.surfaces }));
    return true;
  } catch {
    return false;
  }
}

export function takePendingImport(): { title: string; surfaces: Surface[] } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw) as { title: string; surfaces: unknown[] };
    const r = parseProject({ surfaces: v.surfaces });
    return r.ok ? { title: v.title, surfaces: r.project.surfaces } : null;
  } catch {
    return null;
  }
}
