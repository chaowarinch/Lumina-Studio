"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { detachCloud } from "@/app/studio/cloud";
import { hydrateStudio } from "@/app/studio/store";
import { signOut, startAuthListener, useAuth } from "@/lib/auth/useAuth";
import { th } from "@/lib/i18n/th";

/** ปุ่มเข้าสู่ระบบ / รูปโปรไฟล์พร้อมเมนู */
export function AccountMenu() {
  const router = useRouter();
  const path = usePathname();
  const { status, user } = useAuth();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => startAuthListener(), []);

  if (status === "loading") return <span className="size-9" aria-hidden />;
  if (status === "guest" || !user) {
    if (path.startsWith("/login")) return null;
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn inline-flex shrink-0 items-center">
        {th.auth.login}
      </Link>
    );
  }

  const logout = async () => {
    menu.current?.removeAttribute("open");
    await signOut();
    detachCloud();
    hydrateStudio(true);
    router.push("/studio");
  };

  return (
    <details ref={menu} className="relative shrink-0">
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-ln bg-pn2 [&::-webkit-details-marker]:hidden"
        aria-label={th.auth.accountMenu}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- รูปโปรไฟล์จาก Google
          <img src={user.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-semibold">{user.name.slice(0, 1)}</span>
        )}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-ln bg-pn p-2 shadow-2xl">
        <div className="border-b border-ln px-2 pb-2">
          <div className="truncate font-semibold">{user.name}</div>
          {user.email && <div className="truncate text-[13px] text-mu">{user.email}</div>}
        </div>
        <Link
          href="/library"
          className="mt-1 block rounded-lg px-2 py-2 hover:bg-pn2"
          onClick={() => menu.current?.removeAttribute("open")}
        >
          {th.auth.myWork}
        </Link>
        <button className="block w-full rounded-lg px-2 py-2 text-left hover:bg-pn2" onClick={logout}>
          {th.auth.logout}
        </button>
      </div>
    </details>
  );
}
