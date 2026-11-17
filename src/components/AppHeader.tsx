"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudio } from "@/app/studio/store";
import { th } from "@/lib/i18n/th";
import { AccountMenu } from "./AccountMenu";
import { CartButton, CartDrawer } from "./market/CartDrawer";
import { MarketBootstrap } from "./market/MarketBootstrap";
import { supabaseConfigured } from "@/lib/supabase/env";

const NAV = [
  { href: "/studio", label: th.nav.studio },
  { href: "/market", label: th.nav.market },
  { href: "/library", label: th.nav.library },
  { href: "/creator", label: th.nav.creator },
] as const;

export function AppHeader() {
  const path = usePathname();
  const inStudio = path.startsWith("/studio");
  const name = useStudio((s) => s.project.name);
  const rename = useStudio((s) => s.renameProject);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3.5 border-b border-ln bg-[#0a0b0d] px-3.5 max-[600px]:h-auto max-[600px]:flex-wrap max-[600px]:p-2">
      <div className="flex items-center gap-2 font-bold tracking-wide whitespace-nowrap">
        <i
          aria-hidden
          className="size-[18px] rounded-full shadow-[0_0_14px_var(--color-ac)]"
          style={{ background: "radial-gradient(circle at 35% 35%,#fff 0 15%,var(--color-ac) 45%,transparent 72%)" }}
        />
        {th.app.name}
      </div>
      {inStudio && (
        <input
          type="text"
          aria-label={th.nav.projectName}
          value={name}
          onChange={(e) => rename(e.target.value)}
          className="field max-w-[200px] border-transparent bg-transparent hover:border-ln focus:border-ln max-[600px]:hidden"
        />
      )}
      <nav className="flex gap-1 overflow-x-auto">
        {NAV.map((n) => {
          const act = path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={act ? "page" : undefined}
              className={`btn ghost shrink-0 border-transparent ${act ? "!border-ln !bg-pn2 text-white" : ""}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {supabaseConfigured && (
        <>
          <MarketBootstrap />
          <CartButton />
          <CartDrawer />
        </>
      )}
      <AccountMenu />
    </header>
  );
}
