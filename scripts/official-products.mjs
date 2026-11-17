// สินค้าตั้งต้นของ LUMINA Official (ย้ายมาจากต้นแบบ) — ใช้สร้าง seed SQL และวิดีโอตัวอย่าง
export const FX_LABELS = ["สื่อ (ภาพ/วิดีโอ)", "Neon", "Spectrum", "Energy Pulse", "Digital Grid", "Golden Aura", "Particle Field", "Geometric Prism"];
const FX_HUE = [0, 0.92, 0, 0.55, 0.5, 0.09, 0.6, 0.75];
const DEF = { intensity: 1, speed: 1, hue: 0.5, scale: 1, opacity: 1, feather: 0, audio: 0 };
export const CATS = { building: "Building Mapping", cube: "Cube Mapping", organic: "Organic Mapping", abstract: "Abstract Light Art", particle: "Particle Effects", geometric: "3D Geometric" };

const RAW = [
  ["neon-facade-outline", "Neon Facade Outline", "building", 890, 1, { hue: 0.92 }, "เส้นนีออนวิ่งรอบขอบพื้นที่ เหมาะกับการเน้นโครงหน้าต่างและกรอบอาคาร"],
  ["rainbow-wall-sweep", "Rainbow Wall Sweep", "building", 690, 2, { scale: 1.4 }, "แถบสีรุ้งกวาดผ่านผนังอย่างนุ่มนวล ใช้ได้ทั้งผนังเรียบและผนังมีลวดลาย"],
  ["cube-pulse-pack", "Cube Pulse Pack", "cube", 490, 3, { hue: 0.6, scale: 0.7 }, "วงคลื่นพลังงานเต้นจากศูนย์กลาง เหมาะกับแต่ละหน้าของลูกบาศก์"],
  ["matrix-grid-cube", "Matrix Grid Cube", "cube", 590, 4, { hue: 0.35 }, "กริดดิจิทัลพร้อมแสงสแกน ให้ลุคเทคโนโลยีสำหรับงาน Cube Mapping"],
  ["golden-temple-aura", "Golden Temple Aura", "organic", 1290, 5, { hue: 0.1, scale: 1.2 }, "ออร่าสีทองไหลเหมือนควันแสง เหมาะกับสถาปัตยกรรมไทยและวัตถุทรงอิสระ"],
  ["liquid-light-form", "Liquid Light Form", "organic", 790, 5, { hue: 0.55, scale: 2 }, "แสงเหลวโทนฟ้าน้ำทะเล เคลื่อนไหวช้า ๆ สำหรับประติมากรรมและผิวโค้ง"],
  ["spectrum-drift", "Spectrum Drift", "abstract", 390, 2, { scale: 0.5, speed: 0.6 }, "สเปกตรัมสีลอยช้า ๆ สำหรับงาน Light Art แบบนามธรรม"],
  ["violet-pulse-rings", "Violet Pulse Rings", "abstract", 350, 3, { hue: 0.78, scale: 1.6 }, "วงแหวนสีม่วงกระจายเป็นจังหวะ จับคู่กับเพลงได้ดีเมื่อเปิด Audio Reactive"],
  ["starfall-particles", "Starfall Particles", "particle", 590, 6, { hue: 0.12 }, "อนุภาคแสงสีอุ่นร่วงลงเหมือนดาวตก ใช้เป็นเลเยอร์ทับงานอื่นได้"],
  ["ocean-sparkle", "Ocean Sparkle", "particle", 450, 6, { hue: 0.52, scale: 1.6 }, "ประกายแสงโทนฟ้าระยิบระยับ ให้บรรยากาศใต้ทะเล"],
  ["prism-triangles", "Prism Triangles", "geometric", 690, 7, { hue: 0.75 }, "สามเหลี่ยมปริซึมกระพริบเป็นจังหวะ สร้างมิติแบบ 3D บนพื้นผิวเรียบ"],
  ["tumbling-facets", "Tumbling Facets", "geometric", 1490, 7, { hue: 0.05, scale: 1.8, speed: 0.6 }, "เหลี่ยมเพชรโทนส้มพลิกไปมาช้า ๆ สำหรับงานหน้าอาคารขนาดใหญ่"],
];

export const PRODUCTS = RAW.map(([slug, title, category, price, fx, p, description], i) => ({
  slug, title, category, priceSatang: price * 100, fx, description, sortOrder: i,
  params: { ...DEF, hue: FX_HUE[fx], ...p },
}));

/** ไฟล์สินค้า = ไฟล์โปรเจกต์ LUMINA v2 ที่มีเลเยอร์ตั้งต้น 1 ชั้น */
export function manifestFor(p) {
  return {
    app: "LUMINA STUDIO",
    version: 2,
    kind: "preset",
    project: {
      name: p.title,
      dur: 10,
      surfaces: [{
        name: p.title, fx: p.fx, p: p.params, blend: "add", mode: "pin", n: 1,
        pts: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.75], [0.7, 0.75]],
        mask: [], maskInv: false, media: null, tin: 0, tout: null, vis: true,
      }],
    },
  };
}
