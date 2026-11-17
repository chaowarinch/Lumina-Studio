"use client";

import { AudioReactive } from "@/engine/audio/analyser";
import { MediaRegistry } from "@/engine/renderer/media";
import type { Renderer } from "@/engine/renderer/renderer";

/**
 * สถานะที่เปลี่ยนทุกเฟรม — เก็บนอก React เพื่อไม่ให้ re-render ทุกเฟรม
 * คอมโพเนนต์ที่ต้องแสดงผล (เวลา, ระดับเสียง) subscribe ผ่าน onTick
 */
export const runtime = {
  t: 0,
  level: 0,
  renderer: null as Renderer | null,
  media: new MediaRegistry(),
  audio: new AudioReactive(),
};

type TickListener = () => void;
const listeners = new Set<TickListener>();

export function onTick(fn: TickListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitTick(): void {
  listeners.forEach((fn) => fn());
}

/** เปิดหน้าต่างเลือกไฟล์ */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
