"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { checkout, FunctionError, getProductsByIds, type CheckoutResult, type Product } from "@/lib/market/api";
import { countdown, formatBaht, payable, sumSatang } from "@/lib/market/money";
import { OMISE_PUBLIC_KEY, requestCardToken } from "@/lib/market/omise-js";
import { refreshMarket, useMarket } from "@/lib/market/store";
import { th } from "@/lib/i18n/th";
import { usePaymentPolling } from "../usePaymentPolling";
import { PaymentResult } from "../PaymentResult";

type Method = "promptpay" | "card";

export function CheckoutApp() {
  const router = useRouter();
  const auth = useAuth((s) => s.status);
  const cart = useMarket((s) => s.cart);
  const loaded = useMarket((s) => s.loaded);
  const [items, setItems] = useState<Product[] | null>(null);
  const [method, setMethod] = useState<Method>("promptpay");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    if (auth === "guest") router.replace("/login?next=/market/checkout");
  }, [auth, router]);

  useEffect(() => {
    if (!loaded || result) return;
    let alive = true;
    getProductsByIds(cart)
      .then((p) => alive && setItems(cart.map((id) => p.find((x) => x.id === id)).filter((x): x is Product => !!x)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [cart, loaded, result]);

  const total = sumSatang(items ?? []);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      let token: string | undefined;
      if (method === "card" && total > 0) {
        if (!OMISE_PUBLIC_KEY) throw new FunctionError("noKey", 0);
        const t = await requestCardToken(total, th.checkout.pay(formatBaht(total))).catch(() => {
          throw new FunctionError("omise", 0);
        });
        if (!t) return;
        token = t;
      }
      const r = await checkout({ method, token });
      if (r.authorize_uri) {
        // 3-D Secure: Omise จะส่งกลับมาที่ /market/orders/<id>
        window.location.assign(r.authorize_uri);
        return;
      }
      setResult(r);
      if (r.status === "paid") void refreshMarket();
    } catch (e) {
      const code = e instanceof FunctionError ? e.code : "unknown";
      setError(th.checkout.errors[code] ?? th.checkout.errors.unknown);
      if (code === "already_owned") void refreshMarket();
    } finally {
      setBusy(false);
    }
  };

  if (result) return <PaymentView result={result} onRetry={() => setResult(null)} />;

  return (
    <>
      <h2 className="mb-4">{th.checkout.title}</h2>
      <p className="mb-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-[13px] text-warn">{th.checkout.testMode}</p>

      <section className="mb-5 rounded-xl border border-ln bg-pn p-4">
        {items === null ? (
          <p className="text-mu">{th.market.loading}</p>
        ) : items.length === 0 ? (
          <div className="text-center text-mu">
            <p className="mb-3">{th.cart.empty}</p>
            <Link href="/market" className="btn inline-flex items-center">
              {th.downloads.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul>
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 border-b border-ln py-2 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ภาพปกสินค้า */}
                  <img src={i.cover_url ?? ""} alt="" className="aspect-video w-[72px] rounded-md bg-black object-cover" />
                  <span className="flex-1">{i.title}</span>
                  <span className="tabular-nums">{i.price_satang ? formatBaht(i.price_satang) : th.market.free}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between text-lg font-bold">
              <span>
                {th.cart.total} · {th.checkout.items(items.length)}
              </span>
              <span className="tabular-nums">{formatBaht(total)}</span>
            </div>
          </>
        )}
      </section>

      {items && items.length > 0 && (
        <>
          {total > 0 && (
            <fieldset className="mb-4 grid gap-2">
              <legend className="mb-2 font-semibold">{th.checkout.method}</legend>
              {(
                [
                  ["promptpay", th.checkout.promptpay, th.checkout.promptpayNote],
                  ["card", th.checkout.card, th.checkout.cardNote],
                ] as const
              ).map(([k, label, note]) => (
                <label
                  key={k}
                  className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 text-[15px] text-ink ${method === k ? "border-ac bg-[#221714]" : "border-ln"}`}
                >
                  <input type="radio" name="method" value={k} checked={method === k} onChange={() => setMethod(k)} />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="text-[13px] text-mu">{note}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {error && (
            <p role="alert" className="mb-3 rounded-lg border border-ac/50 bg-ac/10 p-3 text-ac2">
              {error}
            </p>
          )}
          <button className="btn pri w-full py-3 text-base" disabled={busy || !payable(total)} onClick={() => void pay()}>
            {busy ? th.checkout.processing : total === 0 ? th.checkout.getFree : th.checkout.pay(formatBaht(total))}
          </button>
        </>
      )}
    </>
  );
}

function PaymentView({ result, onRetry }: { result: CheckoutResult; onRetry: () => void }) {
  const status = usePaymentPolling(result.order_id, result.status);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (status !== "pending") return <PaymentResult status={status ?? "failed"} message={result.failure_message ?? result.message} onRetry={onRetry} />;

  const left = result.expires_at ? new Date(result.expires_at).getTime() - now : null;
  return (
    <div className="mx-auto max-w-[420px] text-center">
      <h2 className="mb-2">{th.checkout.scanTitle}</h2>
      <p className="mb-4 text-mu">{th.checkout.scanBody}</p>
      {result.qr_image ? (
        // eslint-disable-next-line @next/next/no-img-element -- QR จาก Omise
        <img src={result.qr_image} alt="PromptPay QR" className="mx-auto mb-3 w-full max-w-[320px] rounded-lg bg-white p-3" />
      ) : null}
      <p className="mb-1 font-semibold" role="status">
        {th.checkout.waiting}
      </p>
      {left !== null && <p className="mb-4 text-[13px] text-mu tabular-nums">{th.checkout.expiresIn(countdown(left))}</p>}
      <p className="mb-4 text-[13px] text-warn">{th.checkout.testMode}</p>
      <button className="btn" onClick={onRetry}>
        {th.checkout.cancel}
      </button>
    </div>
  );
}
