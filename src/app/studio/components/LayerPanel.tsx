"use client";

import { EFFECTS, FX_MEDIA } from "@/engine/effects";
import { th } from "@/lib/i18n/th";
import { pickFile } from "../runtime";
import { useStudio } from "../store";
import { pickMediaFor } from "../media";
import { Swatch } from "./Swatch";

export function LayerPanel() {
  const surfaces = useStudio((s) => s.project.surfaces);
  const selectedId = useStudio((s) => s.selectedId);
  const refVisible = useStudio((s) => s.refVisible);
  const st = useStudio.getState;

  const add = (fx: number) => {
    const s = st().addSurface(fx);
    if (fx === FX_MEDIA) void pickMediaFor(s.id);
  };

  const loadRef = async () => {
    const f = await pickFile("image/*");
    if (!f) return;
    const old = st().refUrl;
    if (old) URL.revokeObjectURL(old);
    st().set("refUrl", URL.createObjectURL(f));
    st().set("refVisible", true);
  };

  return (
    <aside className="overflow-auto border-r border-ln bg-pn p-3 max-[1000px]:border-t max-[1000px]:border-r-0">
      <h3>{th.layers.title}</h3>
      <div role="listbox" aria-label={th.layers.title}>
        {surfaces.length === 0 && <p className="hint">{th.layers.empty}</p>}
        {[...surfaces].reverse().map((s) => {
          const sel = s.id === selectedId;
          return (
            <div
              key={s.id}
              role="option"
              aria-selected={sel}
              tabIndex={0}
              onClick={() => st().select(s.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && st().select(s.id)}
              className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                sel ? "border-ac bg-[#221714]" : "border-transparent hover:bg-pn2"
              } ${s.vis ? "" : "opacity-60"}`}
            >
              <Swatch fx={s.fx} p={s.p} />
              <span className="flex-1 truncate">{s.name}</span>
              <button
                className="btn sm"
                aria-label={th.layers.toggleVis}
                onClick={(e) => {
                  e.stopPropagation();
                  st().commitSurface(s.id, { vis: !s.vis });
                }}
              >
                {s.vis ? th.layers.show : th.layers.hide}
              </button>
            </div>
          );
        })}
      </div>

      <div className="sec">
        <h3>{th.layers.add}</h3>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {EFFECTS.map((f, i) => (
            <button key={i} className="btn px-2 py-1.5 text-left text-[13px] whitespace-normal" onClick={() => add(i)}>
              + {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sec">
        <h3>{th.ref.title}</h3>
        <p className="hint mb-2">{th.ref.help}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn" onClick={() => st().set("refVisible", !refVisible)}>
            {refVisible ? th.ref.hide : th.ref.show}
          </button>
          <button className="btn" onClick={loadRef}>
            {th.ref.load}
          </button>
        </div>
      </div>
    </aside>
  );
}
