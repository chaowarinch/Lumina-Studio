// Omise (Opn Payments) REST API — ใช้เฉพาะฝั่ง server (Edge Functions) เพราะต้องใช้ secret key

export type ChargeStatus = "failed" | "reversed" | "expired" | "pending" | "successful";

export interface OmiseCharge {
  object: "charge";
  id: string;
  amount: number;
  currency: string;
  status: ChargeStatus;
  paid: boolean;
  refunded_amount?: number;
  authorize_uri?: string | null;
  expires_at?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  metadata?: Record<string, unknown>;
  source?: { type?: string; scannable_code?: { image?: { download_uri?: string } } } | null;
}

export interface CreateChargeInput {
  amount: number;
  currency: "thb";
  description: string;
  metadata: Record<string, string>;
  return_uri: string;
  card?: string;
  source?: { type: "promptpay" };
}

export interface OmiseClient {
  createCharge(input: CreateChargeInput): Promise<OmiseCharge>;
  retrieveCharge(id: string): Promise<OmiseCharge>;
}

export class OmiseError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

/** client ที่เรียก REST API จริง (Basic auth ด้วย secret key, body เป็น JSON) */
export function createOmiseClient(secretKey: string, base = "https://api.omise.co", fetchFn: typeof fetch = fetch): OmiseClient {
  const auth = "Basic " + btoa(secretKey + ":");
  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await fetchFn(base + path, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { object?: string; code?: string; message?: string };
    if (!res.ok || data.object === "error") {
      throw new OmiseError(data.code ?? "http_" + res.status, data.message ?? "Omise error", res.status);
    }
    return data as T;
  };
  return {
    createCharge: (input) => call<OmiseCharge>("POST", "/charges", input),
    retrieveCharge: (id) => {
      if (!/^chrg_[a-z0-9_]+$/i.test(id)) throw new OmiseError("invalid_charge", "invalid charge id", 400);
      return call<OmiseCharge>("GET", "/charges/" + encodeURIComponent(id));
    },
  };
}

export type ChargeOutcome = "paid" | "failed" | "expired" | "refunded" | "pending";

/** แปลงสถานะ charge ของ Omise เป็นสิ่งที่ต้องทำกับคำสั่งซื้อ */
export function chargeOutcome(c: Pick<OmiseCharge, "status" | "paid" | "amount" | "refunded_amount">): ChargeOutcome {
  if (c.status === "reversed" || (c.amount > 0 && (c.refunded_amount ?? 0) >= c.amount)) return "refunded";
  if (c.status === "successful" && c.paid) return "paid";
  if (c.status === "failed") return "failed";
  if (c.status === "expired") return "expired";
  return "pending";
}

export function qrImageOf(c: OmiseCharge): string | null {
  return c.source?.scannable_code?.image?.download_uri ?? null;
}
