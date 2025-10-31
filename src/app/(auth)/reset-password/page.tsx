// src/app/(site)/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword, requestPasswordOtp } from "@/lib/auth";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const e = sp.get("email");
    if (e) setEmail(e);
  }, [sp]);

  const startCooldown = (sec = 60) => {
    setCooldown(sec);
    const t = setInterval(() => {
      sec -= 1;
      setCooldown(sec);
      if (sec <= 0) clearInterval(t);
    }, 1000);
  };

  const onResend = async () => {
    if (!email) { setErr("กรุณากรอกอีเมลเพื่อส่ง OTP ใหม่"); return; }
    try {
      setErr(null); setMsg(null);
      await requestPasswordOtp(email);
      setMsg("ส่ง OTP ใหม่ไปที่อีเมลแล้ว");
      startCooldown(60);
    } catch (e: any) {
      const m = e?.response?.data?.message || "ส่ง OTP ใหม่ไม่สำเร็จ";
      setErr(m);
    }
  };

  const strongEnough = (p: string) => p.length >= 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!email) return setErr("กรุณากรอกอีเมล");
    if (!otp || otp.length !== 6) return setErr("กรุณากรอก OTP 6 หลัก");
    if (!strongEnough(newPassword)) return setErr("รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร");
    if (newPassword !== confirm) return setErr("รหัสผ่านใหม่และยืนยันไม่ตรงกัน");
    try {
      setLoading(true);
      await resetPassword(email, otp, newPassword);
      setMsg("รีเซ็ตรหัสผ่านสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e: any) {
      const m = e?.response?.data?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ";
      setErr(m);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Reset Password</h1>
        <p className="text-gray-600 text-sm mb-4">
          กรอกอีเมล, รหัส OTP ที่ได้รับทางอีเมล และรหัสผ่านใหม่
        </p>

        {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">{err}</div>}
        {msg && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 mb-3">{msg}</div>}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block mb-1 text-sm">OTP</label>
              <input
                  type="text"
                  maxLength={6}
                  className="w-full border rounded px-3 py-2"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6 หลัก"
                  required
              />
            </div>
            <button
                type="button"
                disabled={cooldown > 0}
                onClick={onResend}
                className="border rounded px-3 py-2 disabled:opacity-60"
                title="ส่ง OTP ใหม่"
            >
              {cooldown > 0 ? `ส่งใหม่ใน ${cooldown}s` : "ส่งใหม่"}
            </button>
          </div>

          <div>
            <label className="block mb-1 text-sm">รหัสผ่านใหม่</label>
            <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                minLength={8}
                required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">ยืนยันรหัสผ่านใหม่</label>
            <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
            />
          </div>

          <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? "กำลังรีเซ็ต..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
          </button>

          <div className="text-center text-sm mt-2">
            <a href="/login" className="underline">กลับไปหน้าเข้าสู่ระบบ</a>
          </div>
        </form>
      </div>
  );
}
