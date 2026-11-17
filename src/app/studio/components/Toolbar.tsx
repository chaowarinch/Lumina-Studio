"use client";

import { canvasToPng, downloadBlob, recordWebm, safeFileName, webmSupported, MAX_WEBM_SECONDS } from "@/engine/export/export";
import { parseProjectJson, serializeProject } from "@/engine/project/schema";
import { th } from "@/lib/i18n/th";
import { pickFile, runtime } from "../runtime";
import { selectedSurface, useStudio } from "../store";

export function Toolbar({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const tool = useStudio((s) => s.tool);
  const guides = useStudio((s) => s.guides);
  const testPattern = useStudio((s) => s.testPattern);
  const canUndo = useStudio((s) => s.canUndo);
  const canRedo = useStudio((s) => s.canRedo);
  const recordingLeft = useStudio((s) => s.recordingLeft);
  const st = useStudio.getState;

  const exportPng = async () => {
    const r = runtime.renderer;
    if (!r) return;
    const s = st();
    r.draw(s.project.surfaces, runtime.t, { dur: s.project.dur, test: s.testPattern, audioLevel: runtime.level });
    try {
      const name = safeFileName(s.project.name, "png");
      downloadBlob(await canvasToPng(r.canvas), name);
      s.showToast(th.toast.saved(name));
    } catch {
      s.showToast(th.toast.exportFail);
    }
  };

  const exportWebm = async () => {
    const r = runtime.renderer;
    const s = st();
    if (!r || !webmSupported(r.canvas)) return s.showToast(th.toast.noWebm);
    runtime.t = 0;
    s.set("playing", true);
    try {
      const blob = await recordWebm(r.canvas, Math.min(s.project.dur, MAX_WEBM_SECONDS), (left) =>
        st().set("recordingLeft", left),
      );
      const name = safeFileName(st().project.name, "webm");
      downloadBlob(blob, name);
      st().showToast(th.toast.saved(name));
    } catch {
      st().showToast(th.toast.exportFail);
    } finally {
      st().set("recordingLeft", null);
    }
  };

  const exportJson = () => {
    const s = st();
    const name = safeFileName(s.project.name, "json");
    downloadBlob(new Blob([serializeProject(s.project)], { type: "application/json" }), name);
    s.showToast(th.toast.saved(name));
  };

  const importJson = async () => {
    const f = await pickFile(".json,application/json");
    if (!f) return;
    const r = parseProjectJson(await f.text());
    if (!r.ok) return st().showToast(th.toast.importFail);
    st().loadProject(r.project, { keepHistory: true });
    st().showToast(th.toast.imported);
  };

  const fullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen();
      st().showToast(th.toast.fullscreen);
    } catch {
      st().showToast(th.toast.fullscreenDenied);
    }
  };

  const maskTool = () => {
    if (!selectedSurface(st())) return st().showToast(th.toast.selectFirst);
    st().setTool("mask");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-ln bg-pn px-2.5 py-2">
      <button className={`btn ${tool === "warp" ? "on" : ""}`} title={th.tools.warpHint} onClick={() => st().setTool("warp")}>
        {th.tools.warp}
      </button>
      <button className={`btn ${tool === "mask" ? "on" : ""}`} title={th.tools.maskHint} onClick={maskTool}>
        {th.tools.mask}
      </button>
      <span className="tsep" />
      <button className={`btn ${guides ? "on" : ""}`} aria-pressed={guides} onClick={() => st().set("guides", !guides)}>
        {th.tools.guides}
      </button>
      <button
        className={`btn ${testPattern ? "on" : ""}`}
        aria-pressed={testPattern}
        onClick={() => st().set("testPattern", !testPattern)}
      >
        {th.tools.test}
      </button>
      <span className="tsep" />
      <button className="btn" title="Ctrl+Z" disabled={!canUndo} onClick={() => st().undo()}>
        {th.tools.undo}
      </button>
      <button className="btn" title="Ctrl+Shift+Z" disabled={!canRedo} onClick={() => st().redo()}>
        {th.tools.redo}
      </button>
      <span className="tsep" />
      <button className="btn" onClick={exportPng}>
        {th.tools.png}
      </button>
      <button className="btn" onClick={exportWebm} disabled={recordingLeft !== null}>
        {recordingLeft !== null ? th.tools.recording(recordingLeft) : th.tools.webm}
      </button>
      <button className="btn" onClick={exportJson}>
        {th.tools.json}
      </button>
      <button className="btn" onClick={importJson}>
        {th.tools.import}
      </button>
      <div className="flex-1" />
      <button className="btn pri" onClick={fullscreen}>
        {th.tools.project}
      </button>
    </div>
  );
}
