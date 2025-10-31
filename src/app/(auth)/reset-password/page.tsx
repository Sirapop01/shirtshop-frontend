// app/(auth)/reset-password/reset-password-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordOtp, resetPassword } from "@/lib/auth";

export default function ResetPasswordClient({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // ซิงก์กรณีเปลี่ยน URL ภายนอก
    if (initialEmail && initialEmail !== email) setEmail(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  const startCooldown = (sec = 60) => {
    setCooldown(sec);
    const t = setInterval(() => {
      sec -= 1;
      setCooldown(sec);
      if (sec <= 0) clearInterval(t);
    }, 1000);
  };

  const onResend = async () => {
    if (!email) return setErr("กรุณากรอกอีเมล");
    try {
      setErr(null); setMsg(null); setSending(true);
      await requestPasswordOtp(email);
      setMsg("ส่ง OTP ใหม่ไปที่อีเมลแล้ว");
      startCooldown(60);
    } catch (e: any) {
      const m = e?.response?.data?.message ?? "ส่ง OTP ใหม่ไม่สำเร็จ";
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  const strongEnough = useMemo(() => newPassword.length >= 8, [newPassword]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (!email) return setErr("กรุณากรอกอีเมล");
    if (!otp || otp.length !== 6) return setErr("กรุณากรอก OTP 6 หลัก");
    if (!strongEnough) return setErr("รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร");
    if (newPassword !== confirm) return setErr("รหัสผ่านใหม่และยืนยันไม่ตรงกัน");

    try {
      setLoading(true);
      await resetPassword(email, otp, newPassword);
      setMsg("รีเซ็ตรหัสผ่านสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (e: any) {
      const m = e?.response?.data?.message ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ";
      setErr(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Reset Password</h1>
      <p className="text-gray-600 text-sm mb-4">กรอกอีเมล, OTP และรหัสผ่านใหม่</p>

      {err && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {msg && <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block mb-1 text-sm">อีเมล</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block mb-1 text-sm">OTP</label>
            <input
              type="text"
              inputMode="numeric"
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
            disabled={sending || cooldown > 0}
            onClick={onResend}
            className="border rounded px-3 py-2 text-sm disabled:opacity-60"
          >
            {cooldown > 0 ? `ส่งใหม่ใน ${cooldown}s` : sending ? "กำลังส่ง..." : "ส่งใหม่"}
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
            autoComplete="new-password"
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
            autoComplete="new-password"
            required
          />
          {confirm.length > 0 && confirm !== newPassword && (
            <p className="text-xs text-red-600 mt-1">รหัสผ่านใหม่และยืนยันไม่ตรงกัน</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
        >
          {loading ? "กำลังรีเซ็ต..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
        </button>
      </form>
    </div>
  );
}
