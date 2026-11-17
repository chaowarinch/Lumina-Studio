import type { Metadata } from "next";
import { Suspense } from "react";
import { th } from "@/lib/i18n/th";
import { MarketApp } from "./MarketApp";

export const metadata: Metadata = { title: `${th.market.title} · ${th.app.name}` };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-[max(4vw,16px)] pt-6 pb-16">
      <Suspense>
        <MarketApp />
      </Suspense>
    </main>
  );
}
