"use client";
import { useState } from "react";
import Image from "next/image";
import { requestPasswordOtp } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = (sec = 60) => {
    setCooldown(sec);
    const timer = setInterval(() => {
      sec -= 1;
      setCooldown(sec);
      if (sec <= 0) clearInterval(timer);
    }, 1000);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!email) {
      setErr("กรุณากรอกอีเมล");
      return;
    }
    try {
      setLoading(true);
      await requestPasswordOtp(email);
      setOk("ส่งรหัส OTP ไปที่อีเมลของคุณแล้ว");
      startCooldown(60);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "ส่ง OTP ไม่สำเร็จ";
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
          <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
          <p className="text-sm text-center text-gray-600">
            กรอกอีเมลของคุณเพื่อรับรหัส OTP สำหรับรีเซ็ตรหัสผ่าน
          </p>

          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {ok && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>}

          <div>
            <label className="mb-1 block">Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full border p-2 rounded disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {loading ? "Sending..." : cooldown > 0 ? `Send again in ${cooldown}s` : "Send OTP"}
          </button>

          <div className="text-center text-sm">
            <a href="/login" className="underline">Back to Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
