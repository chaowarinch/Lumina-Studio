import { describe, expect, it, vi } from "vitest";
import { signDownload, verifyDownload, packageFileName } from "./download-token.ts";
import { DbError, handleCheckout, handleDownload, handleOrderSync, handleWebhook, type Deps, type OrderRow } from "./handlers.ts";
import { allowedOrigin, parseOrigins } from "./http.ts";
import { chargeOutcome, createOmiseClient, type OmiseCharge } from "./omise.ts";

const USER = "aaaaaaaa-0000-4000-8000-000000000001";
const ORDER = "11111111-0000-4000-8000-000000000001";
const LICENSE = "22222222-0000-4000-8000-000000000002";

const charge = (o: Partial<OmiseCharge> = {}): OmiseCharge => ({
  object: "charge", id: "chrg_test_1", amount: 128000, currency: "thb", status: "pending", paid: false,
  metadata: { order_id: ORDER }, expires_at: "2026-11-19T00:00:00Z",
  source: { type: "promptpay", scannable_code: { image: { download_uri: "https://cdn.omise.co/qr.svg" } } },
  ...o,
});

function makeDeps(over: Partial<Deps> = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  let order: OrderRow = {
    id: ORDER, user_id: USER, status: "pending", total_satang: 128000, payment_method: "promptpay",
    provider_charge_id: "chrg_test_1", expires_at: null,
  };
  const deps: Deps = {
    getUserId: async (jwt) => (jwt === "good" ? USER : null),
    rpc: (async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === "create_order_from_cart") return [{ order_id: ORDER, total_satang: 128000, item_count: 2 }];
      if (fn === "mark_order_paid") order = { ...order, status: "paid" };
      if (fn === "consume_download") return [{ product_id: "p", title: "Neon Facade Outline", manifest: { app: "LUMINA STUDIO" } }];
      return null;
    }) as Deps["rpc"],
    getOrder: async (id) => (id === ORDER ? order : null),
    omise: { createCharge: vi.fn(async () => charge()), retrieveCharge: vi.fn(async () => charge()) },
    appOrigins: ["http://localhost:3000"],
    downloadUrl: "https://x.supabase.co/functions/v1/download",
    downloadSecret: "secret",
    ...over,
  };
  return { deps, calls, getOrder: () => order };
}

const post = (body: unknown, jwt: string | null = "good") =>
  new Request("https://fn/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });

describe("chargeOutcome", () => {
  it("แปลงสถานะ", () => {
    expect(chargeOutcome({ status: "successful", paid: true, amount: 100 })).toBe("paid");
    expect(chargeOutcome({ status: "successful", paid: false, amount: 100 })).toBe("pending");
    expect(chargeOutcome({ status: "pending", paid: false, amount: 100 })).toBe("pending");
    expect(chargeOutcome({ status: "failed", paid: false, amount: 100 })).toBe("failed");
    expect(chargeOutcome({ status: "expired", paid: false, amount: 100 })).toBe("expired");
    expect(chargeOutcome({ status: "reversed", paid: false, amount: 100 })).toBe("refunded");
    expect(chargeOutcome({ status: "successful", paid: true, amount: 100, refunded_amount: 100 })).toBe("refunded");
    expect(chargeOutcome({ status: "successful", paid: true, amount: 100, refunded_amount: 50 })).toBe("paid");
  });
});

describe("origin / omise client", () => {
  it("allowedOrigin กัน return_uri ไปเว็บอื่น", () => {
    const list = parseOrigins("http://localhost:3000, https://lumina.example/ ,bad");
    expect(list).toEqual(["http://localhost:3000", "https://lumina.example"]);
    expect(allowedOrigin("https://lumina.example", list)).toBe("https://lumina.example");
    expect(allowedOrigin("https://evil.example", list)).toBeNull();
    expect(allowedOrigin(123, list)).toBeNull();
  });

  it("createOmiseClient ส่ง Basic auth + JSON และแปลง error", async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe("Basic " + btoa("skey_test_x:"));
      expect(JSON.parse(init.body as string)).toMatchObject({ amount: 2000, source: { type: "promptpay" } });
      return new Response(JSON.stringify({ object: "error", code: "invalid_amount", message: "amount too low" }), { status: 400 });
    });
    const c = createOmiseClient("skey_test_x", "https://api", fetchFn as unknown as typeof fetch);
    await expect(
      c.createCharge({ amount: 2000, currency: "thb", description: "", metadata: {}, return_uri: "x", source: { type: "promptpay" } }),
    ).rejects.toMatchObject({ code: "invalid_amount" });
    expect(() => c.retrieveCharge("../../accounts")).toThrow();
  });
});

describe("handleCheckout", () => {
  it("ต้องล็อกอิน", async () => {
    expect((await handleCheckout(post({ method: "promptpay", origin: "http://localhost:3000" }, null), makeDeps().deps)).status).toBe(401);
    expect((await handleCheckout(post({ method: "promptpay", origin: "http://localhost:3000" }, "bad"), makeDeps().deps)).status).toBe(401);
  });

  it("ตรวจ input", async () => {
    const { deps } = makeDeps();
    expect((await handleCheckout(post({ method: "bitcoin", origin: "http://localhost:3000" }), deps)).status).toBe(400);
    expect((await handleCheckout(post({ method: "card", origin: "http://localhost:3000" }), deps)).status).toBe(400);
    expect((await handleCheckout(post({ method: "promptpay", origin: "https://evil.example" }), deps)).status).toBe(400);
  });

  it("PromptPay: ใช้ยอดจากฐานข้อมูล คืน QR และผูก charge", async () => {
    const { deps, calls } = makeDeps();
    const res = await handleCheckout(post({ method: "promptpay", origin: "http://localhost:3000", amount: 1 }), deps);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ order_id: ORDER, status: "pending", qr_image: "https://cdn.omise.co/qr.svg" });
    expect(deps.omise.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 128000, currency: "thb", source: { type: "promptpay" }, return_uri: `http://localhost:3000/market/orders/${ORDER}` }),
    );
    expect(calls.map((c) => c.fn)).toEqual(["create_order_from_cart", "attach_order_charge"]);
  });

  it("บัตรที่จ่ายสำเร็จทันที → paid", async () => {
    const { deps, calls } = makeDeps({
      omise: { createCharge: vi.fn(async () => charge({ status: "successful", paid: true, source: null })), retrieveCharge: vi.fn() },
    });
    const body = await (await handleCheckout(post({ method: "card", token: "tokn_test_1", origin: "http://localhost:3000" }), deps)).json();
    expect(body.status).toBe("paid");
    expect(calls.find((c) => c.fn === "mark_order_paid")?.args).toEqual({ p_order: ORDER, p_charge: "chrg_test_1", p_amount: 128000 });
  });

  it("บัตรที่ต้องยืนยัน 3-D Secure → คืน authorize_uri", async () => {
    const { deps } = makeDeps({
      omise: { createCharge: vi.fn(async () => charge({ authorize_uri: "https://pay.omise.co/3ds", source: null })), retrieveCharge: vi.fn() },
    });
    const body = await (await handleCheckout(post({ method: "card", token: "tokn_test_1", origin: "http://localhost:3000" }), deps)).json();
    expect(body).toMatchObject({ status: "pending", authorize_uri: "https://pay.omise.co/3ds", qr_image: null });
  });

  it("บัตรถูกปฏิเสธ → failed", async () => {
    const { deps } = makeDeps({
      omise: { createCharge: vi.fn(async () => charge({ status: "failed", failure_message: "insufficient funds", source: null })), retrieveCharge: vi.fn() },
    });
    const body = await (await handleCheckout(post({ method: "card", token: "tokn_test_1", origin: "http://localhost:3000" }), deps)).json();
    expect(body).toMatchObject({ status: "failed", failure_message: "insufficient funds" });
  });

  it("Omise error → บันทึก failed และตอบ 402", async () => {
    const { OmiseError } = await import("./omise.ts");
    const { deps, calls } = makeDeps({
      omise: { createCharge: vi.fn(async () => { throw new OmiseError("invalid_card", "card declined", 400); }), retrieveCharge: vi.fn() },
    });
    const res = await handleCheckout(post({ method: "card", token: "tokn_x", origin: "http://localhost:3000" }), deps);
    expect(res.status).toBe(402);
    expect(calls.at(-1)).toMatchObject({ fn: "mark_order_failed", args: { p_status: "failed", p_message: "card declined" } });
  });

  it("ตะกร้าว่าง / มีแล้ว → 409", async () => {
    const { deps } = makeDeps({ rpc: (async () => { throw new DbError("already_owned"); }) as Deps["rpc"] });
    const res = await handleCheckout(post({ method: "promptpay", origin: "http://localhost:3000" }), deps);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_owned");
  });

  it("ยอด 0 บาท → paid โดยไม่เรียก Omise", async () => {
    const { deps } = makeDeps({
      rpc: (async (fn: string) => (fn === "create_order_from_cart" ? [{ order_id: ORDER, total_satang: 0 }] : null)) as Deps["rpc"],
    });
    const body = await (await handleCheckout(post({ method: "promptpay", origin: "http://localhost:3000" }), deps)).json();
    expect(body.status).toBe("paid");
    expect(deps.omise.createCharge).not.toHaveBeenCalled();
  });
});

describe("handleOrderSync", () => {
  it("ดึงสถานะจาก Omise แล้วอัปเดต", async () => {
    const t = makeDeps({ omise: { createCharge: vi.fn(), retrieveCharge: vi.fn(async () => charge({ status: "successful", paid: true })) } });
    const body = await (await handleOrderSync(post({ order_id: ORDER }), t.deps)).json();
    expect(body.status).toBe("paid");
  });

  it("ดูคำสั่งซื้อของคนอื่นไม่ได้", async () => {
    const t = makeDeps({ getUserId: async () => "bbbbbbbb-0000-4000-8000-000000000002" });
    expect((await handleOrderSync(post({ order_id: ORDER }), t.deps)).status).toBe(404);
  });
});

describe("handleWebhook", () => {
  it("ไม่เชื่อ body: ดึง charge จาก Omise ใหม่", async () => {
    const t = makeDeps({ omise: { createCharge: vi.fn(), retrieveCharge: vi.fn(async () => charge({ status: "pending" })) } });
    // body อ้างว่าจ่ายแล้ว แต่ Omise บอกว่ายัง pending
    const res = await handleWebhook(post({ key: "charge.complete", data: { object: "charge", id: "chrg_test_1", status: "successful", paid: true } }, null), t.deps);
    expect((await res.json()).result).toBe("pending");
    expect(t.calls.some((c) => c.fn === "mark_order_paid")).toBe(false);
  });

  it("charge.complete ที่จ่ายจริง → paid", async () => {
    const t = makeDeps({ omise: { createCharge: vi.fn(), retrieveCharge: vi.fn(async () => charge({ status: "successful", paid: true })) } });
    await handleWebhook(post({ key: "charge.complete", data: { object: "charge", id: "chrg_test_1" } }, null), t.deps);
    expect(t.getOrder().status).toBe("paid");
  });

  it("refund.create → ยกเลิก License", async () => {
    const t = makeDeps({ omise: { createCharge: vi.fn(), retrieveCharge: vi.fn(async () => charge({ status: "successful", paid: true, refunded_amount: 128000 })) } });
    await handleWebhook(post({ key: "refund.create", data: { object: "refund", charge: "chrg_test_1" } }, null), t.deps);
    expect(t.calls.at(-1)?.fn).toBe("mark_order_refunded");
  });

  it("event อื่นถูกข้าม / error ชั่วคราว → 500 ให้ส่งซ้ำ", async () => {
    const t = makeDeps();
    expect((await (await handleWebhook(post({ key: "customer.create", data: { object: "customer", id: "cust_1" } }, null), t.deps)).json()).ignored).toBe(true);
    const t2 = makeDeps({ omise: { createCharge: vi.fn(), retrieveCharge: vi.fn(async () => { throw new Error("timeout"); }) } });
    expect((await handleWebhook(post({ data: { object: "charge", id: "chrg_x" } }, null), t2.deps)).status).toBe(500);
  });
});

describe("download", () => {
  it("token: ตรวจลายเซ็นและวันหมดอายุ", async () => {
    const tok = await signDownload("s", { l: LICENSE, u: USER, e: 1000 });
    expect(await verifyDownload("s", tok, 999)).toEqual({ l: LICENSE, u: USER, e: 1000 });
    expect(await verifyDownload("s", tok, 1001)).toBeNull();
    expect(await verifyDownload("other", tok, 999)).toBeNull();
    const [p, sig] = tok.split(".");
    const forged = btoa(JSON.stringify({ l: LICENSE, u: "someone-else", e: 1000 })).replace(/=+$/, "");
    expect(await verifyDownload("s", `${forged}.${sig}`, 999)).toBeNull();
    expect(await verifyDownload("s", p, 999)).toBeNull();
    expect(packageFileName("Neon Facade / Outline")).toBe("Neon_Facade_Outline.lumina.json");
  });

  it("POST สร้างลิงก์ 10 นาที → GET ได้ไฟล์ → หมดอายุแล้วใช้ไม่ได้", async () => {
    let now = 1_800_000_000_000;
    const t = makeDeps({ now: () => now });
    const { url, expires_at } = await (await handleDownload(post({ license_id: LICENSE }), t.deps)).json();
    expect(new Date(expires_at).getTime() - now).toBe(600_000);
    const res = await handleDownload(new Request(url), t.deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("Neon_Facade_Outline.lumina.json");
    expect(t.calls.at(-1)).toEqual({ fn: "consume_download", args: { p_user: USER, p_license: LICENSE } });
    now += 601_000;
    expect((await handleDownload(new Request(url), t.deps)).status).toBe(410);
  });

  it("ไม่มี License / เกินจำนวน", async () => {
    const t = makeDeps({ rpc: (async () => { throw new DbError("rate_limited"); }) as Deps["rpc"] });
    const { url } = await (await handleDownload(post({ license_id: LICENSE }), t.deps)).json();
    expect((await handleDownload(new Request(url), t.deps)).status).toBe(429);
    expect((await handleDownload(post({ license_id: LICENSE }, null), t.deps)).status).toBe(401);
  });
});
