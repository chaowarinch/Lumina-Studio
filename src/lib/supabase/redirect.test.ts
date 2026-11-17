import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("อนุญาต path ภายใน", () => {
    expect(safeNextPath("/library")).toBe("/library");
    expect(safeNextPath("/studio?p=abc#x")).toBe("/studio?p=abc#x");
  });
  it("กัน open redirect", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil", "", null, undefined, "javascript:alert(1)"])
      expect(safeNextPath(bad)).toBe("/studio");
  });
});
