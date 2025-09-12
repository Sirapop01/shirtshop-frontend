"use client";

import SocialButtons from "@/components/SocialButtons";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// สร้าง Type สำหรับ User ให้ตรงกับ UserResponse.java
type UserResponse = {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  profileImageUrl?: string; // <--- แก้จาก avatarUrl
  emailVerified?: boolean;
};

// ใช้ UserResponse Type ที่สร้างขึ้น
type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  user: UserResponse;
};

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";
const API_BASE = RAW_API_BASE.replace(/\/$/, ""); // ป้องกัน / ซ้ำ

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saveAuth = (data: LoginResponse) => {
    localStorage.setItem(
      "shirtshop_auth",
      JSON.stringify({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        tokenType: data.tokenType ?? "Bearer",
      })
    );
  };

  // ---- Helper: อ่าน token ได้ทั้งจาก hash และ query
  const readTokensFromLocation = () => {
    if (typeof window === "undefined") return null;

    // hash: #accessToken=...&refreshToken=...&tokenType=...
    const hash = window.location.hash?.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash || "");

    // query: ?accessToken=... (กันกรณี SuccessHandler เผลอส่งแบบ query)
    const queryParams = new URLSearchParams(window.location.search || "");

    // เปลี่ยนจาก "accessToken" เป็น "token"
    const token =
      hashParams.get("token") || queryParams.get("token");
    const refreshToken =
      hashParams.get("refreshToken") || queryParams.get("refreshToken") || undefined;
    const tokenType =
      hashParams.get("tokenType") ||
      queryParams.get("tokenType") ||
      "Bearer";

    // เช็คตัวแปรใหม่
    if (!token) return null;

    // คืนค่า object ให้มี key ชื่อ accessToken เหมือนเดิมเพื่อให้ส่วนอื่นทำงานต่อได้
    return { accessToken: token, refreshToken, tokenType };
  };

  // -- กันยิงซ้ำใน Next dev strict mode
  const handledRef = useRef(false);

  // --- รองรับ callback จาก Social Login
  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const tokens = readTokensFromLocation();
    if (!tokens) return;

    (async () => {
      try {
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `${tokens.tokenType} ${tokens.accessToken}` },
          cache: "no-store",
        });

        if (!meRes.ok) {
          let message = "cannot fetch user profile";
          try {
            const j = await meRes.json();
            message = j?.message || j?.error || message;
          } catch { }
          throw new Error(message);
        }

        const me = await meRes.json();

        saveAuth({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          user: me,
        });

        // ลบทั้ง hash และ query ออกจาก URL ให้สะอาด
        const cleanPath = window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);

        router.push("/");
        router.refresh();
      } catch (e: any) {
        console.error(e);
        setErr("อ่านข้อมูลหลังเข้าสู่ระบบด้วยโซเชียลไม่สำเร็จ");
      }
    })();
  }, [router]);

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

      // ถ้ายังไม่มี user ใน body ให้ดึงจาก /auth/me
      if (!data.user) {
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        data.user = meRes.ok ? await meRes.json() : { id: "", email };
      }

      saveAuth(data);
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
            <SocialButtons />
          </div>
        </form>
      </div>
    </div>
  );
}
