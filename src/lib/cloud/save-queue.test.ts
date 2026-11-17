import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveQueue, type SaveResult, type SaveStatus } from "./save-queue";

describe("SaveQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (results: SaveResult[] = []) => {
    const statuses: SaveStatus[] = [];
    const save = vi.fn(async () => results.shift() ?? ({ ok: true } as SaveResult));
    const q = new SaveQueue(save, { delay: 1000, retryDelay: 3000, onStatus: (s) => statuses.push(s) });
    return { q, save, statuses };
  };

  it("debounce: แก้หลายครั้งติดกันบันทึกครั้งเดียว", async () => {
    const { q, save, statuses } = setup();
    q.markDirty();
    await vi.advanceTimersByTimeAsync(500);
    q.markDirty();
    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["pending", "saving", "saved"]);
    expect(q.hasUnsaved).toBe(false);
  });

  it("แก้ระหว่างกำลังบันทึก → บันทึกรอบถัดไป", async () => {
    let release!: (r: SaveResult) => void;
    const save = vi
      .fn<() => Promise<SaveResult>>()
      .mockImplementationOnce(() => new Promise((r) => (release = r)))
      .mockResolvedValue({ ok: true });
    const q = new SaveQueue(save, { delay: 100 });
    q.markDirty();
    await vi.advanceTimersByTimeAsync(100);
    q.markDirty();
    expect(q.current).toBe("saving");
    release({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(q.current).toBe("pending");
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(2);
    expect(q.current).toBe("saved");
  });

  it("ออฟไลน์ → ลองใหม่อัตโนมัติ", async () => {
    const { q, save } = setup([{ ok: false, reason: "network" }]);
    q.markDirty();
    await vi.advanceTimersByTimeAsync(1000);
    expect(q.current).toBe("offline");
    await vi.advanceTimersByTimeAsync(3000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(q.current).toBe("saved");
  });

  it("exception นับเป็นออฟไลน์", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("fetch failed")).mockResolvedValue({ ok: true });
    const q = new SaveQueue(save, { delay: 10, retryDelay: 10 });
    q.markDirty();
    await vi.advanceTimersByTimeAsync(10);
    expect(q.current).toBe("offline");
  });

  it("conflict หยุดบันทึกจนกว่าจะ resolve", async () => {
    const { q, save } = setup([{ ok: false, reason: "conflict" }]);
    q.markDirty();
    await vi.advanceTimersByTimeAsync(1000);
    expect(q.current).toBe("conflict");
    q.markDirty();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    q.resolveConflict();
    expect(q.current).toBe("idle");
    q.markDirty();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("flush บันทึกทันที", async () => {
    const { q, save } = setup();
    q.markDirty();
    await q.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(q.current).toBe("saved");
    await q.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("dispose หยุดตัวจับเวลา", async () => {
    const { q, save } = setup();
    q.markDirty();
    q.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
  });
});
