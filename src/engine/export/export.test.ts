import { describe, expect, it } from "vitest";
import { safeFileName } from "./export";

describe("safeFileName", () => {
  it("เก็บภาษาไทย แทนอักขระพิเศษด้วย _", () => {
    expect(safeFileName("Facade Show – ตัวอย่าง", "png")).toBe("Facade_Show_ตัวอย่าง.png");
    expect(safeFileName("", "json")).toBe("lumina.json");
    expect(safeFileName("a/b\\c:d", "webm")).toBe("a_b_c_d.webm");
  });
});
