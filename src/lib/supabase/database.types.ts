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
      products: {
        Row: {
          id: string;
          slug: string;
          creator_id: string | null;
          creator_name: string;
          title: string;
          description: string;
          category: string;
          effect_label: string;
          price_satang: number;
          status: "draft" | "published" | "archived";
          cover_url: string | null;
          preview_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      cart_items: {
        Row: { user_id: string; product_id: string; added_at: string };
        Insert: { product_id: string; user_id?: string };
        Update: never;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "paid" | "failed" | "expired" | "refunded";
          total_satang: number;
          currency: string;
          payment_method: "promptpay" | "card" | "free";
          provider: string;
          provider_charge_id: string | null;
          failure_message: string | null;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
          expires_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      order_items: {
        Row: { order_id: string; product_id: string; title: string; price_satang: number; creator_id: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      licenses: {
        Row: {
          id: string;
          license_key: string;
          user_id: string;
          product_id: string;
          order_id: string;
          status: "active" | "revoked";
          created_at: string;
          revoked_at: string | null;
        };
        Insert: never;
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

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type LicenseRow = Database["public"]["Tables"]["licenses"]["Row"];
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];
