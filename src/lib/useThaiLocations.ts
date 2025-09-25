"use client";

import { useMemo } from "react";

// เปลี่ยน path ให้ตรงกับโปรเจกต์คุณ
import { provinces as provincesData } from "@/data/th/provinces";
import { amphures as amphuresData } from "@/data/th/amphures";
import { tambons as tambonsData } from "@/data/th/tambons";

// ---------------- Types (ยืดหยุ่นเรื่อง number/string) ----------------
export interface Province { id: number | string; name_th: string; name_en?: string }
export interface Amphure  { id: number | string; province_id: number | string; name_th: string }
export interface Tambon   { id: number | string; amphure_id: number | string; name_th: string; zip_code?: number | string }

// ---------------- Utils ----------------
const key = (v: string | number | undefined | null) => String(v ?? "");

// ---------------- Hook หลัก (ใช้ data local 100%) ----------------
export function useThaiLocations() {
  // normalize และ index ข้อมูลครั้งเดียว
  const { provinces, amphuresByProvince, tambonsByAmphure, zipByTambonName, amphureNameById, provinceNameById } =
    useMemo(() => {
      // provinces
      const provs: Province[] = (provincesData as any[]).map((p) => ({
        id: p.id,
        name_th: p.name_th ?? p.name ?? "", // กันกรณีฟิลด์ชื่อไม่ตรง
        name_en: p.name_en,
      }));

      // amphures
      const amphures: Amphure[] = (amphuresData as any[]).map((a) => ({
        id: a.id,
        province_id: a.province_id ?? a.provinceId,
        name_th: a.name_th ?? a.name ?? "",
      }));

      // tambons
      const tambons: Tambon[] = (tambonsData as any[]).map((t) => ({
        id: t.id,
        amphure_id: t.amphure_id ?? t.amphureId,
        name_th: t.name_th ?? t.name ?? "",
        zip_code: t.zip_code ?? t.zipCode,
      }));

      // index: province -> amphures
      const amphuresByProvince = new Map<string, Amphure[]>();
      for (const a of amphures) {
        const k = key(a.province_id);
        if (!amphuresByProvince.has(k)) amphuresByProvince.set(k, []);
        amphuresByProvince.get(k)!.push(a);
      }

      // index: amphure -> tambons
      const tambonsByAmphure = new Map<string, Tambon[]>();
      for (const t of tambons) {
        const k = key(t.amphure_id);
        if (!tambonsByAmphure.has(k)) tambonsByAmphure.set(k, []);
        tambonsByAmphure.get(k)!.push(t);
      }

      // map: tambonName -> zip (ถ้าชื่อซ้ำจะเลือกตัวแรก)
      const zipByTambonName = new Map<string, string>();
      for (const t of tambons) {
        const name = (t.name_th ?? "").trim();
        const zip = t.zip_code != null ? key(t.zip_code) : "";
        if (name && zip && !zipByTambonName.has(name)) {
          zipByTambonName.set(name, zip);
        }
      }

      // map สำหรับแสดงชื่อจาก id
      const provinceNameById = new Map<string, string>();
      for (const p of provs) provinceNameById.set(key(p.id), p.name_th);

      const amphureNameById = new Map<string, string>();
      for (const a of amphures) amphureNameById.set(key(a.id), a.name_th);

      return { provinces: provs, amphuresByProvince, tambonsByAmphure, zipByTambonName, amphureNameById, provinceNameById };
    }, []);

  // ---------- ฟังก์ชันที่หน้า UI เรียกใช้ ----------
  const getAmphuresOfProvince = (provinceId: string) =>
    amphuresByProvince.get(key(provinceId)) ?? [];

  const getTambonsOfAmphure = (amphureId: string) =>
    tambonsByAmphure.get(key(amphureId)) ?? [];

  const getZipByTambonName = (tambonName: string) =>
    zipByTambonName.get((tambonName ?? "").trim());

  const getProvinceNameById = (provinceId: string) =>
    provinceNameById.get(key(provinceId));

  const getAmphureNameById = (amphureId: string) =>
    amphureNameById.get(key(amphureId));

  return {
    // ไม่มีการโหลดจากเน็ตอีกแล้ว
    loading: false,
    error: null as string | null,

    // data
    provinces,

    // queries
    getAmphuresOfProvince,
    getTambonsOfAmphure,
    getZipByTambonName,

    // helpers (ถ้าหน้าไหนอยากแปลง id -> ชื่อโดยตรง)
    getProvinceNameById,
    getAmphureNameById,
  };
}
