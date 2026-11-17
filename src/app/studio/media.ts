"use client";

import { FX_MEDIA } from "@/engine/effects";
import { uid } from "@/engine/project/factory";
import { th } from "@/lib/i18n/th";
import { pickFile, runtime } from "./runtime";
import { useStudio } from "./store";

/** เลือกภาพ/วิดีโอให้เลเยอร์ แล้วเปลี่ยนเลเยอร์เป็นโหมดสื่อ */
export async function pickMediaFor(surfaceId: string): Promise<void> {
  const f = await pickFile("image/*,video/*");
  if (!f) return;
  const id = uid();
  try {
    await runtime.media.load(id, f);
  } catch {
    useStudio.getState().showToast(th.toast.mediaFail);
    return;
  }
  // ไม่ลบสื่อเก่าออกจาก registry เพราะ undo อาจย้อนกลับไปใช้
  useStudio.getState().commitSurface(surfaceId, { media: id, fx: FX_MEDIA });
}
