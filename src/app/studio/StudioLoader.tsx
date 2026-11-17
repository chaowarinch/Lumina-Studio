"use client";

import dynamic from "next/dynamic";

/** Studio ใช้ WebGL/localStorage จึงเรนเดอร์ฝั่ง client เท่านั้น */
const StudioApp = dynamic(() => import("./components/StudioApp"), {
  ssr: false,
  loading: () => <div className="h-[calc(100vh-56px)] bg-stage" aria-busy />,
});

export function StudioLoader() {
  return <StudioApp />;
}
