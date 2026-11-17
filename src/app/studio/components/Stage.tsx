"use client";

import { useEffect, useRef, useState } from "react";
import { outline, pointInPolygon, translatePoints } from "@/engine/geometry/surface";
import type { Vec2 } from "@/engine/project/types";
import { createRenderer } from "@/engine/renderer/renderer";
import { advanceTime } from "@/engine/timeline/timeline";
import { th } from "@/lib/i18n/th";
import { drawOverlay } from "../overlay";
import { emitTick, runtime } from "../runtime";
import { selectedSurface, useStudio } from "../store";
import { sampleReference } from "../reference";

/** ระยะจับจุดควบคุม (px บนจอ) */
const HIT_PX = 12;

type Drag = { kind: "pt"; i: number } | { kind: "mask"; i: number } | { kind: "move"; last: Vec2 };

export function Stage({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const ovRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const refVisible = useStudio((s) => s.refVisible);
  const refUrl = useStudio((s) => s.refUrl);
  const tool = useStudio((s) => s.tool);

  // ---------- render loop ----------
  useEffect(() => {
    const gl = glRef.current!;
    const ov = ovRef.current!;
    const ctx = ov.getContext("2d")!;
    let renderer: ReturnType<typeof createRenderer> = null;
    try {
      renderer = createRenderer(gl, runtime.media);
    } catch (e) {
      console.error(e);
    }
    if (!renderer) setNoWebgl(true);
    runtime.renderer = renderer;

    const resize = () => {
      const r = ov.getBoundingClientRect();
      const d = devicePixelRatio || 1;
      ov.width = Math.round(r.width * d);
      ov.height = Math.round(r.height * d);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(ov);

    let raf = 0;
    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const st = useStudio.getState();
      if (st.playing) runtime.t = advanceTime(runtime.t, (now - last) / 1000, st.project.dur);
      last = now;
      runtime.level = runtime.audio.update();
      renderer?.draw(st.project.surfaces, runtime.t, {
        dur: st.project.dur,
        test: st.testPattern,
        audioLevel: runtime.level,
      });
      drawOverlay(ctx, st, devicePixelRatio || 1);
      if (++frame % 3 === 0) {
        if (badgeRef.current && renderer) badgeRef.current.textContent = th.stage.badge(st.project.surfaces.length, st.testPattern);
        emitTick();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer?.dispose();
      runtime.renderer = null;
    };
  }, []);

  // ---------- pointer interaction ----------
  const drag = useRef<Drag | null>(null);
  const norm = (e: React.PointerEvent): Vec2 => {
    const r = ovRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const near = (a: Vec2, b: Vec2) => {
    const r = ovRef.current!.getBoundingClientRect();
    return Math.hypot((a[0] - b[0]) * r.width, (a[1] - b[1]) * r.height) < HIT_PX;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const st = useStudio.getState();
    const p = norm(e);
    const s = selectedSurface(st);
    ovRef.current!.setPointerCapture(e.pointerId);

    if (st.tool === "mask" && s) {
      st.beginGesture();
      const i = s.mask.findIndex((q) => near(q, p));
      if (i >= 0) drag.current = { kind: "mask", i };
      else {
        st.patchSurface(s.id, { mask: [...s.mask, p] });
        drag.current = { kind: "mask", i: s.mask.length };
      }
      return;
    }
    if (s) {
      const i = s.pts.findIndex((q) => near(q, p));
      if (i >= 0) {
        st.beginGesture();
        st.setActivePt(i);
        drag.current = { kind: "pt", i };
        return;
      }
    }
    const list = st.project.surfaces;
    for (let k = list.length - 1; k >= 0; k--) {
      const q = list[k];
      if (q.vis && pointInPolygon(p, outline(q, 8))) {
        st.select(q.id);
        st.beginGesture();
        drag.current = { kind: "move", last: p };
        return;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const st = useStudio.getState();
    const s = selectedSurface(st);
    if (!s) return;
    const p = norm(e).map((v) => Math.max(-0.2, Math.min(1.2, v))) as Vec2;
    if (d.kind === "pt") st.patchSurface(s.id, { pts: s.pts.map((q, i) => (i === d.i ? p : q)) });
    else if (d.kind === "mask") st.patchSurface(s.id, { mask: s.mask.map((q, i) => (i === d.i ? p : q)) });
    else {
      const dx = p[0] - d.last[0];
      const dy = p[1] - d.last[1];
      st.patchSurface(s.id, { pts: translatePoints(s.pts, dx, dy), mask: translatePoints(s.mask, dx, dy) });
      d.last = p;
    }
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    useStudio.getState().endGesture();
  };

  const onDoubleClick = () => {
    const st = useStudio.getState();
    if (st.tool === "mask") {
      st.setTool("warp");
      st.showToast(th.toast.maskClosed);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 justify-center p-3.5">
      <div ref={stageRef} className={`stage ${refVisible ? "" : "noref"}`} aria-label={th.stage.label}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ภาพอ้างอิงเป็น object URL/SVG ในเครื่อง */}
        <img className="layer" src={refUrl ?? sampleReference()} alt="" />
        <canvas ref={glRef} className="layer gl" width={1920} height={1080} />
        <canvas
          ref={ovRef}
          className="layer ov"
          style={{ cursor: tool === "mask" ? "copy" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        />
        <div
          ref={badgeRef}
          className="badge pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-black/65 px-2 py-0.5 text-xs"
        >
          {noWebgl ? th.stage.noWebgl : ""}
        </div>
      </div>
    </div>
  );
}
