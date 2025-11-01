// src/app/(site)/addresses/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import { useAddress } from "@/context/AddressContext";
import type { Address } from "@/context/AddressContext";
import { useThaiLocations } from "@/lib/useThaiLocations";

/* ---------- Fallback while suspense ---------- */
function PageFallback() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-6">
      <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </main>
  );
}

/* ========= เดิมทั้งก้อน: ย้ายมาเป็นคอมโพเนนต์ภายใน ========= */
const schema = z.object({
  fullName: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  addressLine1: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณาเลือกจังหวัด"),
  district: z.string().min(1, "กรุณาเลือกอำเภอ/เขต"),
  subdistrict: z.string().min(1, "กรุณาเลือกตำบล/แขวง"),
  postalCode: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ไม่ถูกต้อง"),
  isDefault: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10";
const selectCls = inputCls;
const labelCls = "mb-1 block text-sm font-medium text-gray-700";
const errorCls = "mt-1 text-xs text-rose-600";

function AddressesContent() {
  const { addresses, addAddress, updateAddress, removeAddress, refresh, setDefault } = useAddress();

  const {
    loading: locLoading,
    error: locError,
    provinces,
    getAmphuresOfProvince,
    getTambonsOfAmphure,
    getZipByTambonName,
    getProvinceNameById,
    getAmphureNameById,
  } = useThaiLocations();

  const [editing, setEditing] = useState<Address | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      addressLine1: "",
      province: "",
      district: "",
      subdistrict: "",
      postalCode: "",
      isDefault: false,
    },
  });

  const selectedProvince = watch("province");
  const selectedDistrict = watch("district");
  const selectedSubdistrict = watch("subdistrict");

  const hydratingRef = useRef(false);
  const pendingRef = useRef<{ province?: string; district?: string; subdistrict?: string } | null>(null);

  useEffect(() => {
    if (!hydratingRef.current) {
      setValue("district", "");
      setValue("subdistrict", "");
      setValue("postalCode", "");
    }
  }, [selectedProvince, setValue]);

  useEffect(() => {
    if (!hydratingRef.current) {
      setValue("subdistrict", "");
      setValue("postalCode", "");
    }
  }, [selectedDistrict, setValue]);

  useEffect(() => {
    if (!selectedSubdistrict) return;
    const zip = getZipByTambonName(selectedSubdistrict);
    if (zip) setValue("postalCode", zip);
  }, [selectedSubdistrict, getZipByTambonName, setValue]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (hydratingRef.current && pendingRef.current?.district && selectedProvince) {
      const amphures = getAmphuresOfProvince(selectedProvince);
      if (amphures.some((a) => String(a.id) === String(pendingRef.current!.district))) {
        setValue("district", String(pendingRef.current!.district));
        pendingRef.current = { ...pendingRef.current, district: undefined };
      }
    }
  }, [selectedProvince, getAmphuresOfProvince, setValue]);

  useEffect(() => {
    if (hydratingRef.current && pendingRef.current?.subdistrict && selectedDistrict) {
      const tambons = getTambonsOfAmphure(selectedDistrict);
      const tName = String(pendingRef.current!.subdistrict);
      if (tambons.some((t) => String(t.name_th) === tName)) {
        setValue("subdistrict", tName);
        const zip = getZipByTambonName(tName);
        if (zip) setValue("postalCode", zip);
        pendingRef.current = null;
        hydratingRef.current = false;
      }
    }
  }, [selectedDistrict, getTambonsOfAmphure, getZipByTambonName, setValue]);

  const onSubmit = async (data: FormValues) => {
    Swal.fire({
      title: "กำลังบันทึก...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      if (editing?.id) await updateAddress(editing.id, data);
      else await addAddress(data);
      reset();
      setEditing(null);
      await refresh();
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1000, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: e?.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const onDelete = (id: string) => {
    if (!id) return;
    Swal.fire({
      icon: "warning",
      title: "ลบที่อยู่นี้?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      focusCancel: true,
      reverseButtons: true,
    }).then((res) => {
      if (!res.isConfirmed) return;

      Swal.fire({
        title: "กำลังลบ...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      removeAddress(id)
        .then(() => refresh())
        .then(() => {
          Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 800, showConfirmButton: false });
        })
        .catch((e: any) => {
          Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: e?.message ?? "เกิดข้อผิดพลาด" });
        });
    });
  };

  const onSetDefault = async (id: string) => {
    if (!id) return;
    Swal.fire({ title: "กำลังตั้งค่าเริ่มต้น...", allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      await setDefault(id);
      await refresh();
      Swal.fire({ icon: "success", title: "ตั้งค่าเริ่มต้นแล้ว", timer: 800, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "ตั้งค่าเริ่มต้นไม่สำเร็จ", text: e?.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const amphures = selectedProvince ? getAmphuresOfProvince(selectedProvince) : [];
  const tambons = selectedDistrict ? getTambonsOfAmphure(selectedDistrict) : [];
  const currentDefault = addresses.find((a) => a.isDefault);

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-6">
      {/* Section header */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">ที่อยู่จัดส่ง</h1>
        <p className="mt-1 text-sm text-gray-500">เพิ่ม/แก้ไขที่อยู่และกำหนดค่าเริ่มต้นสำหรับการสั่งซื้อ</p>
      </section>

      {currentDefault && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-800">
          <div className="font-medium">ที่อยู่ค่าเริ่มต้นปัจจุบัน</div>
          <div className="mt-0.5">
            {currentDefault.fullName} — {currentDefault.addressLine1},{" "}
            {currentDefault.subdistrict} {getAmphureNameById(String(currentDefault.district)) ?? currentDefault.district}{" "}
            {getProvinceNameById(String(currentDefault.province)) ?? currentDefault.province} {currentDefault.postalCode}
          </div>
        </section>
      )}

      {/* แจ้งเตือนโหลดตำแหน่ง */}
      {locError && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          โหลดข้อมูลจังหวัด/อำเภอ/ตำบลจากอินเทอร์เน็ตไม่สำเร็จ—กำลังใช้ข้อมูลออฟไลน์
        </section>
      )}

      {/* ฟอร์ม */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        {editing && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
            กำลังแก้ไขที่อยู่เดิม —{" "}
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => {
                setEditing(null);
                reset({
                  fullName: "",
                  phone: "",
                  addressLine1: "",
                  province: "",
                  district: "",
                  subdistrict: "",
                  postalCode: "",
                  isDefault: false,
                });
              }}
            >
              ยกเลิกโหมดแก้ไข
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>ชื่อ-นามสกุล</label>
            <input className={inputCls} {...register("fullName")} autoComplete="name" />
            {errors.fullName && <p className={errorCls}>{errors.fullName.message}</p>}
          </div>

          <div>
            <label className={labelCls}>เบอร์โทร</label>
            <input className={inputCls} {...register("phone")} inputMode="numeric" autoComplete="tel" />
            {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>ที่อยู่</label>
            <input className={inputCls} {...register("addressLine1")} autoComplete="street-address" />
            {errors.addressLine1 && <p className={errorCls}>{errors.addressLine1.message}</p>}
          </div>

          <div>
            <label className={labelCls}>จังหวัด</label>
            <select className={selectCls} disabled={locLoading} {...register("province")}>
              <option value="">{locLoading ? "กำลังโหลดจังหวัด..." : "-- เลือกจังหวัด --"}</option>
              {provinces.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name_th}
                </option>
              ))}
            </select>
            {errors.province && <p className={errorCls}>{errors.province.message}</p>}
          </div>

          <div>
            <label className={labelCls}>อำเภอ/เขต</label>
            <select className={selectCls} disabled={locLoading || !selectedProvince} {...register("district")}>
              <option value="">
                {!selectedProvince ? "เลือกจังหวัดก่อน" : locLoading ? "กำลังโหลด..." : "-- เลือกอำเภอ/เขต --"}
              </option>
              {getAmphuresOfProvince(selectedProvince).map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name_th}
                </option>
              ))}
            </select>
            {errors.district && <p className={errorCls}>{errors.district.message}</p>}
          </div>

          <div>
            <label className={labelCls}>ตำบล/แขวง</label>
            <select className={selectCls} disabled={locLoading || !selectedDistrict} {...register("subdistrict")}>
              <option value="">
                {!selectedDistrict ? "เลือกอำเภอ/เขตก่อน" : locLoading ? "กำลังโหลด..." : "-- เลือกตำบล/แขวง --"}
              </option>
              {getTambonsOfAmphure(selectedDistrict).map((s) => (
                <option key={s.id} value={s.name_th}>
                  {s.name_th}
                </option>
              ))}
            </select>
            {errors.subdistrict && <p className={errorCls}>{errors.subdistrict.message}</p>}
          </div>

          <div>
            <label className={labelCls}>รหัสไปรษณีย์</label>
            <input className={inputCls} {...register("postalCode")} readOnly />
            {errors.postalCode && <p className={errorCls}>{errors.postalCode.message}</p>}
          </div>

          <label className="md:col-span-2 mt-1 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register("isDefault")} /> ตั้งเป็นที่อยู่เริ่มต้น
          </label>

          <div className="md:col-span-2 mt-2 flex flex-wrap gap-2">
            <button
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:bg-gray-300"
              disabled={isSubmitting}
              type="submit"
            >
              {editing ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}
            </button>
            {editing && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                onClick={() => {
                  setEditing(null);
                  reset({
                    fullName: "",
                    phone: "",
                    addressLine1: "",
                    province: "",
                    district: "",
                    subdistrict: "",
                    postalCode: "",
                    isDefault: false,
                  });
                }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      {/* รายการที่อยู่ */}
      <section className="space-y-3">
        {addresses.map((a) => {
          const provinceName = a.province ? getProvinceNameById(String(a.province)) ?? String(a.province) : "";
          const districtName = a.district ? getAmphureNameById(String(a.district)) ?? String(a.district) : "";
          const defaultBadge = a.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ค่าเริ่มต้น
            </span>
          ) : null;

          return (
            <div
              key={a.id}
              className={[
                "rounded-2xl border px-5 py-4 shadow-sm bg-white",
                a.isDefault ? "border-emerald-300 bg-emerald-50" : "border-gray-200",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-gray-900">{a.fullName}</div>
                    {defaultBadge}
                  </div>
                  <div className="text-sm text-gray-600">{a.phone}</div>
                  <div className="text-sm text-gray-900">{a.addressLine1}</div>
                  <div className="text-sm text-gray-900">
                    {a.subdistrict} {districtName} {provinceName} {a.postalCode}
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  {!a.isDefault && (
                    <button
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-200"
                      onClick={() => a.id && onSetDefault(a.id)}
                      title="ตั้งเป็นค่าเริ่มต้น"
                    >
                      ตั้งเป็นค่าเริ่มต้น
                    </button>
                  )}

                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
                    onClick={() => {
                      const province = a.province ? String(a.province) : "";
                      const district = a.district ? String(a.district) : "";
                      const subdistrict = a.subdistrict || "";

                      hydratingRef.current = true;
                      pendingRef.current = { province, district, subdistrict };

                      setValue("province", province);
                      setValue("fullName", a.fullName || "");
                      setValue("phone", a.phone || "");
                      setValue("addressLine1", a.addressLine1 || "");
                      setValue("postalCode", a.postalCode || "");
                      setValue("isDefault", Boolean(a.isDefault));
                      setEditing(a);
                    }}
                  >
                    แก้ไข
                  </button>

                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 hover:border-rose-200"
                    onClick={() => a.id && onDelete(a.id!)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {addresses.length === 0 && (
          <p className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">
            ยังไม่มีที่อยู่ เพิ่มใหม่ด้านบนได้เลย
          </p>
        )}
      </section>
    </main>
  );
}

/* ---------- ครอบทั้งหน้าด้วย Suspense (แก้ error) ---------- */
export default function AddressesPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AddressesContent />
    </Suspense>
  );
}
