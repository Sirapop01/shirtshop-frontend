"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * ENV ที่ต้องมี:
 *  NEXT_PUBLIC_API_BASE = http://localhost:8080/api
 *
 * Backend endpoint (ปรับได้ตามของจริง):
 *  POST /auth/login  body: { email, password }
 *  -> { accessToken, user: { id, email, name, ... }, refreshToken? }
 *
 * NOTE:
 * - โค้ดนี้เก็บ accessToken + user ใน localStorage เพื่อให้ FE เรียก API อื่น ๆ ได้
 * - ถ้า backend ของนายใช้ refresh token แบบ httpOnly cookie ก็ไม่ต้องเก็บ refresh ใน FE
 */

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: "USER" | "ADMIN";
    avatarUrl?: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saveAuth = (data: LoginResponse) => {
    // เก็บแบบง่าย ๆ ไว้ก่อน (ถ้าอยากปลอดภัยขึ้น แนะนำให้ใช้ httpOnly cookie ฝั่ง backend)
    localStorage.setItem(
      "shirtshop_auth",
      JSON.stringify({
        user: data.user,
        accessToken: data.accessToken,
        // เก็บ refreshToken เฉพาะกรณีที่ backend ส่งมาเป็น body (ถ้าใช้ cookie ก็ไม่ต้องเก็บ)
        refreshToken: data.refreshToken ?? null,
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr("กรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    if (!API_BASE) {
      setErr("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_API_BASE ใน .env.local");
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
        // พยายามอ่านข้อความจาก backend
        let message = "เข้าสู่ระบบไม่สำเร็จ";
        try {
          const data = await res.json();
          message = data?.message || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await res.json()) as LoginResponse;
      if (!data?.accessToken || !data?.user) {
        throw new Error("รูปแบบผลลัพธ์จากเซิร์ฟเวอร์ไม่ถูกต้อง");
      }

      saveAuth(data);
      // ล็อกอินสำเร็จ: ส่งไปหน้าแรก/แดชบอร์ด
      router.push("/");
      router.refresh();
    } catch (error: any) {
      setErr(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => router.push("/register");

  // ถ้าต้องการ Social Login:
  // ปกติ Spring Security จะเป็น /oauth2/authorization/google|facebook (ไม่อยู่ใต้ /api)
  // ให้ตั้งอีกตัวแปร env ถ้าจำเป็น เช่น NEXT_PUBLIC_BACKEND_BASE_OAUTH
  const handleGoogle = () => {
    const OAUTH_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_OAUTH || "";
    // ถ้า BE ใช้ path นี้ ให้ปล่อยไปได้เลย
    if (OAUTH_BASE) {
      window.location.href = `${OAUTH_BASE}/oauth2/authorization/google`;
    } else {
      alert("ยังไม่ได้ตั้งค่าเส้นทาง Google OAuth (NEXT_PUBLIC_BACKEND_BASE_OAUTH)");
    }
  };

  const handleFacebook = () => {
    const OAUTH_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_OAUTH || "";
    if (OAUTH_BASE) {
      window.location.href = `${OAUTH_BASE}/oauth2/authorization/facebook`;
    } else {
      alert("ยังไม่ได้ตั้งค่าเส้นทาง Facebook OAuth (NEXT_PUBLIC_BACKEND_BASE_OAUTH)");
    }
  };

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

          {/* error banner */}
          {err && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
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

          {/* Divider OR */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-3 text-gray-500">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          {/* Social / Register */}
          <div className="flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={goRegister}
              className="w-full border py-2 rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register with StyleWhere</span>
            </button>
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full border py-2 rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              onClick={handleFacebook}
              className="w-full border py-2 rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue with Facebook</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
