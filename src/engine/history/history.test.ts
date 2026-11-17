import { describe, expect, it } from "vitest";
import { History } from "./history";

describe("History", () => {
  it("undo / redo ตามลำดับ", () => {
    const h = new History<string>();
    h.record("a", "b");
    h.record("b", "c");
    expect(h.undo("c")).toBe("b");
    expect(h.undo("b")).toBe("a");
    expect(h.undo("a")).toBeNull();
    expect(h.redo("a")).toBe("b");
    expect(h.redo("b")).toBe("c");
    expect(h.redo("c")).toBeNull();
  });

  it("ไม่บันทึกเมื่อไม่มีการเปลี่ยนแปลง (เช่น คลิกโดยไม่ลาก)", () => {
    const h = new History<string>();
    expect(h.record("a", "a")).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it("การแก้ไขใหม่ล้าง redo", () => {
    const h = new History<string>();
    h.record("a", "b");
    h.undo("b");
    h.record("a", "x");
    expect(h.canRedo).toBe(false);
  });

  it("จำกัดจำนวนขั้น", () => {
    const h = new History<number>(3);
    for (let i = 0; i < 10; i++) h.record(i, i + 1);
    let cur = 10, n = 0;
    for (let r = h.undo(cur); r !== null; r = h.undo(cur)) { cur = r; n++; }
    expect(n).toBe(3);
    expect(cur).toBe(7);
  });
});
