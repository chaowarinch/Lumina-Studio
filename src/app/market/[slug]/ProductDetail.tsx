"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProductActions } from "@/components/market/useProductActions";
import { getProductBySlug, type Product } from "@/lib/market/api";
import { formatBaht } from "@/lib/market/money";
import { supabaseConfigured } from "@/lib/supabase/env";
import { th } from "@/lib/i18n/th";

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [p, setP] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) return;
    getProductBySlug(slug)
      .then((x) => {
        setP(x);
        if (x) document.title = `${x.title} · ${th.app.name}`;
      })
      .catch(() => setP(null));
  }, [slug]);

  return (
    <>
      <Link href="/market" className="mb-4 inline-block text-mu hover:text-ink">
        {th.market.back}
      </Link>
      {!supabaseConfigured ? (
        <p className="text-mu">{th.market.notConfigured}</p>
      ) : p === undefined ? (
        <p className="text-mu">{th.market.loading}</p>
      ) : p === null ? (
        <p className="text-mu">{th.market.notFound}</p>
      ) : (
        <Detail p={p} />
      )}
    </>
  );
}

function Detail({ p }: { p: Product }) {
  const a = useProductActions(p.id);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <video
          src={p.preview_url ?? undefined}
          poster={p.cover_url ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="aspect-video w-full rounded-lg bg-black"
        />
        <p className="hint mt-2">{th.market.previewNote}</p>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="mb-1">{p.title}</h2>
          <div className="text-mu">
            {th.market.by(p.creator_name)} · {th.market.categories[p.category] ?? p.category}
            {p.effect_label ? ` · ${th.market.effect(p.effect_label)}` : ""}
          </div>
        </div>
        <p>{p.description}</p>
        <div className="text-[28px] font-bold">{p.price_satang ? formatBaht(p.price_satang) : th.market.free}</div>
        {a.owned ? (
          <Link href="/library#downloads" className="btn pri flex items-center justify-center py-2.5">
            {th.market.owned} · {th.market.useInStudio}
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn pri py-2.5" disabled={a.busy} onClick={() => void a.buyNow()}>
              {a.signedIn ? th.market.buyNow : th.market.loginToBuy}
            </button>
            <button className="btn py-2.5" disabled={a.busy || a.inCart} onClick={() => void a.add()}>
              {a.inCart ? th.market.inCart : th.market.addToCart}
            </button>
          </div>
        )}
        {a.error && (
          <p role="alert" className="text-ac2">
            {th.market.actionFail}
          </p>
        )}
        <div className="rounded-xl border border-ln bg-pn p-4">
          <h3>{th.market.whatYouGet}</h3>
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-mu">
            {th.market.whatYouGetList.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
