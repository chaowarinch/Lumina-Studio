"use client";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabase, type Supabase } from "@/lib/supabase/client";
import type { LicenseRow, OrderRow, ProductRow } from "@/lib/supabase/database.types";

export type Product = Pick<
  ProductRow,
  | "id" | "slug" | "creator_name" | "title" | "description" | "category" | "effect_label"
  | "price_satang" | "cover_url" | "preview_url" | "sort_order" | "published_at"
>;

const PRODUCT_COLS =
  "id, slug, creator_name, title, description, category, effect_label, price_satang, cover_url, preview_url, sort_order, published_at";

function sb(): Supabase {
  const c = getSupabase();
  if (!c) throw new Error("Supabase ยังไม่ได้ตั้งค่า");
  return c;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await sb().from("products").select(PRODUCT_COLS).order("sort_order").limit(500);
  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await sb().from("products").select(PRODUCT_COLS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data, error } = await sb().from("products").select(PRODUCT_COLS).in("id", ids);
  if (error) throw error;
  return data;
}

// ---------------- ตะกร้า ----------------
export async function listCartIds(): Promise<string[]> {
  const { data, error } = await sb().from("cart_items").select("product_id").order("added_at");
  if (error) throw error;
  return data.map((r) => r.product_id);
}

export async function addToCart(productId: string): Promise<void> {
  const { error } = await sb().from("cart_items").insert({ product_id: productId });
  // 23505 = มีอยู่แล้ว
  if (error && error.code !== "23505") throw error;
}

export async function removeFromCart(productId: string): Promise<void> {
  const { error } = await sb().from("cart_items").delete().eq("product_id", productId);
  if (error) throw error;
}

// ---------------- License / คำสั่งซื้อ ----------------
export type License = Pick<LicenseRow, "id" | "license_key" | "product_id" | "order_id" | "status" | "created_at"> & {
  title: string;
};

export async function listLicenses(): Promise<License[]> {
  const { data, error } = await sb()
    .from("licenses")
    .select("id, license_key, product_id, order_id, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data.length) return [];
  // ชื่อสินค้า ณ วันที่ซื้อ (ยังอยู่แม้สินค้าจะเลิกขาย)
  const { data: items } = await sb()
    .from("order_items")
    .select("order_id, product_id, title")
    .in("order_id", [...new Set(data.map((l) => l.order_id))]);
  const title = new Map((items ?? []).map((i) => [`${i.order_id}:${i.product_id}`, i.title]));
  return data.map((l) => ({ ...l, title: title.get(`${l.order_id}:${l.product_id}`) ?? "" }));
}

export type Order = Pick<OrderRow, "id" | "status" | "total_satang" | "payment_method" | "created_at" | "paid_at" | "expires_at" | "failure_message">;

export async function listOrders(limit = 20): Promise<Order[]> {
  const { data, error } = await sb()
    .from("orders")
    .select("id, status, total_satang, payment_method, created_at, paid_at, expires_at, failure_message")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getOrder(id: string): Promise<(Order & { items: { title: string; price_satang: number }[] }) | null> {
  const { data, error } = await sb()
    .from("orders")
    .select("id, status, total_satang, payment_method, created_at, paid_at, expires_at, failure_message")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: items } = await sb().from("order_items").select("title, price_satang").eq("order_id", id);
  return { ...data, items: items ?? [] };
}

// ---------------- Edge Functions ----------------
export class FunctionError extends Error {
  constructor(public readonly code: string, public readonly status: number, message?: string) {
    super(message ?? code);
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T;
      // 402 = ชำระเงินไม่สำเร็จ แต่มีข้อมูลคำสั่งซื้อกลับมา
      if (res.status === 402) return j;
      throw new FunctionError(j.error ?? "unknown", res.status, j.message);
    }
    throw new FunctionError("network", 0, error.message);
  }
  return data as T;
}

export interface CheckoutResult {
  order_id: string;
  status: "pending" | "paid" | "failed" | "expired";
  qr_image?: string | null;
  authorize_uri?: string | null;
  expires_at?: string | null;
  failure_message?: string | null;
  error?: string;
  message?: string;
}

export const checkout = (body: { method: "promptpay" | "card"; token?: string }) =>
  invoke<CheckoutResult>("checkout", { ...body, origin: location.origin });

export const syncOrder = (orderId: string) =>
  invoke<{ order_id: string; status: Order["status"] }>("order-sync", { order_id: orderId });

export const downloadLink = (licenseId: string) =>
  invoke<{ url: string; expires_at: string }>("download", { license_id: licenseId });
