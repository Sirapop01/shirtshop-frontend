// src/app/login/page.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type UserResponse = {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
};

type LoginResponse = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string;
  user?: UserResponse;
};

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";
const API_BASE = RAW_API_BASE.replace(/\/$/, ""); // กัน / ซ้ำ

export default function Login() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("user@gmail.com");
  const [password, setPassword] = useState("user1234");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ถ้า login อยู่แล้ว ไม่ต้องอยู่หน้า /login
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr("กรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = "เข้าสู่ระบบไม่สำเร็จ";
        try {
          const d = await res.json();
          message = d?.message || d?.error || message;
        } catch { }
        throw new Error(message);
      }

      const data = (await res.json()) as LoginResponse;
      if (!data?.accessToken) throw new Error("รูปแบบผลลัพธ์จากเซิร์ฟเวอร์ไม่ถูกต้อง");

      // ถ้า body ไม่มี user → ดึง /auth/me
      let me: UserResponse | undefined = data.user;
      if (!me) {
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        me = meRes.ok ? ((await meRes.json()) as UserResponse) : { id: "", email };
      }

      // ✅ ให้ AuthContext.login จัดการ persist token + set state
      login(data.accessToken, data.refreshToken ?? null, me, remember);

      router.push("/");
      router.refresh();
    } catch (error: any) {
      setErr(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => router.push("/register");

  return (
    <div className="grid min-h-screen grid-cols-1 xl:grid-cols-2">
      {/* ซ้าย: ภาพ */}
      <div className="relative hidden xl:block xl:min-h-screen overflow-hidden">
        <Image
          src="/loginbg.png"
          alt="Login background"
          fill
          className="object-cover"
          priority
          sizes="(min-width: 1280px) 50vw, 0px"
        />
      </div>

      {/* ขวา: ฟอร์ม */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm xl:max-w-md space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="StyleWhere Logo" width={160} height={48} />
          </div>

          <h1 className="text-2xl font-bold text-center">Login StyleWhere</h1>

          {err && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
          )}

          <div>
            <label className="mb-1 block">Email</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border p-2 rounded"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block">Password</label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border p-2 rounded"
              autoComplete="current-password"
              required
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="text-sm">Remember me</span>
          </label>

          <div className="flex justify-between items-center">
            <a href="/forgot-password" className="text-sm underline">
              Forgot Password ?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border p-2 rounded mt-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="flex items-center my-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-3 text-gray-500">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          <div className="flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={goRegister}
              className="w-full border py-2 rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register with StyleWhere</span>
            </button>
            {/* SocialButtons component removed */}
          </div>
        </form>
      </div>
    </div>
  );
}