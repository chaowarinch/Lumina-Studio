export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "offline" | "error" | "conflict";

export type SaveResult = { ok: true } | { ok: false; reason: "conflict" | "network" | "error" };

export interface SaveQueueOptions {
  /** หน่วงหลังแก้ไขครั้งสุดท้ายก่อนบันทึก (ms) */
  delay?: number;
  /** หน่วงก่อนลองใหม่เมื่อออฟไลน์ (ms) */
  retryDelay?: number;
  onStatus?: (s: SaveStatus) => void;
}

/**
 * คิว autosave: debounce การแก้ไข, บันทึกทีละครั้ง, ลองใหม่เมื่อเน็ตหลุด
 * และหยุดเมื่อเจอ conflict จนกว่าผู้ใช้จะเลือกทางแก้ (resolveConflict)
 */
export class SaveQueue {
  private status: SaveStatus = "idle";
  private dirty = false;
  private running: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly delay: number;
  private readonly retryDelay: number;

  constructor(
    private readonly save: () => Promise<SaveResult>,
    private readonly opts: SaveQueueOptions = {},
  ) {
    this.delay = opts.delay ?? 2000;
    this.retryDelay = opts.retryDelay ?? 5000;
  }

  get current(): SaveStatus {
    return this.status;
  }

  get hasUnsaved(): boolean {
    return this.dirty || this.running !== null;
  }

  /** แจ้งว่ามีการแก้ไข */
  markDirty(): void {
    if (this.disposed) return;
    this.dirty = true;
    if (this.status === "conflict") return;
    if (!this.running) this.setStatus("pending");
    this.schedule(this.delay);
  }

  /** บันทึกทันที (เช่น กดปุ่มบันทึก หรือก่อนปิดหน้า) */
  async flush(): Promise<void> {
    this.clearTimer();
    if (this.running) await this.running;
    if (this.dirty && this.status !== "conflict") await this.run();
  }

  /** ผู้ใช้เลือกทางแก้ conflict แล้ว (โหลดใหม่หรือบันทึกเป็นสำเนา) */
  resolveConflict(): void {
    this.dirty = false;
    this.setStatus("idle");
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private schedule(ms: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.running) void this.run();
    }, ms);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private run(): Promise<void> {
    this.dirty = false;
    this.setStatus("saving");
    this.running = (async () => {
      let r: SaveResult;
      try {
        r = await this.save();
      } catch {
        r = { ok: false, reason: "network" };
      }
      this.running = null;
      if (this.disposed) return;
      if (r.ok) {
        if (this.dirty) {
          this.setStatus("pending");
          this.schedule(this.delay);
        } else this.setStatus("saved");
      } else if (r.reason === "conflict") {
        this.dirty = true;
        this.setStatus("conflict");
      } else {
        this.dirty = true;
        this.setStatus(r.reason === "network" ? "offline" : "error");
        this.schedule(this.retryDelay);
      }
    })();
    return this.running;
  }

  private setStatus(s: SaveStatus) {
    if (s === this.status) return;
    this.status = s;
    this.opts.onStatus?.(s);
  }
}
