/** ความยาววิดีโอสูงสุดที่ส่งออก (วินาที) */
export const MAX_WEBM_SECONDS = 30;

/** ชื่อไฟล์ปลอดภัย (เก็บตัวอักษรไทยไว้) */
export function safeFileName(name: string, ext: string): string {
  const base = (name || "lumina").replace(/[^\w฀-๿-]+/g, "_").slice(0, 40) || "lumina";
  return `${base}.${ext}`;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

export function webmSupported(canvas: HTMLCanvasElement): boolean {
  return typeof MediaRecorder !== "undefined" && typeof canvas.captureStream === "function";
}

/** บันทึก canvas เป็น WebM ตามจำนวนวินาที; onTick รายงานวินาทีที่เหลือ */
export function recordWebm(
  canvas: HTMLCanvasElement,
  seconds: number,
  onTick?: (left: number) => void,
): Promise<Blob> {
  const dur = Math.max(1, Math.min(MAX_WEBM_SECONDS, Math.ceil(seconds)));
  const mimeType = ["video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 8e6 });
  const chunks: Blob[] = [];
  return new Promise((resolve, reject) => {
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onerror = () => reject(new Error("MediaRecorder error"));
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    rec.start(250);
    let left = dur;
    onTick?.(left);
    const iv = setInterval(() => {
      left--;
      onTick?.(left);
      if (left <= 0) {
        clearInterval(iv);
        rec.stop();
      }
    }, 1000);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
