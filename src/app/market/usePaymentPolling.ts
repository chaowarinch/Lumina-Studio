"use client";

import { useEffect, useState } from "react";
import { syncOrder, type Order } from "@/lib/market/api";
import { refreshMarket } from "@/lib/market/store";

const FINAL = new Set(["paid", "failed", "expired", "refunded"]);

/** ถามสถานะคำสั่งซื้อทุก 4 วินาทีจนได้ผลสุดท้าย (นานสุด 15 นาที) */
export function usePaymentPolling(orderId: string | null, initial: Order["status"] | null) {
  const [status, setStatus] = useState<Order["status"] | null>(initial);

  useEffect(() => {
    if (!orderId || (initial && FINAL.has(initial))) return;
    let alive = true;
    const started = Date.now();
    const tick = async () => {
      try {
        const r = await syncOrder(orderId);
        if (!alive) return;
        setStatus(r.status);
        if (FINAL.has(r.status)) {
          if (r.status === "paid") void refreshMarket();
          return;
        }
      } catch {
        // ลองใหม่รอบถัดไป
      }
      if (alive && Date.now() - started < 15 * 60_000) timer = setTimeout(tick, 4000);
    };
    let timer = setTimeout(tick, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [orderId, initial]);

  return status;
}
