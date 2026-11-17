// ตรรกะของ Edge Functions แยกจาก runtime (Deno.serve / supabase-js) เพื่อทดสอบด้วย Vitest ได้
import { DOWNLOAD_TTL_SECONDS, packageFileName, signDownload, verifyDownload } from "./download-token.ts";
import { CORS_HEADERS, allowedOrigin, bearer, fail, isUuid, json } from "./http.ts";
import { chargeOutcome, OmiseError, qrImageOf, type OmiseCharge, type OmiseClient } from "./omise.ts";

export interface OrderRow {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  total_satang: number;
  payment_method: "promptpay" | "card" | "free";
  provider_charge_id: string | null;
  expires_at: string | null;
}

export class DbError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** สิ่งที่ handler ต้องใช้ — ใน production มาจาก supabase-js (service role) และ Omise จริง */
export interface Deps {
  /** ตรวจ JWT ของผู้ใช้ คืนค่า user id */
  getUserId(jwt: string): Promise<string | null>;
  /** เรียกฟังก์ชัน SQL (โยน DbError พร้อมข้อความ เช่น "cart_empty") */
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
  getOrder(id: string): Promise<OrderRow | null>;
  omise: OmiseClient;
  /** origin ของเว็บที่อนุญาต (ใช้สร้าง return_uri) */
  appOrigins: string[];
  /** URL ของ function download (สร้างลิงก์ดาวน์โหลด) */
  downloadUrl: string;
  downloadSecret: string;
  now?: () => number;
  log?: (msg: string, extra?: unknown) => void;
}

const preflight = (req: Request) => (req.method === "OPTIONS" ? new Response("ok", { headers: CORS_HEADERS }) : null);

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function requireUser(req: Request, deps: Deps): Promise<string | Response> {
  const jwt = bearer(req);
  const uid = jwt ? await deps.getUserId(jwt) : null;
  return uid ?? fail(401, "unauthorized");
}

/** ปรับสถานะคำสั่งซื้อตาม charge ล่าสุดจาก Omise (idempotent) */
export async function syncCharge(deps: Deps, charge: OmiseCharge): Promise<string> {
  const orderId = charge.metadata?.order_id;
  if (!isUuid(orderId)) return "ignored";
  if (charge.currency?.toLowerCase() !== "thb") return "ignored";
  const outcome = chargeOutcome(charge);
  switch (outcome) {
    case "paid":
      await deps.rpc("mark_order_paid", { p_order: orderId, p_charge: charge.id, p_amount: charge.amount });
      return "paid";
    case "refunded":
      await deps.rpc("mark_order_refunded", { p_order: orderId });
      return "refunded";
    case "failed":
    case "expired":
      await deps.rpc("mark_order_failed", {
        p_order: orderId,
        p_status: outcome,
        p_message: charge.failure_message ?? charge.failure_code ?? outcome,
      });
      return outcome;
    default:
      return "pending";
  }
}

const CART_ERRORS = ["cart_empty", "already_owned", "below_minimum"];

/** POST /checkout { method: "promptpay" | "card", token?, origin } */
export async function handleCheckout(req: Request, deps: Deps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(405, "method_not_allowed");
  const uid = await requireUser(req, deps);
  if (uid instanceof Response) return uid;

  const body = await readJson(req);
  const method = body.method;
  if (method !== "promptpay" && method !== "card") return fail(400, "invalid_method");
  if (method === "card" && (typeof body.token !== "string" || !/^tokn_[a-z0-9_]+$/i.test(body.token)))
    return fail(400, "invalid_token");
  const origin = allowedOrigin(body.origin, deps.appOrigins);
  if (!origin) return fail(400, "invalid_origin");

  let order: { order_id: string; total_satang: number };
  try {
    const rows = await deps.rpc<{ order_id: string; total_satang: number }[]>("create_order_from_cart", {
      p_user: uid,
      p_method: method,
    });
    order = rows[0];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const code = CART_ERRORS.find((c) => msg.includes(c));
    return code ? fail(409, code) : fail(500, "order_failed");
  }

  if (order.total_satang === 0) {
    await deps.rpc("mark_order_paid", { p_order: order.order_id, p_charge: null, p_amount: 0 });
    return json({ order_id: order.order_id, status: "paid" });
  }

  let charge: OmiseCharge;
  try {
    charge = await deps.omise.createCharge({
      amount: order.total_satang,
      currency: "thb",
      description: `LUMINA STUDIO order ${order.order_id}`,
      metadata: { order_id: order.order_id, user_id: uid },
      return_uri: `${origin}/market/orders/${order.order_id}`,
      ...(method === "card" ? { card: body.token as string } : { source: { type: "promptpay" as const } }),
    });
  } catch (e) {
    const message = e instanceof OmiseError ? e.message : "payment_failed";
    await deps.rpc("mark_order_failed", { p_order: order.order_id, p_status: "failed", p_message: message });
    deps.log?.("createCharge failed", message);
    return json({ order_id: order.order_id, status: "failed", error: "payment_failed", message }, 402);
  }

  await deps.rpc("attach_order_charge", {
    p_order: order.order_id,
    p_charge: charge.id,
    p_expires_at: charge.expires_at ?? null,
  });
  const result = await syncCharge(deps, charge);
  return json({
    order_id: order.order_id,
    status: result === "pending" ? "pending" : result,
    qr_image: method === "promptpay" ? qrImageOf(charge) : null,
    authorize_uri: method === "card" && result === "pending" ? (charge.authorize_uri ?? null) : null,
    expires_at: charge.expires_at ?? null,
    failure_message: charge.failure_message ?? null,
  });
}

/** POST /order-sync { order_id } — ถามสถานะล่าสุดจาก Omise (ใช้ระหว่างรอ QR / หลัง 3-D Secure) */
export async function handleOrderSync(req: Request, deps: Deps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(405, "method_not_allowed");
  const uid = await requireUser(req, deps);
  if (uid instanceof Response) return uid;
  const { order_id } = await readJson(req);
  if (!isUuid(order_id)) return fail(400, "invalid_order");

  let order = await deps.getOrder(order_id);
  if (!order || order.user_id !== uid) return fail(404, "not_found");
  if (order.status === "pending" && order.provider_charge_id) {
    try {
      await syncCharge(deps, await deps.omise.retrieveCharge(order.provider_charge_id));
      order = (await deps.getOrder(order_id)) ?? order;
    } catch (e) {
      deps.log?.("sync failed", e instanceof Error ? e.message : e);
    }
  }
  return json({ order_id: order.id, status: order.status });
}

/**
 * POST /payment-webhook — Omise แจ้งเหตุการณ์ (ไม่มี JWT)
 * ไม่เชื่อข้อมูลใน body: ดึง charge จาก Omise ใหม่ด้วย secret key ก่อนทุกครั้ง
 */
export async function handleWebhook(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== "POST") return fail(405, "method_not_allowed");
  const event = await readJson(req);
  const data = (event.data ?? {}) as { object?: string; id?: string; charge?: string };
  const chargeId = data.object === "charge" ? data.id : data.object === "refund" ? data.charge : undefined;
  if (typeof chargeId !== "string" || !chargeId.startsWith("chrg_")) return json({ ok: true, ignored: true });
  try {
    const charge = await deps.omise.retrieveCharge(chargeId);
    const result = await syncCharge(deps, charge);
    return json({ ok: true, result });
  } catch (e) {
    deps.log?.("webhook failed", e instanceof Error ? e.message : e);
    // 500 ให้ Omise ส่งซ้ำภายหลัง
    return fail(500, "webhook_failed");
  }
}

/**
 * POST /download { license_id } → { url, expires_at } (ลิงก์หมดอายุใน 10 นาที)
 * GET  /download?t=<token>      → ไฟล์สินค้า (นับจำนวนครั้ง/จำกัด 20 ครั้งต่อวัน)
 */
export async function handleDownload(req: Request, deps: Deps): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  const now = deps.now?.() ?? Date.now();

  if (req.method === "POST") {
    const uid = await requireUser(req, deps);
    if (uid instanceof Response) return uid;
    const { license_id } = await readJson(req);
    if (!isUuid(license_id)) return fail(400, "invalid_license");
    const exp = Math.floor(now / 1000) + DOWNLOAD_TTL_SECONDS;
    const token = await signDownload(deps.downloadSecret, { l: license_id, u: uid, e: exp });
    return json({ url: `${deps.downloadUrl}?t=${encodeURIComponent(token)}`, expires_at: new Date(exp * 1000).toISOString() });
  }

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    const claims = await verifyDownload(deps.downloadSecret, token, now / 1000);
    if (!claims) return fail(410, "link_expired");
    let rows: { product_id: string; title: string; manifest: unknown }[];
    try {
      rows = await deps.rpc("consume_download", { p_user: claims.u, p_license: claims.l });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("rate_limited")) return fail(429, "rate_limited");
      if (msg.includes("no_license")) return fail(403, "no_license");
      return fail(500, "download_failed");
    }
    const row = rows[0];
    if (!row) return fail(404, "not_found");
    return new Response(JSON.stringify(row.manifest, null, 1), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${packageFileName(row.title)}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return fail(405, "method_not_allowed");
}
