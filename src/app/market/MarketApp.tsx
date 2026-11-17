"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/market/ProductCard";
import { listProducts, type Product } from "@/lib/market/api";
import { supabaseConfigured } from "@/lib/supabase/env";
import { th } from "@/lib/i18n/th";

type SortKey = "new" | "lo" | "hi";

export function MarketApp() {
  const router = useRouter();
  const params = useSearchParams();
  const cat = params.get("cat") ?? "all";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortKey>("new");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    listProducts()
      .then(setProducts)
      .catch(() => setFailed(true));
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (products ?? []).filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (!term || `${p.title} ${p.creator_name} ${p.effect_label} ${th.market.categories[p.category]}`.toLowerCase().includes(term)),
    );
    return [...list].sort((a, b) =>
      sort === "lo" ? a.price_satang - b.price_satang : sort === "hi" ? b.price_satang - a.price_satang : a.sort_order - b.sort_order,
    );
  }, [products, cat, q, sort]);

  const setCat = (c: string) => router.replace(c === "all" ? "/market" : `/market?cat=${c}`, { scroll: false });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mb-1">{th.market.title}</h2>
          <p className="text-mu">{th.market.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            className="field w-[220px]"
            placeholder={th.market.search}
            aria-label={th.market.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="field w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="เรียงลำดับ">
            {(["new", "lo", "hi"] as const).map((k) => (
              <option key={k} value={k}>
                {th.market.sort[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-1.5" role="tablist" aria-label="หมวดหมู่">
        {[["all", th.market.all] as const, ...Object.entries(th.market.categories)].map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={cat === k}
            className={`btn min-h-8 rounded-[20px] text-[13px] ${cat === k ? "on" : ""}`}
            onClick={() => setCat(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {!supabaseConfigured ? (
        <Empty>{th.market.notConfigured}</Empty>
      ) : failed ? (
        <Empty>{th.market.loadFail}</Empty>
      ) : products === null ? (
        <Empty>{th.market.loading}</Empty>
      ) : shown.length === 0 ? (
        <Empty>{th.market.empty}</Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ln p-6 text-center text-mu">{children}</div>;
}
