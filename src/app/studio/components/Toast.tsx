"use client";

import { useEffect, useState } from "react";
import { useStudio } from "../store";

export function Toast() {
  const toast = useStudio((s) => s.toast);
  const [hiddenKey, setHiddenKey] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setHiddenKey(toast.key), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast || hiddenKey === toast.key) return null;
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-60 max-w-[90vw] -translate-x-1/2 rounded-[10px] border border-ln bg-[#22262c] px-4 py-2.5"
    >
      {toast.msg}
    </div>
  );
}
