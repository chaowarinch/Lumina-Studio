"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProductsByIds, type Product } from "@/lib/market/api";
import { formatBaht, sumSatang } from "@/lib/market/money";
import { cartRemove, useMarket } from "@/lib/market/store";
import { th } from "@/lib/i18n/th";

/** ตะกร้าแบบแถบด้านขวา (ตามต้นแบบ) */
export function CartDrawer() {
  const open = useMarket((s) => s.cartOpen);
  const cart = useMarket((s) => s.cart);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getProductsByIds(cart)
      .then((p) => alive && setItems(cart.map((id) => p.find((x) => x.id === id)).filter((x): x is Product => !!x)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, cart]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && useMarket.setState({ cartOpen: false });
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  const shown = items.filter((i) => cart.includes(i.id));
  const close = () => useMarket.setState({ cartOpen: false });

  return (
    <aside
      aria-label={th.cart.title}
      aria-hidden={!open}
      inert={!open}
      className={`fixed top-14 right-0 bottom-0 z-40 flex w-[min(380px,100%)] flex-col border-l border-ln bg-pn p-4 transition-transform duration-200 motion-reduce:transition-none ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="m-0">{th.cart.title}</h3>
        <button className="btn ghost" onClick={close}>
          {th.cart.close}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ln p-6 text-center text-mu">{th.cart.empty}</div>
        ) : (
          shown.map((i) => (
            <div key={i.id} className="flex items-center gap-2.5 border-b border-ln py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- ภาพปกสินค้า */}
              <img src={i.cover_url ?? ""} alt="" className="aspect-video w-[72px] rounded-md bg-black object-cover" />
              <div className="flex-1">
                <Link href={`/market/${i.slug}`} onClick={close} className="font-semibold hover:underline">
                  {i.title}
                </Link>
                <div className="text-[13px] text-mu">{i.price_satang ? formatBaht(i.price_satang) : th.market.free}</div>
              </div>
              <button className="btn sm" onClick={() => void cartRemove(i.id).catch(() => {})}>
                {th.cart.remove}
              </button>
            </div>
          ))
        )}
      </div>
      <div className="my-3.5 flex justify-between font-bold">
        <span>{th.cart.total}</span>
        <span>{formatBaht(sumSatang(shown))}</span>
      </div>
      <Link
        href="/market/checkout"
        onClick={close}
        aria-disabled={!cart.length}
        className={`btn pri flex items-center justify-center ${cart.length ? "" : "pointer-events-none opacity-45"}`}
      >
        {th.cart.checkout}
      </Link>
    </aside>
  );
}

export function CartButton() {
  const n = useMarket((s) => s.cart.length);
  return (
    <button className="btn ghost shrink-0" onClick={() => useMarket.setState((s) => ({ cartOpen: !s.cartOpen }))}>
      {th.cart.open(n)}
    </button>
  );
}
