/**
 * GLSL ES 1.0 (WebGL1) — พอร์ตจาก prototype/index.html ทีละบรรทัดเพื่อให้ภาพตรงกัน
 * พิกัด p อยู่ใน 0..1 ของเวที (y ลง) แปลงเป็น clip space ใน vertex shader
 */
export const SURFACE_VERT = /* glsl */ `
attribute vec2 p;
attribute vec2 uv;
varying vec2 v;
void main() {
  v = uv;
  gl_Position = vec4(p.x * 2. - 1., 1. - p.y * 2., 0., 1.);
}
`;

export const SURFACE_FRAG = /* glsl */ `
precision highp float;
varying vec2 v;
uniform float T, K, HU, SC, FE, OP;
uniform int FX;
uniform sampler2D TX;
uniform float HT;

vec3 hsv(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0., 2. / 3., 1. / 3.)) * 6. - 3.);
  return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y);
}
float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ns(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0., a = .5;
  for (int i = 0; i < 5; i++) { s += a * ns(p); p *= 2.03; a *= .5; }
  return s;
}

void main() {
  vec2 u = v;
  vec3 c = vec3(0.);
  float a = 1.;

  if (FX == 0) {
    // สื่อภาพ/วิดีโอ (ถ้ายังไม่มี texture แสดงลายตารางหมากรุก)
    if (HT > .5) { vec4 s = texture2D(TX, u); c = s.rgb * K; a = s.a; }
    else { c = vec3(.12 + .08 * step(.5, fract((u.x + u.y) * 8.))); }
  } else if (FX == 1) {
    // Neon
    float d = min(min(u.x, 1. - u.x), min(u.y, 1. - u.y));
    float g = .010 / (abs(d - .035) + .010);
    float m = fract(T * .25);
    float g2 = .006 / (abs(d - m * .5) + .006);
    c = hsv(vec3(HU + d * .4, .85, 1.)) * (g + g2 * .8) * K * .55;
  } else if (FX == 2) {
    // Spectrum
    float b = fract(HU + u.x * SC * .6 - T * .1 + .08 * sin(u.y * 6. + T));
    c = hsv(vec3(b, .85, 1.)) * (.55 + .45 * sin(u.y * SC * 9. - T * 2.)) * K;
  } else if (FX == 3) {
    // Energy Pulse
    float r = length(u - .5) * 2.;
    float ring = pow(max(sin(r * SC * 10. - T * 4.), 0.), 6.);
    c = hsv(vec3(HU + r * .15, .7, 1.)) * (ring + .22 / (r * 5. + .3)) * K;
  } else if (FX == 4) {
    // Digital Grid
    vec2 g = u * SC * 12.;
    float l = max(step(.93, fract(g.x)), step(.93, fract(g.y)));
    float sc = exp(-pow((fract(T * .2) - u.y) * 10., 2.));
    float cell = step(.86, h21(floor(g) + floor(T * 3.))) * .35;
    c = hsv(vec3(HU, .6, 1.)) * (l * (.3 + sc * 1.2) + cell + sc * .15) * K;
  } else if (FX == 5) {
    // Golden Aura
    float n = fbm(u * SC * 3. + vec2(T * .15, -T * .1));
    float gl = n * n * 1.8 * (1. - length(u - .5) * .9);
    c = hsv(vec3(HU + n * .06, .8 - n * .45, 1.)) * gl * K;
  } else if (FX == 6) {
    // Particle Field
    float s = 0.;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 g = u * SC * (7. + fi * 6.) + vec2(0., T * (.25 + fi * .18));
      vec2 id = floor(g);
      vec2 f = fract(g) - .5;
      float r = h21(id + fi * 7.);
      vec2 p = vec2(r - .5, fract(r * 13.) - .5) * .6;
      float d = length(f - p);
      s += .03 / (d * d * 14. + .03) * step(.45, r) * (.55 + .45 * sin(T * 3. + r * 30.));
    }
    c = hsv(vec3(HU, .45, 1.)) * s * K * 1.1;
  } else if (FX == 7) {
    // Geometric Prism
    vec2 g = u * SC * 8.;
    vec2 id = floor(g), f = fract(g);
    float tr = step(f.x, f.y);
    float ph = h21(id + tr);
    float w = .5 + .5 * sin(T * 2. + ph * 6.28 + (id.x + id.y) * .4);
    float edge = 1. - .7 * step(.96, max(f.x, f.y));
    c = hsv(vec3(HU + tr * .08, .6, 1.)) * mix(.12, 1., w) * edge * K;
  } else {
    // ภาพทดสอบ: กริด ขอบแดง วงกลมเขียว เส้นกลางฟ้า มุมเหลือง (ดูทิศทาง)
    c = vec3(.06);
    vec2 g = fract(u * 10.);
    if (min(g.x, g.y) < .03) c = vec3(.75);
    float d = min(min(u.x, 1. - u.x), min(u.y, 1. - u.y));
    if (d < .012) c = vec3(1., .25, .2);
    if (abs(length(u - .5) - .33) < .006) c = vec3(.2, 1., .6);
    if (abs(u.x - .5) < .004 || abs(u.y - .5) < .006) c = vec3(.3, .7, 1.);
    if (u.x < .12 && u.y < .12) c = vec3(1., .9, .2);
  }

  if (FE > 0.) {
    a *= smoothstep(0., FE, u.x) * smoothstep(0., FE, 1. - u.x) * smoothstep(0., FE, u.y) * smoothstep(0., FE, 1. - u.y);
  }
  a *= OP;
  gl_FragColor = vec4(c * a, a);
}
`;
