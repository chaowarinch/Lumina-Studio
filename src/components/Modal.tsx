"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** กล่องโต้ตอบแบบ modal (ใช้ <dialog> ของเบราว์เซอร์ จึงจัดการ focus/Esc ให้เอง) */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose?: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (!onClose) e.preventDefault();
        else onClose();
      }}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[14px] border border-ln bg-pn p-[18px] text-ink backdrop:bg-black/70"
      aria-label={title}
    >
      <h3 className="mb-2.5 text-base">{title}</h3>
      {children}
    </dialog>
  );
}
