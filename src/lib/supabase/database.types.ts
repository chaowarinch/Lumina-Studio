/**
 * ชนิดข้อมูลของฐานข้อมูล — ตรงกับ supabase/migrations/20261117000001_phase2_init.sql
 * (เมื่อเชื่อม Supabase CLI แล้ว สร้างใหม่ได้ด้วย `supabase gen types typescript`)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          data: Json;
          thumbnail_path: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name?: string;
          data: Json;
          thumbnail_path?: string | null;
        };
        Update: { name?: string; data?: Json; thumbnail_path?: string | null };
        Relationships: [];
      };
      media_assets: {
        Row: {
          id: string;
          owner_id: string;
          kind: "image" | "video";
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          file_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          kind: "image" | "video";
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          file_name?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];
