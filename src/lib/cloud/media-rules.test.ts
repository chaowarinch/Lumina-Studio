import { describe, expect, it } from "vitest";
import { MAX_MEDIA_BYTES, checkMediaFile, collectMediaIds, isUuid, mediaPath, thumbnailPath } from "./media-rules";

const U = "aaaaaaaa-0000-4000-8000-000000000001";
const A = "bbbbbbbb-0000-4000-8000-000000000002";

describe("media rules", () => {
  it("ตรวจชนิดและขนาดไฟล์", () => {
    expect(checkMediaFile({ type: "image/png", size: 10 })).toEqual({ ok: true, kind: "image", ext: "png" });
    expect(checkMediaFile({ type: "video/quicktime", size: MAX_MEDIA_BYTES })).toMatchObject({ ok: true, ext: "mov" });
    expect(checkMediaFile({ type: "video/mp4", size: MAX_MEDIA_BYTES + 1 })).toEqual({ ok: false, reason: "size" });
    expect(checkMediaFile({ type: "image/svg+xml", size: 10 })).toEqual({ ok: false, reason: "type" });
    expect(checkMediaFile({ type: "image/png", size: 0 })).toEqual({ ok: false, reason: "empty" });
  });

  it("path ขึ้นต้นด้วย user id และกัน path traversal", () => {
    expect(mediaPath(U, A, "png")).toBe(`${U}/${A}.png`);
    expect(thumbnailPath(U, A)).toBe(`${U}/${A}.jpg`);
    expect(() => mediaPath("../x", A, "png")).toThrow();
    expect(() => thumbnailPath(U, "a/b")).toThrow();
  });

  it("isUuid", () => {
    expect(isUuid(A)).toBe(true);
    expect(isUuid("k3j4h5g6f7")).toBe(false);
  });

  it("collectMediaIds ไม่ซ้ำและข้าม null", () => {
    expect(collectMediaIds([{ media: "a" }, { media: null }, { media: "a" }, { media: "b" }])).toEqual(["a", "b"]);
  });
});
