"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Fallback = () => <div className="h-[calc(100vh-56px)] bg-stage" aria-busy />;

/** Studio ใช้ WebGL/localStorage จึงเรนเดอร์ฝั่ง client เท่านั้น */
const StudioApp = dynamic(() => import("./components/StudioApp"), { ssr: false, loading: Fallback });

export function StudioLoader() {
  return (
    <Suspense fallback={<Fallback />}>
      <StudioApp />
    </Suspense>
  );
}
