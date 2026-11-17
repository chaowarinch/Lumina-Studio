"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Product } from "@/lib/market/api";
import { formatBaht } from "@/lib/market/money";
import { th } from "@/lib/i18n/th";
import { useProductActions } from "./useProductActions";

/** การ์ดสินค้า: ภาพปก และเล่นวิดีโอตัวอย่างเมื่อชี้ */
export function ProductCard({ p }: { p: Product }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const a = useProductActions(p.id);
  const play = () => {
    setPlaying(true);
    void video.current?.play().catch(() => {});
  };
  const stop = () => {
    setPlaying(false);
    const v = video.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-ln bg-pn">
      <Link
        href={`/market/${p.slug}`}
        className="relative block aspect-video bg-black"
        onMouseEnter={play}
        onMouseLeave={stop}
        onFocus={play}
        onBlur={stop}
        aria-label={p.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ภาพปกสินค้า */}
        <img src={p.cover_url ?? ""} alt="" className="absolute inset-0 size-full object-cover" />
        {p.preview_url && (
          <video
            ref={video}
            src={p.preview_url}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 size-full object-cover transition-opacity ${playing ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2.5 pb-3">
        <div className="flex justify-between gap-2">
          <Link href={`/market/${p.slug}`} className="font-semibold hover:underline">
            {p.title}
          </Link>
          <span className="font-bold whitespace-nowrap">{p.price_satang ? formatBaht(p.price_satang) : th.market.free}</span>
        </div>
        <div className="text-[13px] text-mu">{th.market.by(p.creator_name)}</div>
        <div>
          <span className="rounded-[10px] border border-ln px-2 text-xs whitespace-nowrap text-mu">
            {th.market.categories[p.category] ?? p.category}
          </span>
        </div>
        <div className="mt-auto flex gap-1.5 pt-1">
          <Link href={`/market/${p.slug}`} className="btn flex flex-1 items-center justify-center">
            {th.market.details}
          </Link>
          {a.owned ? (
            <Link href="/library#downloads" className="btn flex flex-1 items-center justify-center">
              {th.market.owned}
            </Link>
          ) : a.inCart ? (
            <button className="btn flex-1" disabled>
              {th.market.inCart}
            </button>
          ) : (
            <button className="btn pri flex-1" disabled={a.busy} onClick={() => void a.add()}>
              {th.market.addToCart}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
