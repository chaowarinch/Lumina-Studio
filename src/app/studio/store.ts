"use client";

import { create } from "zustand";
import { paramsFor } from "@/engine/effects";
import { History } from "@/engine/history/history";
import { createSurface, duplicateSurface, sampleProject } from "@/engine/project/factory";
import { parseProject } from "@/engine/project/schema";
import type { Project, Surface } from "@/engine/project/types";
import { clampDuration } from "@/engine/timeline/timeline";
import { EFFECTS } from "@/engine/effects";
import { th } from "@/lib/i18n/th";

export type Tool = "warp" | "mask";

export interface StudioState {
  project: Project;
  selectedId: string | null;
  tool: Tool;
  guides: boolean;
  testPattern: boolean;
  refVisible: boolean;
  /** object URL ของภาพอ้างอิงที่ผู้ใช้เลือก (null = ภาพตัวอย่าง) */
  refUrl: string | null;
  /** index ของจุดควบคุมที่เลือก (-1 = ไม่มี) */
  activePt: number;
  playing: boolean;
  recordingLeft: number | null;
  toast: { msg: string; key: number } | null;
  canUndo: boolean;
  canRedo: boolean;
  hydrated: boolean;

  // ---- actions ----
  loadProject(p: Project, opts?: { keepHistory?: boolean }): void;
  renameProject(name: string): void;
  setDuration(d: number): void;
  select(id: string | null): void;
  setTool(t: Tool): void;
  setActivePt(i: number): void;
  set<K extends keyof UiFlags>(key: K, value: UiFlags[K]): void;
  showToast(msg: string): void;

  /** แก้ไขเลเยอร์โดยไม่บันทึกประวัติ (ใช้ระหว่าง gesture หรือค่าที่ไม่ต้อง undo) */
  patchSurface(id: string, patch: Partial<Surface> | ((s: Surface) => Partial<Surface>)): void;
  /** แก้ไขแบบครั้งเดียวพร้อมบันทึกประวัติ */
  commitSurface(id: string, patch: Partial<Surface> | ((s: Surface) => Partial<Surface>)): void;
  addSurface(fx: number): Surface;
  /** เพิ่มเลเยอร์จากพรีเซ็ต (เช่น สินค้าที่ซื้อ) */
  appendSurfaces(surfaces: Surface[]): void;
  duplicateSelected(): void;
  deleteSelected(): void;

  /** เริ่ม/จบการแก้ไขต่อเนื่อง (ลากจุด, เลื่อน slider) — บันทึก undo เมื่อจบถ้ามีการเปลี่ยนแปลง */
  beginGesture(): void;
  endGesture(): void;
  undo(): void;
  redo(): void;
}

type UiFlags = Pick<StudioState, "guides" | "testPattern" | "refVisible" | "refUrl" | "playing" | "recordingLeft">;

const history = new History<string>(60);
const snap = (p: Project) => JSON.stringify(p.surfaces);
let gestureBefore: string | null = null;
let toastKey = 0;

const mapSurface = (p: Project, id: string, patch: Partial<Surface> | ((s: Surface) => Partial<Surface>)): Project => ({
  ...p,
  surfaces: p.surfaces.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)),
});

export const useStudio = create<StudioState>()((set, get) => {
  /** ทำการแก้ไข surfaces พร้อมบันทึก undo */
  const commit = (fn: (p: Project) => Project, extra: Partial<StudioState> = {}) => {
    const before = get().project;
    const after = fn(before);
    history.record(snap(before), snap(after));
    set({ project: after, canUndo: history.canUndo, canRedo: history.canRedo, ...extra });
  };

  const restore = (json: string | null) => {
    if (json === null) return;
    const surfaces = JSON.parse(json) as Surface[];
    const sel = get().selectedId;
    set({
      project: { ...get().project, surfaces },
      selectedId: surfaces.some((s) => s.id === sel) ? sel : (surfaces[0]?.id ?? null),
      activePt: -1,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
    });
  };

  return {
    // โปรเจกต์จริงถูกโหลดใน hydrateStudio() ฝั่ง client เท่านั้น
    project: { name: "", dur: 10, surfaces: [] },
    selectedId: null,
    hydrated: false,
    tool: "warp",
    guides: true,
    testPattern: false,
    refVisible: true,
    refUrl: null,
    activePt: -1,
    playing: true,
    recordingLeft: null,
    toast: null,
    canUndo: false,
    canRedo: false,

    loadProject(p, opts) {
      set({ hydrated: true });
      if (opts?.keepHistory) {
        commit(() => p, { selectedId: p.surfaces[0]?.id ?? null, activePt: -1 });
      } else {
        history.clear();
        set({ project: p, selectedId: p.surfaces[0]?.id ?? null, activePt: -1, canUndo: false, canRedo: false });
      }
    },
    renameProject: (name) => set((s) => ({ project: { ...s.project, name } })),
    setDuration: (d) => set((s) => ({ project: { ...s.project, dur: clampDuration(d) } })),
    select: (id) => set((s) => (s.selectedId === id ? {} : { selectedId: id, activePt: -1 })),
    setTool: (tool) => set({ tool }),
    setActivePt: (activePt) => set({ activePt }),
    set: (key, value) => set({ [key]: value } as Partial<StudioState>),
    showToast: (msg) => set({ toast: { msg, key: ++toastKey } }),

    patchSurface: (id, patch) => set((s) => ({ project: mapSurface(s.project, id, patch) })),
    commitSurface: (id, patch) => commit((p) => mapSurface(p, id, patch)),

    addSurface(fx) {
      const p = get().project;
      const o = 0.05 * (p.surfaces.length % 5);
      const s = createSurface(`${EFFECTS[fx].label} ${p.surfaces.length + 1}`, fx, [0.3 + o, 0.25 + o, 0.62 + o, 0.7 + o]);
      commit((p) => ({ ...p, surfaces: [...p.surfaces, s] }), { selectedId: s.id, activePt: -1 });
      return s;
    },
    appendSurfaces(surfaces) {
      if (!surfaces.length) return;
      const taken = new Set(get().project.surfaces.map((x) => x.id));
      const fresh = surfaces.map((x) => (taken.has(x.id) ? { ...x, id: crypto.randomUUID().slice(0, 10) } : x));
      commit((p) => ({ ...p, surfaces: [...p.surfaces, ...fresh] }), { selectedId: fresh.at(-1)!.id, activePt: -1 });
    },
    duplicateSelected() {
      const s = get().project.surfaces.find((x) => x.id === get().selectedId);
      if (!s) return;
      const c = duplicateSurface(s, th.insp.copySuffix);
      commit((p) => ({ ...p, surfaces: [...p.surfaces, c] }), { selectedId: c.id, activePt: -1 });
    },
    deleteSelected() {
      const id = get().selectedId;
      if (!id) return;
      const rest = get().project.surfaces.filter((x) => x.id !== id);
      commit((p) => ({ ...p, surfaces: rest }), { selectedId: rest.at(-1)?.id ?? null, activePt: -1 });
      get().showToast(th.toast.deleted);
    },

    beginGesture() {
      if (gestureBefore === null) gestureBefore = snap(get().project);
    },
    endGesture() {
      if (gestureBefore === null) return;
      history.record(gestureBefore, snap(get().project));
      gestureBefore = null;
      set({ canUndo: history.canUndo, canRedo: history.canRedo });
    },
    undo() {
      get().endGesture();
      restore(history.undo(snap(get().project)));
    },
    redo() {
      get().endGesture();
      restore(history.redo(snap(get().project)));
    },
  };
});

export const selectedSurface = (s: StudioState): Surface | undefined =>
  s.project.surfaces.find((x) => x.id === s.selectedId);

/** เปลี่ยนเอฟเฟกต์ของเลเยอร์ (ใช้โทนสีเริ่มต้นของเอฟเฟกต์ใหม่ตามต้นแบบ) */
export function effectPatch(s: Surface, fx: number): Partial<Surface> {
  return { fx, p: { ...s.p, hue: paramsFor(fx).hue } };
}

// ---------------- autosave (localStorage) ----------------
const STORAGE_KEY = "lumina.studio.current";

/** โหลดงานล่าสุดจากเบราว์เซอร์ หรือโปรเจกต์ตัวอย่าง */
export function hydrateStudio(force = false): void {
  if (useStudio.getState().hydrated && !force) return;
  if (!restoreFromStorage()) useStudio.getState().loadProject(sampleProject());
}

function restoreFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const r = parseProject(JSON.parse(raw));
    if (!r.ok) return false;
    useStudio.getState().loadProject(r.project);
    return true;
  } catch {
    return false;
  }
}

/** autosave ลงเบราว์เซอร์ (เฉพาะเมื่อ shouldSave() เป็นจริง เช่น ไม่ได้เปิดโปรเจกต์บนคลาวด์) */
export function startAutosave(shouldSave: () => boolean = () => true): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useStudio.subscribe((s, prev) => {
    if (s.project === prev.project || !shouldSave()) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(useStudio.getState().project));
      } catch {
        // พื้นที่เต็มหรือถูกปิด: ข้าม
      }
    }, 400);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
