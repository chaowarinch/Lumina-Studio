import { FFT_SIZE, computeLevel, decayLevel } from "./level";

/** เล่นไฟล์เพลงและวัดระดับเสียงสำหรับ Audio Reactive */
export class AudioReactive {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private bins: Uint8Array<ArrayBuffer> | null = null;
  private url: string | null = null;
  level = 0;

  async play(file: File): Promise<void> {
    if (!this.el) {
      const el = new Audio();
      el.loop = true;
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(el);
      const an = ctx.createAnalyser();
      an.fftSize = FFT_SIZE;
      src.connect(an);
      an.connect(ctx.destination);
      this.el = el;
      this.ctx = ctx;
      this.analyser = an;
      this.bins = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(file);
    this.el.src = this.url;
    await this.ctx!.resume();
    await this.el.play();
  }

  /** เรียกทุกเฟรม คืนค่าระดับเสียง 0..1 */
  update(): number {
    if (this.analyser && this.bins && this.el && !this.el.paused) {
      this.analyser.getByteFrequencyData(this.bins);
      this.level = computeLevel(this.bins, this.level);
    } else this.level = decayLevel(this.level);
    return this.level;
  }

  dispose(): void {
    this.el?.pause();
    this.ctx?.close().catch(() => {});
    if (this.url) URL.revokeObjectURL(this.url);
    this.el = null;
    this.ctx = null;
    this.analyser = null;
  }
}
