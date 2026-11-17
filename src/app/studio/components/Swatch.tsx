"use client";

import { useEffect, useState } from "react";
import { FX_MEDIA } from "@/engine/effects";
import type { EffectParams } from "@/engine/project/types";
import { ThumbnailRenderer } from "@/engine/renderer/thumbnails";

let thumbs: ThumbnailRenderer | null = null;

/** ภาพย่อเอฟเฟกต์ของเลเยอร์ */
export function Swatch({ fx, p }: { fx: number; p: EffectParams }) {
  const [thumb, setThumb] = useState({ key: "", url: "" });
  const key = `${fx}|${p.intensity}|${p.speed}|${p.hue}|${p.scale}|${p.opacity}|${p.feather}`;
  useEffect(() => {
    if (fx === FX_MEDIA) return;
    // หน่วงเล็กน้อย: ไม่สร้างภาพใหม่ทุกครั้งที่ลาก slider
    const t = setTimeout(() => {
      thumbs ??= new ThumbnailRenderer();
      setThumb({ key, url: thumbs.get(fx, p) });
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key ครอบคลุมค่าใน p แล้ว
  }, [key]);
  // ระหว่างรอภาพใหม่ แสดงภาพเดิมไว้ก่อน (ยกเว้นเลเยอร์สื่อ)
  const url = fx === FX_MEDIA ? "" : thumb.url;
  return (
    <span
      aria-hidden
      className="h-5 w-[30px] flex-none rounded bg-[#222] bg-cover bg-center"
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    />
  );
}
