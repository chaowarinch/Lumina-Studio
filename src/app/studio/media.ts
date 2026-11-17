"use client";

import { FX_MEDIA } from "@/engine/effects";
import { uid } from "@/engine/project/factory";
import { useAuth } from "@/lib/auth/useAuth";
import { checkMediaFile } from "@/lib/cloud/media-rules";
import { th } from "@/lib/i18n/th";
import { uploadWithProgress } from "./cloud";
import { pickFile, runtime } from "./runtime";
import { useStudio } from "./store";

/**
 * เลือกภาพ/วิดีโอให้เลเยอร์ แล้วเปลี่ยนเลเยอร์เป็นโหมดสื่อ
 * - ล็อกอินอยู่: อัปโหลดขึ้นคลาวด์ทันที (id = uuid ของ media_assets)
 * - ผู้เยี่ยมชม: ใช้ในเครื่องเท่านั้น (อัปโหลดภายหลังเมื่อบันทึกขึ้นคลาวด์)
 */
export async function pickMediaFor(surfaceId: string): Promise<void> {
  const f = await pickFile("image/*,video/*");
  if (!f) return;
  const check = checkMediaFile(f);
  if (!check.ok) {
    useStudio.getState().showToast(th.cloud.uploadFail[check.reason]);
    return;
  }

  const id = uid();
  try {
    await runtime.media.load(id, f);
  } catch {
    useStudio.getState().showToast(th.toast.mediaFail);
    return;
  }
  // แสดงผลได้ทันทีระหว่างอัปโหลด
  useStudio.getState().commitSurface(surfaceId, { media: id, fx: FX_MEDIA });

  if (useAuth.getState().status === "signed-in") {
    const assetId = await uploadWithProgress(f);
    if (!assetId) return;
    runtime.media.alias(id, assetId);
    const st = useStudio.getState();
    for (const s of st.project.surfaces) if (s.media === id) st.patchSurface(s.id, { media: assetId });
    st.showToast(th.cloud.uploadDone);
  }
}
