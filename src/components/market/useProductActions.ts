"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { cartAdd, useMarket } from "@/lib/market/store";

/** สถานะและการกระทำของสินค้าหนึ่งชิ้น (ใส่ตะกร้า / ซื้อเลย) */
export function useProductActions(productId: string) {
  const router = useRouter();
  const path = usePathname();
  const signedIn = useAuth((s) => s.status === "signed-in");
  const inCart = useMarket((s) => s.cart.includes(productId));
  const owned = useMarket((s) => s.owned.includes(productId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const requireLogin = () => {
    router.push(`/login?next=${encodeURIComponent(path)}`);
    return false;
  };

  const add = async (): Promise<boolean> => {
    if (!signedIn) return requireLogin();
    setBusy(true);
    setError(false);
    try {
      await cartAdd(productId);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const buyNow = async () => {
    if (inCart || (await add())) router.push("/market/checkout");
  };

  return { signedIn, inCart, owned, busy, error, add, buyNow };
}
