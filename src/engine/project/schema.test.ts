import { describe, expect, it } from "vitest";
import { sampleProject } from "./factory";
import { parseProject, parseProjectJson, serializeProject } from "./schema";

/** ตัดตอนมาจากไฟล์ที่ส่งออกจาก prototype/index.html (version 2) */
const PROTOTYPE_FILE = `{"app":"LUMINA STUDIO","version":2,"project":{"name":"Facade Show – ตัวอย่าง","dur":10,
"surfaces":[{"id":"abc1234","name":"ผนังซ้าย","fx":2,"p":{"intensity":1,"speed":1,"hue":0,"scale":1.2,"opacity":1,"feather":0,"audio":0},
"blend":"add","mode":"pin","n":1,"pts":[[0.2,0.2],[0.42,0.24],[0.2,0.92],[0.42,0.9]],"mask":[],"maskInv":false,"media":"zz9","tin":0,"tout":null,"vis":true},
{"id":"def5678","name":"mesh","fx":4,"p":{"intensity":1,"speed":1,"hue":0.5,"scale":0.9,"opacity":1,"feather":0,"audio":0},"blend":"normal","mode":"mesh","n":2,
"pts":[[0,0],[0.5,0],[1,0],[0,0.5],[0.5,0.5],[1,0.5],[0,1],[0.5,1],[1,1]],"mask":[[0.1,0.1],[0.9,0.1],[0.5,0.9]],"maskInv":true,"media":null,"tin":1,"tout":8,"vis":false}],"ref":"sample"}}`;

describe("project schema", () => {
  it("อ่านไฟล์ที่ส่งออกจากต้นแบบได้", () => {
    const r = parseProjectJson(PROTOTYPE_FILE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.surfaces).toHaveLength(2);
    expect(r.project.surfaces[1]).toMatchObject({ mode: "mesh", n: 2, maskInv: true, tout: 8, vis: false, blend: "normal" });
    expect(r.project.surfaces[0].media).toBeNull();
  });

  it("serialize → parse ได้ข้อมูลเดิม", () => {
    const p = sampleProject();
    const r = parseProjectJson(serializeProject(p));
    expect(r.ok && r.project).toEqual(p);
  });

  it("รับ project เปล่า ๆ ที่ไม่มี envelope", () => {
    expect(parseProject(sampleProject()).ok).toBe(true);
  });

  it("เติมค่าเริ่มต้นที่หายไป", () => {
    const r = parseProject({ surfaces: [{ fx: 1, pts: [[0, 0], [1, 0], [0, 1], [1, 1]] }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.project.surfaces[0];
    expect(s).toMatchObject({ blend: "add", mode: "pin", n: 1, vis: true, tin: 0, tout: null });
    expect(s.p.hue).toBe(0.92);
    expect(s.id).toBeTruthy();
    expect(r.project.dur).toBe(10);
  });

  it("ปฏิเสธไฟล์เสีย", () => {
    expect(parseProjectJson("not json").ok).toBe(false);
    expect(parseProject({ foo: 1 }).ok).toBe(false);
    expect(parseProject({ surfaces: [{ fx: 99, pts: [] }] }).ok).toBe(false);
    // จำนวนจุดไม่ตรงกับ n
    expect(parseProject({ surfaces: [{ fx: 1, mode: "mesh", n: 3, pts: [[0, 0]] }] }).ok).toBe(false);
    expect(parseProject({ surfaces: [{ fx: 1, pts: [[0, 0], [1, 0], [0, 1], [NaN, 1]] }] }).ok).toBe(false);
  });

  it("แก้ id ซ้ำและช่วงเวลาที่ผิด", () => {
    const pts = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const r = parseProject({ dur: 500, surfaces: [{ id: "a", fx: 1, pts }, { id: "a", fx: 1, pts, tin: 5, tout: 2 }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(new Set(r.project.surfaces.map((s) => s.id)).size).toBe(2);
    expect(r.project.surfaces[1].tout).toBe(5.5);
    expect(r.project.dur).toBe(120);
  });
});
