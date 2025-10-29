// src/app/admin/setting/name/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import api, { buildUrl } from "@/lib/api";
import axios, { AxiosError } from "axios";

const BRANDING_GET = "/api/settings/branding";
const BRANDING_SAVE = "/api/settings/branding";        // PUT multipart: siteName (text), removeLogo (text), logo (file)
const BRANDING_DELETE_LOGO = "/api/settings/branding/logo";

type Branding = { siteName: string; logoUrl?: string | null };

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string>("");
  const [ok, setOk]           = useState<string>("");

  const [siteName, setSiteName] = useState("");
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);

  const [newLogo, setNewLogo]     = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // load ปัจจุบัน
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get<Branding>(BRANDING_GET, { headers: { "Cache-Control": "no-cache" } });
        const b = res.data ?? { siteName: "" };
        setSiteName(b.siteName || "");
        setLogoUrl(b.logoUrl ? buildUrl(b.logoUrl) : null);
      } catch (e) {
        setError(asMsg(e, "Failed to load branding settings."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // เลือกไฟล์
  const onPickLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setNewLogo(f);
    setRemoveLogo(false);              // ถ้าเลือกไฟล์ใหม่ จะไม่นับเป็นลบโลโก้
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const onRemoveCurrent = () => {
    setRemoveLogo(true);               // ติ๊กว่าจะลบโลโก้เดิมเมื่อกดบันทึก
    if (preview) URL.revokeObjectURL(preview);
    setNewLogo(null);
    setPreview(null);
  };

  const onCancelNew = () => {
    if (preview) URL.revokeObjectURL(preview);
    setNewLogo(null);
    setPreview(null);
  };

  // บันทึก
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setOk("");

    const name = siteName.trim();
    if (!name) { setError("กรอกชื่อเว็บไซต์ก่อน"); return; }

    setSaving(true);
    try {
      const form = new FormData();
      // ❗ ส่งเป็น text ปกติ ไม่ใช่ Blob(JSON)
      form.append("siteName", name);
      form.append("removeLogo", String(removeLogo));      // "true" | "false"
      if (newLogo) form.append("logo", newLogo);          // file part: "logo"

      const res = await api.put<Branding>(BRANDING_SAVE, form);
      const b = res.data;

      setSiteName(b?.siteName ?? name);
      setLogoUrl(b?.logoUrl ? buildUrl(b.logoUrl) : (removeLogo ? null : logoUrl));
      setOk("บันทึกสำเร็จ");

      // reset state
      if (preview) URL.revokeObjectURL(preview);
      setNewLogo(null);
      setPreview(null);
      setRemoveLogo(false);
    } catch (e) {
      // fallback: ถ้า BE ไม่รองรับ removeLogo ให้ลอง DELETE โลโก้
      if (removeLogo && !newLogo) {
        try {
          await api.delete(BRANDING_DELETE_LOGO);
          setLogoUrl(null);
          setOk("ลบโลโก้สำเร็จ");
          setRemoveLogo(false);
          return;
        } catch (ex) {
          setError(asMsg(ex, "บันทึกไม่สำเร็จ"));
          return;
        }
      }
      setError(asMsg(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Logo & Website name</h1>
        <p className="text-sm text-gray-500">ตั้งค่าโลโก้และชื่อเว็บไซต์ที่จะแสดงบนหน้าเว็บ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Website name */}
        <div>
          <label htmlFor="sitename" className="mb-1 block text-sm font-medium text-gray-700">Website name</label>
          <input
            id="sitename"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="เช่น StyleWhere"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-0 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
          <p className="mt-1 text-xs text-gray-500">จะแสดงบน Navbar / Title ตามที่คุณนำไปใช้</p>
        </div>

        {/* Logo */}
        <div className="grid gap-4 md:grid-cols-[160px,1fr] md:items-start">
          <div>
            <div className="text-sm font-medium text-gray-700">Logo</div>
            <div className="mt-2 flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border bg-gray-50">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="h-full w-full object-contain" />
              ) : logoUrl && !removeLogo ? (
                <Image src={logoUrl} alt="current logo" width={144} height={144} className="object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">อัปโหลดโลโก้ใหม่</label>
              <input
                type="file"
                accept="image/*"
                onChange={onPickLogo}
                className="w-full text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
              />
              <p className="mt-1 text-xs text-gray-500">แนะนำ PNG พื้นโปร่ง 256×256 ขึ้นไป</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {newLogo && (
                <button
                  type="button"
                  onClick={onCancelNew}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิกรูปใหม่
                </button>
              )}
              {(logoUrl || preview) && (
                <button
                  type="button"
                  onClick={onRemoveCurrent}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    removeLogo && !newLogo
                      ? "bg-red-600 text-white"
                      : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
                  title="ลบโลโก้ปัจจุบัน"
                >
                  {removeLogo && !newLogo ? "จะลบโลโก้เมื่อบันทึก" : "ลบโลโก้ปัจจุบัน"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {ok &&    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-28 w-full animate-pulse rounded bg-gray-100" />
        </div>
      )}
    </div>
  );
}

// helper แปลง error → ข้อความอ่านง่าย
function asMsg(e: unknown, fallback = "Error") {
  if (axios.isAxiosError(e)) {
    const ax = e as AxiosError<any>;
    return ax.response?.data?.message || ax.response?.data?.error || ax.message || fallback;
  }
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}
