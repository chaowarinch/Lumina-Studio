export type MediaKind = "image" | "video";

export interface MediaEntry {
  el: HTMLImageElement | HTMLVideoElement;
  kind: MediaKind;
  /** เพิ่มขึ้นเมื่อเนื้อหาภาพเปลี่ยน เพื่อให้ renderer อัปโหลด texture ใหม่ */
  version: number;
  url: string;
}

/** ทะเบียนสื่อในหน่วยความจำ (Phase 2 จะผูกกับ Supabase Storage) */
export class MediaRegistry {
  private entries = new Map<string, MediaEntry>();

  get(id: string): MediaEntry | undefined {
    return this.entries.get(id);
  }

  set(id: string, entry: MediaEntry): void {
    this.remove(id);
    this.entries.set(id, entry);
  }

  remove(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.el instanceof HTMLVideoElement) {
      e.el.pause();
      e.el.removeAttribute("src");
      e.el.load();
    }
    URL.revokeObjectURL(e.url);
    this.entries.delete(id);
  }

  /** โหลดไฟล์ผู้ใช้เป็นภาพหรือวิดีโอ */
  async load(id: string, file: File): Promise<MediaEntry> {
    const url = URL.createObjectURL(file);
    try {
      if (file.type.startsWith("video")) {
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.crossOrigin = "anonymous";
        v.play().catch(() => {});
        const entry: MediaEntry = { el: v, kind: "video", version: 1, url };
        this.set(id, entry);
        return entry;
      }
      const im = new Image();
      im.src = url;
      await im.decode();
      const entry: MediaEntry = { el: im, kind: "image", version: Date.now(), url };
      this.set(id, entry);
      return entry;
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
  }
}
