"use client";

import Link from "next/link";
import type { Order } from "@/lib/market/api";
import { th } from "@/lib/i18n/th";

export function PaymentResult({ status, message, onRetry }: { status: Order["status"]; message?: string | null; onRetry?: () => void }) {
  if (status === "paid")
    return (
      <div className="mx-auto max-w-[480px] rounded-xl border border-ok/50 bg-ok/10 p-6 text-center">
        <h2 className="mb-2">✓ {th.checkout.paidTitle}</h2>
        <p className="mb-4 text-mu">{th.checkout.paidBody}</p>
        <Link href="/library#downloads" className="btn pri inline-flex items-center">
          {th.checkout.goDownloads}
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-[480px] rounded-xl border border-ac/50 bg-ac/10 p-6 text-center">
      <h2 className="mb-2">{status === "expired" ? th.checkout.expiredTitle : th.checkout.failedTitle}</h2>
      {message && <p className="mb-4 text-mu">{message}</p>}
      {onRetry ? (
        <button className="btn pri" onClick={onRetry}>
          {th.checkout.tryAgain}
        </button>
      ) : (
        <Link href="/market/checkout" className="btn pri inline-flex items-center">
          {th.checkout.tryAgain}
        </Link>
      )}
    </div>
  );
}
