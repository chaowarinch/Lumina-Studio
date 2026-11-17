"use client";

import { EFFECTS, FX_MEDIA, PARAM_RANGES } from "@/engine/effects";
import { MESH_MAX, MESH_MIN, resetToRect, setWarpMode } from "@/engine/geometry/surface";
import type { BlendMode, Surface } from "@/engine/project/types";
import { normalizeSpan } from "@/engine/timeline/timeline";
import { th } from "@/lib/i18n/th";
import { pickMediaFor } from "../media";
import { effectPatch, selectedSurface, useStudio } from "../store";

const MESH_SIZES = Array.from({ length: MESH_MAX - MESH_MIN + 1 }, (_, i) => MESH_MIN + i);

export function Inspector() {
  const s = useStudio(selectedSurface);
  const dur = useStudio((st) => st.project.dur);

  return (
    <aside className="overflow-auto border-l border-ln bg-pn p-3 max-[1000px]:border-t max-[1000px]:border-l-0">
      {s ? <SurfaceInspector s={s} dur={dur} /> : <p className="text-mu">{th.insp.none}</p>}
    </aside>
  );
}

function SurfaceInspector({ s, dur }: { s: Surface; dur: number }) {
  const st = useStudio.getState;
  const commit = (patch: Partial<Surface>) => st().commitSurface(s.id, patch);
  const shape = (patch: Partial<Surface>) => {
    commit(patch);
    st().setActivePt(-1);
  };

  return (
    <>
      <h3>{th.insp.title}</h3>
      <label htmlFor="iName">{th.insp.name}</label>
      <input
        id="iName"
        className="field"
        type="text"
        maxLength={80}
        value={s.name}
        onFocus={() => st().beginGesture()}
        onBlur={() => st().endGesture()}
        onChange={(e) => st().patchSurface(s.id, { name: e.target.value })}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="iFx">{th.insp.effect}</label>
          <select
            id="iFx"
            className="field"
            value={s.fx}
            onChange={(e) => {
              const fx = +e.target.value;
              commit(effectPatch(s, fx));
              if (fx === FX_MEDIA && !s.media) void pickMediaFor(s.id);
            }}
          >
            {EFFECTS.map((f, i) => (
              <option key={i} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="iBlend">{th.insp.blend}</label>
          <select
            id="iBlend"
            className="field"
            value={s.blend}
            onChange={(e) => commit({ blend: e.target.value as BlendMode })}
          >
            <option value="add">{th.insp.blendAdd}</option>
            <option value="normal">{th.insp.blendNormal}</option>
          </select>
        </div>
      </div>
      {s.fx === FX_MEDIA && (
        <button className="btn mt-2 w-full" onClick={() => void pickMediaFor(s.id)}>
          {s.media ? th.insp.changeMedia : th.insp.pickMedia}
        </button>
      )}

      <div className="sec">
        {PARAM_RANGES.map(({ key, min, max, step }) => (
          <div key={key} className="my-1.5 grid grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-2">
            <label htmlFor={`p_${key}`}>{th.params[key]}</label>
            <input
              id={`p_${key}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={s.p[key]}
              onPointerDown={() => st().beginGesture()}
              onKeyDown={() => st().beginGesture()}
              onPointerUp={() => st().endGesture()}
              onKeyUp={() => st().endGesture()}
              onBlur={() => st().endGesture()}
              onChange={(e) => st().patchSurface(s.id, (x) => ({ p: { ...x.p, [key]: +e.target.value } }))}
            />
            <output htmlFor={`p_${key}`} className="text-right text-xs text-mu tabular-nums">
              {s.p[key].toFixed(2)}
            </output>
          </div>
        ))}
      </div>

      <div className="sec">
        <h3>{th.insp.shape}</h3>
        <div className="flex gap-1">
          <button
            className={`btn flex-1 ${s.mode === "pin" ? "on" : ""}`}
            onClick={() => s.mode !== "pin" && shape(setWarpMode(s, "pin", 1))}
          >
            {th.insp.pin}
          </button>
          <button
            className={`btn flex-1 ${s.mode === "mesh" ? "on" : ""}`}
            onClick={() => s.mode !== "mesh" && shape(setWarpMode(s, "mesh", 3))}
          >
            {th.insp.mesh}
          </button>
        </div>
        {s.mode === "mesh" && (
          <div className="my-1.5 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
            <label htmlFor="iMesh">{th.insp.resolution}</label>
            <select
              id="iMesh"
              className="field"
              value={s.n}
              onChange={(e) => shape(setWarpMode(s, "mesh", +e.target.value))}
            >
              {MESH_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}×{n}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="hint my-2">{th.insp.shapeHelp}</p>
        <button className="btn w-full" onClick={() => shape(resetToRect(s))}>
          {th.insp.reset}
        </button>
      </div>

      <div className="sec">
        <h3>{th.insp.masking}</h3>
        <p className="hint mb-2">
          {th.insp.maskCount(s.mask.length)} · {th.insp.maskHelp}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn ${s.maskInv ? "on" : ""}`} onClick={() => commit({ maskInv: !s.maskInv })}>
            {s.maskInv ? th.insp.maskCut : th.insp.maskInside}
          </button>
          <button className="btn" disabled={!s.mask.length} onClick={() => commit({ mask: [] })}>
            {th.insp.maskClear}
          </button>
        </div>
      </div>

      <div className="sec">
        <h3>{th.insp.timeline}</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="iTin">{th.insp.tin}</label>
            <input
              id="iTin"
              key={`in-${s.id}-${s.tin}`}
              className="field"
              type="number"
              min={0}
              step={0.1}
              defaultValue={s.tin}
              onBlur={(e) => commit(normalizeSpan(+e.target.value, s.tout))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
          <div>
            <label htmlFor="iTout">{th.insp.tout}</label>
            <input
              id="iTout"
              key={`out-${s.id}-${s.tout}-${dur}`}
              className="field"
              type="number"
              min={0}
              step={0.1}
              defaultValue={s.tout ?? dur}
              onBlur={(e) => {
                const v = +e.target.value;
                commit(normalizeSpan(s.tin, e.target.value === "" || !Number.isFinite(v) ? null : v));
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
        </div>
        <p className="hint mt-2">{th.insp.fadeHelp}</p>
      </div>

      <div className="sec grid grid-cols-2 gap-2">
        <button className="btn" onClick={() => st().duplicateSelected()}>
          {th.insp.duplicate}
        </button>
        <button className="btn" onClick={() => st().deleteSelected()}>
          {th.insp.delete}
        </button>
      </div>
    </>
  );
}
