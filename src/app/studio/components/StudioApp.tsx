"use client";

import { useEffect, useRef } from "react";
import { hydrateStudio, selectedSurface, startAutosave, useStudio } from "../store";
import { Inspector } from "./Inspector";
import { LayerPanel } from "./LayerPanel";
import { Stage } from "./Stage";
import { Timeline } from "./Timeline";
import { Toast } from "./Toast";
import { Toolbar } from "./Toolbar";

/** คีย์ลัด: Space เล่น/หยุด, V ปรับจุด, M มาสก์, Delete ลบ, ลูกศรขยับจุด, Ctrl+Z / Ctrl+Shift+Z */
function useShortcuts() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.matches("input, textarea, select") || t.isContentEditable) return;
      const st = useStudio.getState();
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = selectedSurface(st);
      if (k === " ") {
        if (t.matches("button")) return;
        e.preventDefault();
        st.set("playing", !st.playing);
      } else if (k === "v") st.setTool("warp");
      else if (k === "m") {
        if (s) st.setTool("mask");
      } else if (k === "delete" || k === "backspace") {
        if (s) st.deleteSelected();
      } else if (k.startsWith("arrow") && s && st.activePt >= 0) {
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.001;
        const dx = k === "arrowleft" ? -step : k === "arrowright" ? step : 0;
        const dy = k === "arrowup" ? -step : k === "arrowdown" ? step : 0;
        st.beginGesture();
        const i = st.activePt;
        st.patchSurface(s.id, (x) => ({ pts: x.pts.map((p, j) => (j === i ? [p[0] + dx, p[1] + dy] : p)) }));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow")) useStudio.getState().endGesture();
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, []);
}

export default function StudioApp() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hydrated = useStudio((s) => s.hydrated);

  useEffect(() => {
    hydrateStudio();
    return startAutosave();
  }, []);
  useShortcuts();

  return (
    <div
      className="grid h-[calc(100vh-56px)] grid-cols-[250px_minmax(0,1fr)_300px] max-[1000px]:h-auto max-[1000px]:grid-cols-[minmax(0,1fr)]"
      aria-busy={!hydrated}
    >
      <LayerPanel />
      <main className="flex flex-col overflow-auto bg-stage max-[1000px]:-order-1">
        <Toolbar stageRef={stageRef} />
        <Stage stageRef={stageRef} />
        <Timeline />
      </main>
      <Inspector />
      <Toast />
    </div>
  );
}
