import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./env";

describe("normalizeSupabaseUrl", () => {
  it("ตัด path ที่ติดมา เช่น /rest/v1/", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl(' "https://abc.supabase.co" ')).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe("http://localhost:54321");
  });
  it("ค่าว่างหรือไม่ใช่ URL → ว่าง", () => {
    expect(normalizeSupabaseUrl(undefined)).toBe("");
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe("");
  });
});
