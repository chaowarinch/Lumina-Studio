"use client";

import { create } from "zustand";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { addToCart, listCartIds, removeFromCart } from "./api";

interface MarketState {
  /** id สินค้าในตะกร้า */
  cart: string[];
  /** id สินค้าที่มี License ใช้งานได้ */
  owned: string[];
  cartOpen: boolean;
  loaded: boolean;
}

export const useMarket = create<MarketState>()(() => ({ cart: [], owned: [], cartOpen: false, loaded: false }));

export async function refreshMarket(): Promise<void> {
  const sb = getSupabase();
  if (!sb || useAuth.getState().status !== "signed-in") {
    useMarket.setState({ cart: [], owned: [], loaded: true });
    return;
  }
  try {
    const [cart, lic] = await Promise.all([
      listCartIds(),
      sb.from("licenses").select("product_id").eq("status", "active"),
    ]);
    useMarket.setState({ cart, owned: (lic.data ?? []).map((l) => l.product_id), loaded: true });
  } catch {
    useMarket.setState({ loaded: true });
  }
}

let started = false;
/** โหลดตะกร้า/สินค้าที่มีเมื่อสถานะล็อกอินเปลี่ยน */
export function startMarketSync(): void {
  if (started) return;
  started = true;
  let last = useAuth.getState().user?.id ?? null;
  void refreshMarket();
  useAuth.subscribe((s) => {
    const id = s.user?.id ?? null;
    if (id !== last && s.status !== "loading") {
      last = id;
      void refreshMarket();
    }
  });
}

export async function cartAdd(productId: string): Promise<void> {
  const prev = useMarket.getState().cart;
  if (prev.includes(productId)) return;
  useMarket.setState({ cart: [...prev, productId] });
  try {
    await addToCart(productId);
  } catch (e) {
    useMarket.setState({ cart: prev });
    throw e;
  }
}

export async function cartRemove(productId: string): Promise<void> {
  const prev = useMarket.getState().cart;
  useMarket.setState({ cart: prev.filter((id) => id !== productId) });
  try {
    await removeFromCart(productId);
  } catch (e) {
    useMarket.setState({ cart: prev });
    throw e;
  }
}
