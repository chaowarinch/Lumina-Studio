import pw from "playwright";
const { chromium } = pw;
import { writeFileSync, mkdirSync } from "node:fs";
import { PRODUCTS } from "../official-products.mjs";
const OUT = new URL("../../public/market/previews", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage();
page.on("pageerror", (e) => console.error(e));
await page.goto("file://" + new URL("./render.html", import.meta.url).pathname);
for (const p of PRODUCTS) {
  const res = await page.evaluate(async ({ fx, params }) => {
    const c = document.getElementById("c");
    const { createRenderer, createSurface } = window.LUMINA;
    const r = createRenderer(c);
    const s = { ...createSurface("p", fx, [0, 0, 1, 1]), p: params };
    r.draw([s], 3.2, { noFade: true });
    const cover = c.toDataURL("image/jpeg", 0.82);
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 1_200_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => (rec.onstop = res));
    rec.start(200);
    const t0 = performance.now();
    await new Promise((resolve) => {
      const loop = (now) => {
        const t = (now - t0) / 1000;
        r.draw([s], 1 + t, { noFade: true });
        if (t < 5) requestAnimationFrame(loop); else resolve();
      };
      requestAnimationFrame(loop);
    });
    rec.stop();
    await done;
    const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
    r.dispose();
    return { cover, webm: Array.from(new Uint8Array(buf)) };
  }, { fx: p.fx, params: p.params });
  writeFileSync(`${OUT}/${p.slug}.jpg`, Buffer.from(res.cover.split(",")[1], "base64"));
  writeFileSync(`${OUT}/${p.slug}.webm`, Buffer.from(res.webm));
  console.log(p.slug, res.webm.length);
}
await b.close();
