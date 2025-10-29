"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type PaymentSettings = {
  target: string;
  expireMinutes: number;
  enabled: boolean;
  updatedAt: string;
};

export default function PaymentSettingPage() {
  const [data, setData] = useState<PaymentSettings | null>(null);
  const [initial, setInitial] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // fetch once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/admin/settings/payment/promptpay");
        setData(res.data);
        setInitial(res.data);
      } catch (e: any) {
        setErr(e?.response?.data?.message || e.message);
      }
    })();
  }, []);

  const changed = useMemo(() => {
    if (!data || !initial) return false;
    return (
      data.target.trim() !== (initial.target || "").trim() ||
      Number(data.expireMinutes) !== Number(initial.expireMinutes)
    );
  }, [data, initial]);

  const validate = useMemo(() => {
    const problems: string[] = [];
    if (!data?.target?.trim()) problems.push("กรุณากรอก PromptPay Target");
    // ถ้าเป็นตัวเลขล้วน ให้ตรวจรูปแบบเบอร์ไทยแบบคร่าวๆ
    if (data?.target && /^\d+$/.test(data.target) && !/^0\d{8,9}$/.test(data.target)) {
      problems.push("รูปแบบเบอร์โทรไม่ถูกต้อง (ควรเป็น 0XXXXXXXXX)");
    }
    if (!data?.expireMinutes || data.expireMinutes < 1 || data.expireMinutes > 1440) {
      problems.push("หมดอายุ QR (นาที) ต้องอยู่ระหว่าง 1–1440");
    }
    return problems;
  }, [data]);

  const onSave = async () => {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api.put("/api/admin/settings/payment/promptpay", {
        target: data.target.trim(),
        expireMinutes: Number(data.expireMinutes),
      });
      setData(res.data);
      setInitial(res.data);
      setMsg("บันทึกการตั้งค่าเรียบร้อย");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200"></div>
        <div className="mt-4 h-28 w-full animate-pulse rounded-xl bg-zinc-100"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment → PromptPay</h1>
          <p className="mt-1 text-sm text-zinc-600">
            ตั้งค่าเบอร์/พร้อมเพย์ไอดี และระยะเวลาหมดอายุของ QR สำหรับออเดอร์ใหม่
          </p>
        </div>
        {data.updatedAt && (
          <div className="text-xs text-zinc-500">
            อัปเดตล่าสุด: {new Date(data.updatedAt).toLocaleString("th-TH")}
          </div>
        )}
      </div>

      {/* Alerts */}
      {msg && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}
      {validate.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <ul className="list-inside list-disc space-y-1">
            {validate.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">PromptPay Settings</h2>
        </div>

        <div className="space-y-5 px-5 pb-5 pt-4">
          {/* Target */}
            <div>
            <label className="mb-1 block text-sm font-medium">
                Target (เบอร์/พร้อมเพย์ไอดี)
            </label>

            <div className="flex">
                {/* Prefix */}
                <div className="inline-flex items-center rounded-l-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">
                +66
                </div>

                {/* Input */}
                <input
                className="w-full rounded-r-lg border border-l-0 border-zinc-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
                value={data.target}
                onChange={(e) => setData({ ...data, target: e.target.value })}
                placeholder="08xxxxxxxx หรือ Proxy ID"
                inputMode="numeric"
                autoComplete="off"
                />
            </div>

            <p className="mt-1 text-xs text-zinc-500">
                แนะนำให้กรอกเป็นเบอร์โทร 10 หลัก (เช่น 08xxxxxxxx) หรือ Proxy ID จากธนาคาร
            </p>
            </div>

          {/* Expire minutes */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              หมดอายุ QR (นาที)
            </label>
            <input
              type="number"
              min={1}
              max={1440}
              className="w-40 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-900"
              value={data.expireMinutes}
              onChange={(e) =>
                setData({ ...data, expireMinutes: Number(e.target.value) })
              }
            />
            <p className="mt-1 text-xs text-zinc-500">
              ใช้กับออเดอร์ใหม่เท่านั้น ออเดอร์ที่สร้างไปแล้วจะไม่เปลี่ยนตาม
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={saving || !changed || validate.length > 0}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              title={
                validate.length > 0
                  ? "กรอกข้อมูลให้ถูกต้องก่อน"
                  : !changed
                  ? "ไม่มีการเปลี่ยนแปลง"
                  : ""
              }
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {changed && (
              <button
                onClick={() => {
                  if (initial) setData(initial);
                  setMsg(null);
                  setErr(null);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* หมายเหตุระบบ */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        • หน้านี้ปรับเฉพาะ “ค่าเริ่มต้น” สำหรับการสร้างออเดอร์ใหม่<br />
        • หน้า Checkout จะใช้ค่า <span className="font-medium">ที่ถูก snapshot</span> ตอนสร้างออเดอร์
        (เบอร์/QR ของออเดอร์เก่าจะไม่เปลี่ยนตาม)
      </div>
    </div>
  );
}
