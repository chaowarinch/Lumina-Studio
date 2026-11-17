let cached: string | null = null;

/** ภาพอ้างอิงตัวอย่าง: หน้าอาคารสองปีก + หน้าจั่ว + ซุ้มประตู (SVG จากต้นแบบ) */
export function sampleReference(): string {
  if (cached) return cached;
  let w = "";
  for (const [x0, y0] of [
    [340, 250],
    [950, 250],
  ])
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        w += `<rect x="${x0 + 20 + c * 72}" y="${y0 + 40 + r * 130}" width="40" height="70" fill="#1d2230"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060c"/><stop offset="1" stop-color="#151a2a"/></linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f5c"/><stop offset="1" stop-color="#2b2f39"/></linearGradient></defs><rect width="1600" height="900" fill="url(#s)"/><rect y="830" width="1600" height="70" fill="#0b0d12"/><polygon points="320,180 672,216 672,810 320,828" fill="url(#w)"/><polygon points="928,216 1280,180 1280,828 928,810" fill="url(#w)"/><rect x="672" y="338" width="256" height="472" fill="#3d424e"/><polygon points="672,338 800,117 928,338" fill="#474c59"/>${w}<path d="M712 810 V430 A88 88 0 0 1 888 430 V810Z" fill="#1a1e27"/></svg>`;
  cached = "data:image/svg+xml," + encodeURIComponent(svg);
  return cached;
}
