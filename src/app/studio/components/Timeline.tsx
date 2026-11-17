"use client";

import { useEffect, useRef } from "react";
import { formatTime, layerEnd, MAX_DURATION, MIN_DURATION } from "@/engine/timeline/timeline";
import { th } from "@/lib/i18n/th";
import { onTick, pickFile, runtime } from "../runtime";
import { useStudio } from "../store";

export function Timeline() {
  const playing = useStudio((s) => s.playing);
  const dur = useStudio((s) => s.project.dur);
  const surfaces = useStudio((s) => s.project.surfaces);
  const selectedId = useStudio((s) => s.selectedId);
  const st = useStudio.getState;

  const timeRef = useRef<HTMLSpanElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLButtonElement>(null);

  // อัปเดตส่วนที่เปลี่ยนทุกเฟรมผ่าน DOM โดยตรง
  useEffect(
    () =>
      onTick(() => {
        const d = st().project.dur;
        if (scrubRef.current && document.activeElement !== scrubRef.current) scrubRef.current.value = String(runtime.t);
        if (timeRef.current) timeRef.current.textContent = `${formatTime(runtime.t)} / ${formatTime(d)}`;
        if (levelRef.current) levelRef.current.style.width = `${Math.round(runtime.level * 100)}%`;
        tracksRef.current
          ?.querySelectorAll<HTMLElement>("[data-ph]")
          .forEach((b) => (b.style.left = `${(runtime.t / d) * 100}%`));
      }),
    [st],
  );

  const loadAudio = async () => {
    const f = await pickFile("audio/*");
    if (!f) return;
    try {
      await runtime.audio.play(f);
      if (audioRef.current) audioRef.current.textContent = `♪ ${f.name.slice(0, 22)}`;
      st().showToast(th.toast.audioOn);
    } catch {
      st().showToast(th.toast.audioFail);
    }
  };

  return (
    <div className="border-t border-ln bg-pn px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn pri min-w-20" onClick={() => st().set("playing", !playing)}>
          {playing ? th.timeline.pause : th.timeline.play}
        </button>
        <span ref={timeRef} className="min-w-[110px] tabular-nums">
          {formatTime(0)} / {formatTime(dur)}
        </span>
        <input
          ref={scrubRef}
          type="range"
          min={0}
          max={dur}
          step={0.01}
          defaultValue={0}
          aria-label={th.timeline.scrub}
          className="min-w-[140px] flex-1"
          onInput={(e) => (runtime.t = +e.currentTarget.value)}
        />
        <label htmlFor="dur">{th.timeline.duration}</label>
        <input
          id="dur"
          key={dur}
          className="field w-[76px]"
          type="number"
          min={MIN_DURATION}
          max={MAX_DURATION}
          step={1}
          defaultValue={dur}
          onBlur={(e) => st().setDuration(+e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="tsep" />
        <button ref={audioRef} className="btn" onClick={loadAudio}>
          {th.timeline.audio}
        </button>
        <span className="h-1.5 w-[90px] overflow-hidden rounded-sm bg-field" title={th.timeline.level}>
          <i ref={levelRef} className="block h-full w-0 bg-ok" />
        </span>
      </div>

      <div ref={tracksRef} className="mt-2 grid max-h-[130px] gap-1 overflow-auto">
        {[...surfaces].reverse().map((s) => {
          const end = Math.min(layerEnd(s, dur), dur);
          const sel = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => st().select(s.id)}
              className="grid cursor-pointer grid-cols-[120px_minmax(0,1fr)] items-center gap-2 text-left text-[13px] max-[600px]:grid-cols-[80px_minmax(0,1fr)]"
            >
              <span className="truncate">{s.name}</span>
              <span className="relative block h-[18px] rounded bg-field">
                <i
                  className={`absolute top-0.5 bottom-0.5 rounded-[3px] ${sel ? "bg-ac" : "bg-[#3a3f48]"}`}
                  style={{ left: `${(s.tin / dur) * 100}%`, width: `${Math.max(0, ((end - s.tin) / dur) * 100)}%` }}
                />
                <b data-ph className="absolute top-0 bottom-0 w-0.5 bg-ok" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
