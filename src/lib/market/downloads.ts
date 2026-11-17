"use client";

import { downloadLink, FunctionError } from "./api";
import { queuePresetImport } from "./preset-import";

/** ดาวน์โหลดไฟล์ผ่านลิงก์ที่หมดอายุใน 10 นาที */
export async function downloadLicense(licenseId: string): Promise<void> {
  const { url } = await downloadLink(licenseId);
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}

/** ดึงพรีเซ็ตแล้วเตรียมนำเข้า Studio */
export async function prepareStudioImport(licenseId: string, title: string): Promise<void> {
  const { url } = await downloadLink(licenseId);
  const res = await fetch(url);
  if (!res.ok) throw new FunctionError(res.status === 429 ? "rate_limited" : "download_failed", res.status);
  if (!queuePresetImport(await res.json(), title)) throw new FunctionError("invalid_package", 0);
}
