import type { Metadata } from "next";
import { Suspense } from "react";
import { th } from "@/lib/i18n/th";
import { CheckoutApp } from "./CheckoutApp";

export const metadata: Metadata = { title: `${th.checkout.title} · ${th.app.name}` };

export default function Page() {
  return (
    <main className="mx-auto max-w-[720px] px-[max(4vw,16px)] pt-6 pb-16">
      <Suspense>
        <CheckoutApp />
      </Suspense>
    </main>
  );
}
