// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { MediaRegistry, type MediaEntry } from "./media";

const entry = (url = "blob:x"): MediaEntry => ({ el: document.createElement("img"), kind: "image", version: 1, url });

describe("MediaRegistry", () => {
  it("alias: id เดิมและ id ใหม่ชี้สื่อเดียวกัน ลบอันหนึ่งไม่กระทบอีกอัน", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const r = new MediaRegistry();
    const e = entry();
    r.set("local", e);
    r.alias("local", "uuid");
    expect(r.get("uuid")).toBe(e);
    r.remove("local");
    expect(r.get("uuid")).toBe(e);
    expect(revoke).not.toHaveBeenCalled();
    r.remove("uuid");
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });

  it("ไม่ revoke URL ที่ไม่ใช่ blob", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    revoke.mockClear();
    const r = new MediaRegistry();
    r.set("a", entry("https://cdn/x.png"));
    r.remove("a");
    expect(revoke).not.toHaveBeenCalled();
  });
});
