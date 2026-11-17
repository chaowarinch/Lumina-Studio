import { z } from "zod";
import { EFFECTS, paramsFor } from "../effects";
import { MESH_MAX } from "../geometry/surface";
import { clampDuration } from "../timeline/timeline";
import { uid } from "./factory";
import type { Project, Surface } from "./types";

export const APP_ID = "LUMINA STUDIO";
/** เวอร์ชันรูปแบบไฟล์ (เข้ากันได้กับต้นแบบ v2) */
export const FILE_VERSION = 2;
export const MAX_SURFACES = 200;
/** id ของสื่อบนคลาวด์ = uuid ของแถวใน media_assets */
const CLOUD_MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const finite = z.number().refine(Number.isFinite);
const vec2 = z.tuple([finite, finite]);

const paramsSchema = z
  .object({
    intensity: finite,
    speed: finite,
    hue: finite,
    scale: finite,
    opacity: finite,
    feather: finite,
    audio: finite,
  })
  .partial();

const surfaceSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().max(200).default(""),
    fx: z.number().int().min(0).max(EFFECTS.length - 1),
    p: paramsSchema.default({}),
    blend: z.enum(["add", "normal"]).default("add"),
    mode: z.enum(["pin", "mesh"]).default("pin"),
    n: z.number().int().min(1).max(MESH_MAX).default(1),
    pts: z.array(vec2),
    mask: z.array(vec2).max(500).default([]),
    maskInv: z.boolean().default(false),
    media: z.string().nullable().optional(),
    tin: finite.min(0).default(0),
    tout: finite.nullable().default(null),
    vis: z.boolean().default(true),
  })
  .superRefine((s, ctx) => {
    if (s.mode === "pin" && s.n !== 1) ctx.addIssue({ code: "custom", message: "pin ต้องมี n = 1" });
    if (s.mode === "mesh" && s.n < 2) ctx.addIssue({ code: "custom", message: "mesh ต้องมี n ≥ 2" });
    if (s.pts.length !== (s.n + 1) ** 2)
      ctx.addIssue({ code: "custom", message: `ต้องมีจุด ${(s.n + 1) ** 2} จุด` });
  });

const projectSchema = z.object({
  name: z.string().max(200).default(""),
  dur: finite.default(10),
  surfaces: z.array(surfaceSchema).max(MAX_SURFACES),
  ref: z.string().optional(),
});

const fileSchema = z.union([
  z.object({ app: z.string().optional(), version: z.number().optional(), project: projectSchema }),
  projectSchema,
]);

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string };

/** ตรวจและแปลงข้อมูลเป็น Project (ไฟล์จากต้นแบบ v2 ใช้ได้) */
export function parseProject(data: unknown): ParseResult {
  const r = fileSchema.safeParse(data);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "invalid" };
  const raw = "project" in r.data ? r.data.project : r.data;
  const seen = new Set<string>();
  const surfaces: Surface[] = raw.surfaces.map((s) => {
    let id = s.id && !seen.has(s.id) ? s.id : uid();
    while (seen.has(id)) id = uid();
    seen.add(id);
    const span =
      s.tout === null ? { tin: s.tin, tout: null } : { tin: s.tin, tout: Math.max(s.tin + 0.5, s.tout) };
    return {
      id,
      name: s.name,
      fx: s.fx,
      p: paramsFor(s.fx, s.p),
      blend: s.blend,
      mode: s.mode,
      n: s.n,
      pts: s.pts,
      mask: s.mask,
      maskInv: s.maskInv,
      // เก็บเฉพาะ id ของสื่อบนคลาวด์ (uuid) — สื่อในเครื่องไม่ได้ถูกบันทึกไปกับไฟล์
      media: s.media && CLOUD_MEDIA_ID.test(s.media) ? s.media : null,
      ...span,
      vis: s.vis,
    };
  });
  return {
    ok: true,
    project: { name: raw.name, dur: clampDuration(raw.dur), surfaces, ...(raw.ref ? { ref: raw.ref } : {}) },
  };
}

export function parseProjectJson(text: string): ParseResult {
  try {
    return parseProject(JSON.parse(text));
  } catch {
    return { ok: false, error: "JSON ไม่ถูกต้อง" };
  }
}

export function serializeProject(p: Project, space: number | undefined = 1): string {
  return JSON.stringify({ app: APP_ID, version: FILE_VERSION, project: p }, null, space);
}
