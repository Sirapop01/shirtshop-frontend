"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import { useAddress } from "@/context/AddressContext";
import type { Address } from "@/context/AddressContext";
import { useThaiLocations } from "@/lib/useThaiLocations";

/* ---------------- Schema ---------------- */
const schema = z.object({
  fullName: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  phone: z.string().regex(/^0\\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  addressLine1: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณาเลือกจังหวัด"),
  district: z.string().min(1, "กรุณาเลือกอำเภอ/เขต"),
  subdistrict: z.string().min(1, "กรุณาเลือกตำบล/แขวง"),
  postalCode: z.string().regex(/^\\d{5}$/, "รหัสไปรษณีย์ไม่ถูกต้อง"),
  isDefault: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function AddressPage() {
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

  /* ---------- Guard เคลียร์ค่าเฉพาะตอนผู้ใช้เปลี่ยนเอง ---------- */
  const hydratingRef = useRef(false);
  const pendingRef = useRef<{ province?: string; district?: string; subdistrict?: string } | null>(null);

  useEffect(() => { if (!hydratingRef.current) { setValue("district",""); setValue("subdistrict",""); setValue("postalCode",""); } }, [selectedProvince, setValue]);
  useEffect(() => { if (!hydratingRef.current) { setValue("subdistrict",""); setValue("postalCode",""); } }, [selectedDistrict, setValue]);

  // auto ZIP
  useEffect(() => {
    if (!selectedSubdistrict) return;
    const zip = getZipByTambonName(selectedSubdistrict);
    if (zip) setValue("postalCode", zip);
  }, [selectedSubdistrict, getZipByTambonName, setValue]);

  // โหลดรายการจาก backend
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  /* ---------- Hydrate: province -> district -> subdistrict ---------- */
  useEffect(() => {
    if (hydratingRef.current && pendingRef.current?.district && selectedProvince) {
      const amphures = getAmphuresOfProvince(selectedProvince);
      if (amphures.some(a => String(a.id) === String(pendingRef.current!.district))) {
        setValue("district", String(pendingRef.current!.district));
        pendingRef.current = { ...pendingRef.current, district: undefined };
      }
    }
  }, [selectedProvince, getAmphuresOfProvince, setValue]);

  useEffect(() => {
    if (hydratingRef.current && pendingRef.current?.subdistrict && selectedDistrict) {
      const tambons = getTambonsOfAmphure(selectedDistrict);
      const tName = String(pendingRef.current!.subdistrict);
      if (tambons.some(t => String(t.name_th) === tName)) {
        setValue("subdistrict", tName);
        const zip = getZipByTambonName(tName);
        if (zip) setValue("postalCode", zip);
        pendingRef.current = null;
        hydratingRef.current = false;
      }
    }
  }, [selectedDistrict, getTambonsOfAmphure, getZipByTambonName, setValue]);

  /* ---------- Actions ---------- */
  const onSubmit = async (data: FormValues) => {
    Swal.fire({ title: "กำลังบันทึก...", allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      if (editing?.id) await updateAddress(editing.id, data);
      else await addAddress(data);
      reset(); setEditing(null);
      await refresh();
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1000, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: e?.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const onDelete = async (id: string) => {
    if (!id) return;
    const res = await Swal.fire({ icon: "warning", title: "ลบที่อยู่นี้?", showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก" });
    if (!res.isConfirmed) return;
    Swal.fire({ title: "กำลังลบ...", allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });
    try {
      await removeAddress(id);
      await refresh();
      Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 800, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: e?.message ?? "เกิดข้อผิดพลาด" });
    }
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

  /* ---------- Options ---------- */
  const amphures = selectedProvince ? getAmphuresOfProvince(selectedProvince) : [];
  const tambons = selectedDistrict ? getTambonsOfAmphure(selectedDistrict) : [];
  const currentDefault = addresses.find(a => a.isDefault);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">ที่อยู่จัดส่ง</h1>

      {currentDefault && (
        <div className="flex items-start gap-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <span className="mt-0.5">★</span>
          <div>
            <div className="font-medium">ที่อยู่ค่าเริ่มต้นปัจจุบัน</div>
            <div>
              {currentDefault.fullName} — {currentDefault.addressLine1},{" "}
              {currentDefault.subdistrict} {getAmphureNameById(String(currentDefault.district)) ?? currentDefault.district}{" "}
              {getProvinceNameById(String(currentDefault.province)) ?? currentDefault.province} {currentDefault.postalCode}
            </div>
          </div>
        </div>
      )}

      {locError && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          โหลดข้อมูลจังหวัด/อำเภอ/ตำบลจากอินเทอร์เน็ตไม่สำเร็จ—กำลังใช้ข้อมูลออฟไลน์
        </div>
      )}

      {/* ฟอร์ม */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded">
        <div className="md:col-span-2">
          <label className="text-sm">ชื่อ-นามสกุล</label>
          <input className="w-full border p-2 rounded" {...register("fullName")} autoComplete="name" />
          <p className="text-xs text-red-600">{errors.fullName?.message}</p>
        </div>

        <div>
          <label className="text-sm">เบอร์โทร</label>
          <input className="w-full border p-2 rounded" {...register("phone")} inputMode="numeric" autoComplete="tel" />
          <p className="text-xs text-red-600">{errors.phone?.message}</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm">ที่อยู่</label>
          <input className="w-full border p-2 rounded" {...register("addressLine1")} autoComplete="street-address" />
          <p className="text-xs text-red-600">{errors.addressLine1?.message}</p>
        </div>

        <div>
          <label className="text-sm">จังหวัด</label>
          <select className="w-full border p-2 rounded" disabled={locLoading} {...register("province")}>
            <option value="">-- เลือกจังหวัด --</option>
            {provinces.map((p) => (<option key={p.id} value={String(p.id)}>{p.name_th}</option>))}
          </select>
          <p className="text-xs text-red-600">{errors.province?.message}</p>
        </div>

        <div>
          <label className="text-sm">อำเภอ/เขต</label>
          <select className="w-full border p-2 rounded" disabled={locLoading || !selectedProvince} {...register("district")}>
            <option value="">-- เลือกอำเภอ/เขต --</option>
            {amphures.map((d) => (<option key={d.id} value={String(d.id)}>{d.name_th}</option>))}
          </select>
          <p className="text-xs text-red-600">{errors.district?.message}</p>
        </div>

        <div>
          <label className="text-sm">ตำบล/แขวง</label>
          <select className="w-full border p-2 rounded" disabled={locLoading || !selectedDistrict} {...register("subdistrict")}>
            <option value="">-- เลือกตำบล/แขวง --</option>
            {tambons.map((s) => (<option key={s.id} value={s.name_th}>{s.name_th}</option>))}
          </select>
          <p className="text-xs text-red-600">{errors.subdistrict?.message}</p>
        </div>

        <div>
          <label className="text-sm">รหัสไปรษณีย์</label>
          <input className="w-full border p-2 rounded" {...register("postalCode")} readOnly />
          <p className="text-xs text-red-600">{errors.postalCode?.message}</p>
        </div>

        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" {...register("isDefault")} /> ตั้งเป็นที่อยู่เริ่มต้น
        </label>

        <div className="md:col-span-2 flex gap-2">
          <button className="bg-black text-white px-4 py-2 rounded" disabled={isSubmitting} type="submit">
            {editing ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}
          </button>
          {editing && (
            <button
              type="button"
              className="px-4 py-2 border rounded"
              onClick={() => {
                setEditing(null);
                reset({
                  fullName: "", phone: "", addressLine1: "",
                  province: "", district: "", subdistrict: "",
                  postalCode: "", isDefault: false,
                });
              }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {/* รายการที่อยู่ */}
      <div className="space-y-3">
        {addresses.map((a) => {
          const provinceName = a.province ? (getProvinceNameById(String(a.province)) ?? String(a.province)) : "";
          const districtName = a.district ? (getAmphureNameById(String(a.district)) ?? String(a.district)) : "";
          const cardClass = a.isDefault ? "border-2 border-green-500 bg-green-50" : "border rounded";

          return (
            <div key={a.id} className={`${cardClass} rounded p-4 flex justify-between`}>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {a.fullName}
                  {a.isDefault && (
                    <span className="ml-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                      ★ ค่าเริ่มต้น
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{a.phone}</div>
                <div className="text-sm">{a.addressLine1}</div>
                <div className="text-sm">
                  {a.subdistrict} {districtName} {provinceName} {a.postalCode}
                </div>
              </div>

              <div className="flex gap-2 items-start">
                {!a.isDefault && (
                  <button
                    className="px-3 py-1 border rounded hover:bg-green-50"
                    onClick={() => a.id && onSetDefault(a.id)}
                    title="ตั้งเป็นค่าเริ่มต้น"
                  >
                    ตั้งเป็นค่าเริ่มต้น
                  </button>
                )}

                <button
                  className="px-3 py-1 border rounded"
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
                    setValue("isDefault", Boolean(a.isDefault)); // ติ๊กให้ถ้าเป็น default
                    setEditing(a);
                  }}
                >
                  แก้ไข
                </button>

                <button className="px-3 py-1 border rounded text-red-600" onClick={() => a.id && onDelete(a.id!)}>
                  ลบ
                </button>
              </div>
            </div>
          );
        })}
        {addresses.length === 0 && <p className="text-gray-500">ยังไม่มีที่อยู่ เพิ่มใหม่ด้านบนได้เลย</p>}
      </div>
    </div>
  );
}
