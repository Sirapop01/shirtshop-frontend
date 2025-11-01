// src/app/(account)/change-password/page.tsx
"use client";

import { useMemo, useState } from "react";
import { changePassword } from "@/lib/auth";

type Strength = { score: number; label: string; bar: string; text: string };

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);

  // ---------- password rules & strength ----------
  const rules = useMemo(() => {
    const hasLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNum = /\d/.test(newPassword);
    const hasSym = /[^A-Za-z0-9]/.test(newPassword);
    return { hasLen, hasUpper, hasLower, hasNum, hasSym };
  }, [newPassword]);

  const strength: Strength = useMemo(() => {
    const s =
      Number(rules.hasLen) +
      Number(rules.hasUpper) +
      Number(rules.hasLower) +
      Number(rules.hasNum) +
      Number(rules.hasSym);

    if (!newPassword) return { score: 0, label: "กรอกรหัสผ่านใหม่", bar: "w-0", text: "text-gray-500" };
    if (s <= 2) return { score: s, label: "อ่อน", bar: "w-1/4 bg-rose-500", text: "text-rose-600" };
    if (s === 3) return { score: s, label: "ปานกลาง", bar: "w-2/4 bg-amber-500", text: "text-amber-600" };
    if (s === 4) return { score: s, label: "ดี", bar: "w-3/4 bg-emerald-500", text: "text-emerald-600" };
    return { score: s, label: "แข็งแรง", bar: "w-full bg-emerald-600", text: "text-emerald-700" };
  }, [newPassword, rules]);

  const validNew = rules.hasLen; // เกณฑ์ขั้นต่ำเดิมของคุณ

  // ---------- submit ----------
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!currentPassword) return setErr("กรุณากรอกรหัสผ่านเดิม");
    if (!validNew) return setErr("รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร");
    if (newPassword !== confirm) return setErr("รหัสผ่านใหม่และยืนยันไม่ตรงกัน");

    try {
      setLoading(true);
      await changePassword({ currentPassword, newPassword });
      setMsg("เปลี่ยนรหัสผ่านสำเร็จ");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e: any) {
      const m = e?.response?.data?.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ";
      setErr(m);
    } finally {
      setLoading(false);
    }
  };

  // ---------- small UI helpers ----------
  const Eye = ({ open = false }) => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {open ? (
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-4a4 4 0 100 8 4 4 0 000-8z" />
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.2A9.9 9.9 0 0122 12s-3.5 7-10 7a10.7 10.7 0 01-4.3-.9M6.2 10.6A9.9 9.9 0 012 12s3.5 7 10 7" />
          <circle cx="12" cy="12" r="3.5" />
        </>
      )}
    </svg>
  );

  const ToggleBtn = ({
    onClick,
    label,
  }: {
    onClick: () => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 active:scale-[0.98]"
    >
      <Eye open />
    </button>
  );

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <header className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">เปลี่ยนรหัสผ่าน</h1>
            <p className="mt-1 text-sm text-zinc-500">
              ตั้งรหัสผ่านใหม่ให้ปลอดภัยขึ้น แนะนำให้ใช้ตัวอักษรพิมพ์เล็ก/ใหญ่ ตัวเลข และสัญลักษณ์
            </p>
          </header>

          {err && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* current */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">รหัสผ่านเดิม</label>
              <div className="relative">
                <input
                  type={showCur ? "text" : "password"}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCur((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label={showCur ? "ซ่อนรหัสผ่านเดิม" : "แสดงรหัสผ่านเดิม"}
                  title={showCur ? "ซ่อน" : "แสดง"}
                >
                  <Eye open={showCur} />
                </button>
              </div>
            </div>

            {/* new */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">รหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn((e as any).getModifierState?.("CapsLock"))}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label={showNew ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
                  title={showNew ? "ซ่อน" : "แสดง"}
                >
                  <Eye open={showNew} />
                </button>
              </div>

              {/* strength bar */}
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div className={`h-1.5 rounded-full transition-all ${strength.bar}`} />
                </div>
                <div className={`mt-1 text-xs ${strength.text}`}>{strength.label}</div>

                {/* rules checklist */}
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600">
                  <Rule ok={rules.hasLen} label="อย่างน้อย 8 ตัวอักษร" />
                  <Rule ok={rules.hasUpper} label="มี A–Z อย่างน้อย 1 ตัว" />
                  <Rule ok={rules.hasLower} label="มี a–z อย่างน้อย 1 ตัว" />
                  <Rule ok={rules.hasNum} label="มีตัวเลขอย่างน้อย 1 ตัว" />
                  <Rule ok={rules.hasSym} label="มีสัญลักษณ์อย่างน้อย 1 ตัว" />
                </ul>

                {capsOn && (
                  <div className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    เปิด Caps Lock อยู่
                  </div>
                )}
              </div>
            </div>

            {/* confirm */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <input
                  type={showCon ? "text" : "password"}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCon((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label={showCon ? "ซ่อนยืนยันรหัส" : "แสดงยืนยันรหัส"}
                  title={showCon ? "ซ่อน" : "แสดง"}
                >
                  <Eye open={showCon} />
                </button>
              </div>
              {confirm.length > 0 && confirm !== newPassword && (
                <p className="mt-1 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
              )}
              {loading ? "กำลังเปลี่ยน..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny components ---------- */

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-emerald-700" : "text-zinc-500"}`}>
      <span
        className={[
          "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
          ok ? "border-emerald-400 bg-emerald-50" : "border-zinc-300 bg-white",
        ].join(" ")}
      >
        {ok ? "✓" : "•"}
      </span>
      <span>{label}</span>
    </li>
  );
}
