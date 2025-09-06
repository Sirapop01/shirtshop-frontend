"use client";
import { useState } from "react";
import Image from "next/image";
import { resetPasswordWithOtp /*, verifyPasswordOtp*/ } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", otp: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!form.email || !form.otp || !form.password || !form.confirm) {
      setErr("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (form.password.length < 6) {
      setErr("รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (form.password !== form.confirm) {
      setErr("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    try {
      setLoading(true);
      // ถ้า backend มี verify แยกต่างหาก สามารถเรียกก่อนตั้งรหัสผ่านได้:
      // await verifyPasswordOtp(form.email, form.otp);

      await resetPasswordWithOtp(form.email, form.otp, form.password);
      setOk("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");

      // พาไปหน้า login เพื่อให้ผู้ใช้เข้าสู่ระบบด้วยรหัสผ่านใหม่
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 xl:grid-cols-2">
      <div className="relative hidden xl:block xl:min-h-screen overflow-hidden">
        <Image src="/loginbg.png" alt="Background" fill className="object-cover" priority />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm xl:max-w-md space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="StyleWhere Logo" width={160} height={48} />
          </div>
          <h1 className="text-2xl font-bold text-center">Reset Password</h1>
          <p className="text-sm text-center text-gray-600">
            กรอกอีเมล รหัส OTP และตั้งรหัสผ่านใหม่
          </p>

          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {ok && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>}

          <div>
            <label className="mb-1 block">Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block">OTP</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              placeholder="6-digit code"
              value={form.otp}
              onChange={(e) => setForm((s) => ({ ...s, otp: e.target.value }))}
              inputMode="numeric"
              required
            />
          </div>

          <div>
            <label className="mb-1 block">New Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="mb-1 block">Confirm Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border p-2 rounded disabled:opacity-60"
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
