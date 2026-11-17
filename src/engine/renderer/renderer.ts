import { FX_MEDIA, FX_TEST_PATTERN } from "../effects";
import { FLOATS_PER_VERTEX, buildMesh } from "../geometry/surface";
import { audioGain } from "../audio/level";
import type { Surface } from "../project/types";
import { SURFACE_FRAG, SURFACE_VERT } from "../shaders/surface";
import { layerEnd, layerFade } from "../timeline/timeline";
import type { MediaRegistry } from "./media";

export interface DrawOptions {
  /** ความยาวโปรเจกต์ ใช้กับเลเยอร์ที่ tout = null */
  dur?: number;
  /** แสดงภาพทดสอบแทนเอฟเฟกต์ */
  test?: boolean;
  /** ระดับเสียง 0..1 */
  audioLevel?: number;
  /** ปิดการเฟดเข้า/ออก (ใช้กับภาพย่อ) */
  noFade?: boolean;
}

export interface Renderer {
  readonly canvas: HTMLCanvasElement;
  draw(surfaces: readonly Surface[], t: number, opts?: DrawOptions): void;
  dispose(): void;
}

const UNIFORMS = ["T", "K", "HU", "SC", "FE", "OP", "FX", "TX", "HT"] as const;
type UniformName = (typeof UNIFORMS)[number];

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("createShader failed");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log ?? "shader compile error");
  }
  return s;
}

/**
 * สร้าง WebGL renderer บน canvas — คืนค่า null ถ้าเบราว์เซอร์ไม่รองรับ WebGL
 * `preserveDrawingBuffer` เปิดไว้เพื่อให้ส่งออก PNG ได้ตลอดเวลา
 */
export function createRenderer(canvas: HTMLCanvasElement, media?: MediaRegistry): Renderer | null {
  const gl = canvas.getContext("webgl", {
    stencil: true,
    preserveDrawingBuffer: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, SURFACE_VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, SURFACE_FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
  gl.useProgram(program);

  const U = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<
    UniformName,
    WebGLUniformLocation | null
  >;
  const aPos = gl.getAttribLocation(program, "p");
  const aUv = gl.getAttribLocation(program, "uv");
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUv);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const stride = FLOATS_PER_VERTEX * 4;
  const upload = (d: Float32Array) => {
    gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8);
  };

  // texture ต่อสื่อ: version = -1 หมายถึงยังไม่มีข้อมูล
  const textures = new Map<string, { tex: WebGLTexture; version: number }>();
  const textureFor = (id: string): WebGLTexture | null => {
    const m = media?.get(id);
    if (!m) return null;
    let e = textures.get(id);
    if (!e) {
      e = { tex: gl.createTexture()!, version: -1 };
      textures.set(id, e);
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    try {
      if (m.kind === "video") {
        const v = m.el as HTMLVideoElement;
        if (v.readyState >= 2) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
          e.version = 1;
        }
      } else if (e.version !== m.version) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.el);
        e.version = m.version;
      }
    } catch {
      // ภาพข้ามโดเมนหรือยังโหลดไม่เสร็จ: ข้ามเฟรมนี้
    }
    return e.version === -1 ? null : e.tex;
  };

  const maskBuf = (pts: readonly [number, number][]) => {
    const d = new Float32Array(pts.length * FLOATS_PER_VERTEX);
    pts.forEach(([x, y], i) => {
      d[i * 4] = x;
      d[i * 4 + 1] = y;
    });
    return d;
  };

  return {
    canvas,
    draw(list, t, o = {}) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clearStencil(0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.BLEND);

      for (const s of list) {
        if (!s.vis) continue;
        const dur = o.dur ?? 1e9;
        if (t < s.tin || t > layerEnd(s, dur)) continue;
        const fade = o.noFade ? 1 : layerFade(s, t, dur);
        const p = s.p;

        // มาสก์: วาดโพลิกอนแบบ TRIANGLE_FAN + INVERT → even-odd (รองรับรูปเว้า)
        if (s.mask.length >= 3) {
          gl.enable(gl.STENCIL_TEST);
          gl.clear(gl.STENCIL_BUFFER_BIT);
          gl.colorMask(false, false, false, false);
          gl.stencilFunc(gl.ALWAYS, 0, 1);
          gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
          upload(maskBuf(s.mask));
          gl.drawArrays(gl.TRIANGLE_FAN, 0, s.mask.length);
          gl.colorMask(true, true, true, true);
          gl.stencilFunc(s.maskInv ? gl.EQUAL : gl.NOTEQUAL, 0, 1);
          gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        } else gl.disable(gl.STENCIL_TEST);

        const fx = o.test ? FX_TEST_PATTERN : s.fx;
        const tex = fx === FX_MEDIA && s.media ? textureFor(s.media) : null;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(U.TX, 0);
        gl.uniform1f(U.HT, tex ? 1 : 0);
        gl.uniform1i(U.FX, fx);
        gl.uniform1f(U.T, t * p.speed);
        gl.uniform1f(U.K, audioGain(p.intensity, o.audioLevel ?? 0, p.audio));
        gl.uniform1f(U.HU, p.hue);
        gl.uniform1f(U.SC, p.scale);
        gl.uniform1f(U.FE, p.feather);
        gl.uniform1f(U.OP, p.opacity * fade);

        if (s.blend === "add") gl.blendFunc(gl.ONE, gl.ONE);
        else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        const mesh = buildMesh(s);
        upload(mesh);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / FLOATS_PER_VERTEX);
      }
      gl.disable(gl.STENCIL_TEST);
    },
    dispose() {
      textures.forEach((e) => gl.deleteTexture(e.tex));
      textures.clear();
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
