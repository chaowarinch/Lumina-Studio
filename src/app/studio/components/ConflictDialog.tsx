"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { th } from "@/lib/i18n/th";
import { resolveConflictReload, resolveConflictSaveCopy, useCloud } from "../cloud";

/** แสดงเมื่อบันทึกไม่ได้เพราะมีการบันทึกจากแท็บ/อุปกรณ์อื่นก่อน */
export function ConflictDialog() {
  const router = useRouter();
  const conflict = useCloud((s) => s.status === "conflict");
  return (
    <Modal open={conflict} title={th.cloud.conflictTitle}>
      <p className="mb-4 text-mu">{th.cloud.conflictBody}</p>
      <div className="grid gap-2">
        <button
          className="btn pri"
          onClick={async () => {
            const id = await resolveConflictSaveCopy();
            if (id) router.replace(`/studio?p=${id}`);
          }}
        >
          {th.cloud.saveCopy}
        </button>
        <button className="btn" onClick={() => void resolveConflictReload()}>
          {th.cloud.reload}
        </button>
      </div>
    </Modal>
  );
}
