import { outline, warpFn } from "@/engine/geometry/surface";
import type { Vec2 } from "@/engine/project/types";
import type { StudioState } from "./store";

const ACCENT = "#ff5a3c";
const ACCENT2 = "#ff8a70";
const LIVE = "#2ec4b6";

/** วาดเส้นนำ จุดควบคุม และมาสก์บน canvas 2D (ตามต้นแบบ drawOv) */
export function drawOverlay(ctx: CanvasRenderingContext2D, st: StudioState, dpr: number): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!st.guides) return;
  const X = (p: Vec2): Vec2 => [p[0] * W, p[1] * H];
  const path = (pts: Vec2[], close: boolean) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = X(p);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    if (close) ctx.closePath();
  };
  ctx.font = `${12 * dpr}px ${getComputedStyle(document.body).fontFamily}`;

  for (const s of st.project.surfaces) {
    if (!s.vis) continue;
    const on = s.id === st.selectedId;
    path(outline(s), true);
    ctx.strokeStyle = on ? ACCENT : "rgba(255,255,255,.35)";
    ctx.lineWidth = (on ? 2 : 1) * dpr;
    ctx.stroke();
    const lp = X(s.pts[0]);
    ctx.fillStyle = on ? ACCENT2 : "rgba(255,255,255,.6)";
    ctx.fillText(s.name, lp[0] + 6 * dpr, lp[1] - 6 * dpr);
    if (!on) continue;

    if (s.mode === "mesh") {
      const f = warpFn(s);
      ctx.strokeStyle = "rgba(255,138,112,.55)";
      ctx.lineWidth = dpr;
      for (let k = 1; k < s.n; k++)
        for (const dir of [0, 1]) {
          const line: Vec2[] = [];
          for (let m = 0; m <= 24; m++) line.push(dir ? f(k / s.n, m / 24) : f(m / 24, k / s.n));
          path(line, false);
          ctx.stroke();
        }
    }

    if (st.tool === "warp")
      s.pts.forEach((p, i) => {
        const [x, y] = X(p);
        const act = i === st.activePt;
        ctx.beginPath();
        ctx.arc(x, y, (act ? 8 : 6) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = act ? ACCENT : "#fff";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = dpr;
        ctx.stroke();
      });

    if (s.mask.length) {
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.strokeStyle = LIVE;
      ctx.lineWidth = 1.5 * dpr;
      path(s.mask, st.tool !== "mask" || s.mask.length > 2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (st.tool === "mask")
        s.mask.forEach((p) => {
          const [x, y] = X(p);
          ctx.fillStyle = LIVE;
          ctx.fillRect(x - 4 * dpr, y - 4 * dpr, 8 * dpr, 8 * dpr);
        });
    }
  }
}
