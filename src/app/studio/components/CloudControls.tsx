"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { supabaseConfigured } from "@/lib/supabase/env";
import { th } from "@/lib/i18n/th";
import { saveAsNewCloudProject, saveNow, useCloud } from "../cloud";

const STATUS_COLOR: Record<string, string> = {
  saved: "bg-ok",
  saving: "bg-warn",
  pending: "bg-warn",
  offline: "bg-mu",
  error: "bg-ac",
  conflict: "bg-ac",
  idle: "bg-mu",
};

/** สถานะการบันทึกและปุ่มบันทึกขึ้นคลาวด์ในแถบเครื่องมือ */
export function CloudControls() {
  const router = useRouter();
  const auth = useAuth((s) => s.status);
  const projectId = useCloud((s) => s.projectId);
  const status = useCloud((s) => s.status);
  const upload = useCloud((s) => s.upload);

  const createCloud = async () => {
    const id = await saveAsNewCloudProject();
    if (id) router.replace(`/studio?p=${id}`);
  };

  const label = projectId ? th.cloud.status[status] : th.cloud.status.local;
  const dot = projectId ? STATUS_COLOR[status] : "bg-mu";

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-mu" role="status" aria-live="polite">
        <i className={`inline-block size-2 rounded-full ${dot}`} aria-hidden />
        {upload ? th.cloud.uploading(upload.name, upload.pct) : label}
      </span>
      {projectId ? (
        <button className="btn" onClick={() => void saveNow()} disabled={status === "saving" || status === "conflict"}>
          {th.cloud.saveNow}
        </button>
      ) : auth === "signed-in" ? (
        <button className="btn" onClick={createCloud}>
          {th.cloud.saveToCloud}
        </button>
      ) : auth === "guest" && supabaseConfigured ? (
        <Link className="btn inline-flex items-center" href="/login?next=/studio">
          {th.cloud.loginToSave}
        </Link>
      ) : null}
    </div>
  );
}
