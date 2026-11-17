"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { getOrder, type Order } from "@/lib/market/api";
import { formatBaht } from "@/lib/market/money";
import { th } from "@/lib/i18n/th";
import { PaymentResult } from "../../PaymentResult";
import { usePaymentPolling } from "../../usePaymentPolling";

type Loaded = Order & { items: { title: string; price_satang: number }[] };

/** ปลายทางหลัง 3-D Secure และหน้าดูคำสั่งซื้อ */
export function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth((s) => s.status);
  const [order, setOrder] = useState<Loaded | null | undefined>(undefined);

  useEffect(() => {
    if (auth !== "signed-in") return;
    getOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [auth, id]);

  const status = usePaymentPolling(order ? order.id : null, order ? order.status : null);

  if (auth === "guest") return <p className="text-mu">{th.library.loginPrompt}</p>;
  if (order === undefined) return <p className="text-mu">{th.checkout.checking}</p>;
  if (order === null) return <p className="text-mu">{th.checkout.orderNotFound}</p>;

  return (
    <>
      {status === "pending" ? (
        <p className="mb-6 text-center text-mu" role="status">
          {th.checkout.checking}
        </p>
      ) : (
        <div className="mb-6">
          <PaymentResult status={status ?? order.status} message={order.failure_message} />
        </div>
      )}
      <section className="rounded-xl border border-ln bg-pn p-4">
        <h3>
          {th.checkout.orderTitle} · {th.checkout.status[status ?? order.status]}
        </h3>
        <ul>
          {order.items.map((i) => (
            <li key={i.title} className="flex justify-between border-b border-ln py-1.5 last:border-0">
              <span>{i.title}</span>
              <span className="tabular-nums">{formatBaht(i.price_satang)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between font-bold">
          <span>{th.cart.total}</span>
          <span className="tabular-nums">{formatBaht(order.total_satang)}</span>
        </div>
      </section>
    </>
  );
}
