// npm i react-hook-form zod @hookform/resolvers
// src/app/addresses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressApi } from "@/lib/addressApi";
import type { Address } from "@/types/address";

const schema = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^0\d{8,9}$/),
  addressLine1: z.string().min(1),
  province: z.string().min(1),
  district: z.string().min(1),
  subdistrict: z.string().min(1),
  postalCode: z.string().regex(/^\d{5}$/),
  isDefault: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function AddressPage() {
  const [items, setItems] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const load = async () => setItems(await addressApi.list());

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormValues) => {
    if (editing?.id) await addressApi.update(editing.id, data);
    else await addressApi.create(data);
    reset(); setEditing(null); await load();
    alert("บันทึกสำเร็จ");
  };

  const onEdit = (a: Address) => {
    setEditing(a);
    reset({ ...a });
  };

  const onDelete = async (id: string) => {
    if (confirm("ลบที่อยู่นี้?")) {
      await addressApi.remove(id);
      await load();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">ที่อยู่จัดส่ง</h1>

      {/* ฟอร์ม */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded">
        <div className="md:col-span-2">
          <label className="text-sm">ชื่อ-นามสกุล</label>
          <input className="w-full border p-2 rounded" {...register("fullName")} />
          <p className="text-xs text-red-600">{errors.fullName?.message}</p>
        </div>
        <div>
          <label className="text-sm">เบอร์โทร</label>
          <input className="w-full border p-2 rounded" {...register("phone")} />
          <p className="text-xs text-red-600">{errors.phone?.message}</p>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">ที่อยู่</label>
          <input className="w-full border p-2 rounded" {...register("addressLine1")} />
          <p className="text-xs text-red-600">{errors.addressLine1?.message}</p>
        </div>
        <div>
          <label className="text-sm">จังหวัด</label>
          <input className="w-full border p-2 rounded" {...register("province")} />
          <p className="text-xs text-red-600">{errors.province?.message}</p>
        </div>
        <div>
          <label className="text-sm">อำเภอ/เขต</label>
          <input className="w-full border p-2 rounded" {...register("district")} />
          <p className="text-xs text-red-600">{errors.district?.message}</p>
        </div>
        <div>
          <label className="text-sm">ตำบล/แขวง</label>
          <input className="w-full border p-2 rounded" {...register("subdistrict")} />
          <p className="text-xs text-red-600">{errors.subdistrict?.message}</p>
        </div>
        <div>
          <label className="text-sm">รหัสไปรษณีย์</label>
          <input className="w-full border p-2 rounded" {...register("postalCode")} />
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
            <button type="button" className="px-4 py-2 border rounded" onClick={() => { setEditing(null); reset({} as any); }}>
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {/* รายการที่อยู่ */}
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="border rounded p-4 flex justify-between">
            <div>
              <div className="font-medium">
                {a.fullName} {a.isDefault && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Default</span>}
              </div>
              <div className="text-sm text-gray-600">{a.phone}</div>
              <div className="text-sm">{a.addressLine1}</div>
              <div className="text-sm">{a.subdistrict} {a.district} {a.province} {a.postalCode}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => onEdit(a)}>แก้ไข</button>
              <button className="px-3 py-1 border rounded text-red-600" onClick={() => onDelete(a.id!)}>ลบ</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500">ยังไม่มีที่อยู่ เพิ่มใหม่ด้านบนได้เลย</p>}
      </div>
    </div>
  );
}
