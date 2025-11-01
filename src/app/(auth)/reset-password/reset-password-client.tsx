// app/(auth)/reset-password/reset-password-client.tsx  (Client Component)
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import HeroLogo from "@/components/home/HeroLogo";
import { requestPasswordOtp, resetPassword } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function ResetPasswordClient({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const emailLocked = !!initialEmail;

  useEffect(() => {
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
      setErr(null); setOk(null); setSending(true);
      await requestPasswordOtp(email);
      setOk("ส่ง OTP ใหม่ไปที่อีเมลแล้ว");
      startCooldown(60);
    } catch (e: any) {
      const m = e?.response?.data?.message ?? "ส่ง OTP ใหม่ไม่สำเร็จ";
      setErr(m);
    } finally {
      setSending(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!email) return false;
    if (!otp || otp.length !== 6) return false;
    if (password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [email, otp, password, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!canSubmit) return;

    try {
      setLoading(true);
      await resetPassword(email, otp, password);
      setOk("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังพาไปหน้า Login…");
      setTimeout(() => router.push("/login"), 1200);
    } catch (e: any) {
      const m = e?.response?.data?.message ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ";
      setErr(m);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 xl:grid-cols-2">
      {/* ซ้าย: ภาพพื้นหลัง (ธีมเดียวกับ forgot) */}
      <div className="relative hidden xl:block xl:min-h-screen overflow-hidden">
        <Image src="/loginbg.png" alt="Background" fill className="object-cover" priority />
      </div>

      {/* ขวา: ฟอร์ม */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm xl:max-w-md space-y-4">
          <div className="flex justify-center">
            <HeroLogo width={160} height={48} />
          </div>

          <h1 className="text-2xl font-bold text-center">Reset Password</h1>
          <p className="text-sm text-center text-gray-600">
            กรอกอีเมล (ถูกล็อกถ้ามาจากหน้า Forgot), รหัส OTP และตั้งรหัสผ่านใหม่
          </p>

          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {ok && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>}

          {/* Email */}
          <div>
            <label className="mb-1 block">Email</label>
            <input
              type="email"
              className={`w-full border p-2 rounded ${emailLocked ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={emailLocked ? undefined : (e) => setEmail(e.target.value)}
              autoComplete="email"
              readOnly={emailLocked}
              aria-readonly={emailLocked}
              required
            />
          </div>

          {/* OTP + resend */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block">OTP</label>
              <button
                type="button"
                disabled={sending || cooldown > 0}
                onClick={onResend}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                {cooldown > 0 ? `ส่งใหม่ใน ${cooldown}s` : (sending ? "กำลังส่ง..." : "ส่งใหม่")}
              </button>
            </div>
            <input
              type="text"
              className="w-full border p-2 rounded"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>

          {/* New Password */}
          <div>
            <label className="mb-1 block">New Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <div className="mt-2 h-1 w-full rounded bg-gray-200 overflow-hidden">
              <div
                className="h-1 transition-[width] duration-300 bg-blue-600"
                style={{
                  width: `${Math.min(
                    100,
                    [
                      password.length >= 8,
                      /[A-Z]/.test(password),
                      /[a-z]/.test(password),
                      /[0-9]/.test(password),
                      /[^A-Za-z0-9]/.test(password),
                    ].filter(Boolean).length * 20
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block">Confirm Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {confirm.length > 0 && confirm !== password && (
              <p className="text-xs text-red-600 mt-1">รหัสผ่านยืนยันไม่ตรงกัน</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full border p-2 rounded disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <div className="text-center text-sm">
            <a href="/login" className="underline">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
