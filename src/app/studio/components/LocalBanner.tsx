"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { th } from "@/lib/i18n/th";
import { saveAsNewCloudProject, useCloud } from "../cloud";
import { useStudio } from "../store";

const KEY = "lumina.localBannerDismissed";

const readDismissed = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** ล็อกอินแล้วแต่ยังทำงานในโหมดเบราว์เซอร์ → ชวนบันทึกขึ้นคลาวด์ */
export function LocalBanner() {
  const router = useRouter();
  const signedIn = useAuth((s) => s.status === "signed-in");
  const local = useCloud((s) => s.projectId === null && !s.opening);
  const hasWork = useStudio((s) => s.project.surfaces.length > 0);
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!signedIn || !local || !hasWork || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-ln bg-[#221714] px-3 py-2 text-[13px]">
      <span className="flex-1">{th.cloud.localBanner}</span>
      <button
        className="btn sm pri"
        onClick={async () => {
          const id = await saveAsNewCloudProject();
          if (id) router.replace(`/studio?p=${id}`);
        }}
      >
        {th.cloud.saveToCloud}
      </button>
      <button className="btn sm ghost" onClick={dismiss}>
        {th.cloud.dismiss}
      </button>
    </div>
  );
}
