export type MediaKind = "image" | "video";

export interface MediaEntry {
  el: HTMLImageElement | HTMLVideoElement;
  kind: MediaKind;
  /** เพิ่มขึ้นเมื่อเนื้อหาภาพเปลี่ยน เพื่อให้ renderer อัปโหลด texture ใหม่ */
  version: number;
  url: string;
  /** ไฟล์ต้นฉบับ (มีเฉพาะสื่อที่เลือกจากเครื่อง ใช้อัปโหลดขึ้นคลาวด์ภายหลัง) */
  file?: File;
}

/** ทะเบียนสื่อในหน่วยความจำ: id ของเลเยอร์ → ภาพ/วิดีโอ (จากไฟล์ในเครื่องหรือ Supabase Storage) */
export class MediaRegistry {
  private entries = new Map<string, MediaEntry>();

  get(id: string): MediaEntry | undefined {
    return this.entries.get(id);
  }

  set(id: string, entry: MediaEntry): void {
    if (this.entries.get(id) !== entry) this.remove(id);
    this.entries.set(id, entry);
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    this.entries.delete(id);
    // ยังมี id อื่นใช้สื่อนี้อยู่ (alias) → ไม่ปล่อยทรัพยากร
    for (const other of this.entries.values()) if (other === e) return;
    if (e.el instanceof HTMLVideoElement) {
      e.el.pause();
      e.el.removeAttribute("src");
      e.el.load();
    }
    if (e.url.startsWith("blob:")) URL.revokeObjectURL(e.url);
  }

  /** โหลดไฟล์ผู้ใช้เป็นภาพหรือวิดีโอ */
  async load(id: string, file: File): Promise<MediaEntry> {
    const url = URL.createObjectURL(file);
    try {
      const entry = await this.loadUrl(id, url, file.type.startsWith("video") ? "video" : "image");
      entry.file = file;
      return entry;
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }

  /** โหลดสื่อจาก URL (เช่น signed URL ของ Supabase Storage) */
  async loadUrl(id: string, url: string, kind: MediaKind): Promise<MediaEntry> {
    if (kind === "video") {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      v.play().catch(() => {});
      const entry: MediaEntry = { el: v, kind: "video", version: 1, url };
      this.set(id, entry);
      return entry;
    }
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.src = url;
    await im.decode();
    const entry: MediaEntry = { el: im, kind: "image", version: Date.now(), url };
    this.set(id, entry);
    return entry;
  }

  /** ให้สื่อเดียวกันใช้ได้ทั้ง id เดิมและ id ใหม่ (หลังอัปโหลดขึ้นคลาวด์ — undo กลับไป id เดิมได้) */
  alias(from: string, to: string): void {
    const e = this.entries.get(from);
    if (e && from !== to) this.entries.set(to, e);
  }
}
