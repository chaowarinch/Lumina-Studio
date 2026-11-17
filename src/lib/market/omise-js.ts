"use client";

/** Omise.js — ฟอร์มบัตรแบบ pre-built (เลขบัตรส่งตรงไป Omise ไม่ผ่าน server ของเรา) */
interface OmiseCardApi {
  configure(opts: { publicKey: string }): void;
  open(opts: {
    amount: number;
    currency: string;
    defaultPaymentMethod: string;
    otherPaymentMethods?: string;
    frameLabel?: string;
    submitLabel?: string;
    locale?: string;
    onCreateTokenSuccess: (token: string) => void;
    onFormClosed?: () => void;
  }): void;
}

declare global {
  interface Window {
    OmiseCard?: OmiseCardApi;
  }
}

export const OMISE_PUBLIC_KEY = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? "";
const SRC = "https://cdn.omise.co/omise.js";
let loading: Promise<OmiseCardApi> | null = null;

export function loadOmiseCard(): Promise<OmiseCardApi> {
  if (window.OmiseCard) return Promise.resolve(window.OmiseCard);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.OmiseCard ? resolve(window.OmiseCard) : reject(new Error("OmiseCard missing")));
    s.onerror = () => {
      loading = null;
      reject(new Error("load failed"));
    };
    document.head.append(s);
  });
  return loading;
}

/** เปิดฟอร์มบัตร คืนค่า token (tokn_...) หรือ null ถ้าผู้ใช้ปิดฟอร์ม */
export async function requestCardToken(amountSatang: number, submitLabel: string): Promise<string | null> {
  const card = await loadOmiseCard();
  card.configure({ publicKey: OMISE_PUBLIC_KEY });
  return new Promise((resolve) => {
    let done = false;
    card.open({
      amount: amountSatang,
      currency: "THB",
      defaultPaymentMethod: "credit_card",
      frameLabel: "LUMINA STUDIO",
      submitLabel,
      locale: "th",
      onCreateTokenSuccess: (token) => {
        done = true;
        resolve(token.startsWith("tokn_") ? token : null);
      },
      onFormClosed: () => {
        if (!done) resolve(null);
      },
    });
  });
}
