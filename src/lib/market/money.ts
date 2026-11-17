/** แสดงราคาจากหน่วยสตางค์ เช่น 89000 → "฿890", 89050 → "฿890.50" */
export function formatBaht(satang: number): string {
  const baht = satang / 100;
  const frac = satang % 100 !== 0;
  return "฿" + baht.toLocaleString("th-TH", { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 });
}

export const sumSatang = (items: readonly { price_satang: number }[]): number =>
  items.reduce((a, i) => a + i.price_satang, 0);

/** Omise คิดขั้นต่ำ 20 บาท (ยอด 0 = ฟรี ไม่ต้องจ่าย) */
export const MIN_CHARGE_SATANG = 2000;
export const payable = (total: number) => total === 0 || total >= MIN_CHARGE_SATANG;

/** นับถอยหลังแบบ mm:ss */
export function countdown(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
