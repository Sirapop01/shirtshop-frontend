// src/app/login/page.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext"; // ✅ ดึง siteName/โลโก้

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

export default function Login() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { refresh: refreshCart } = useCart();

  // ✅ ได้ branding มาใช้
  const branding = useBranding(); // { siteName, logoUrl } | null
  const siteName = branding?.siteName ?? "StyleWhere";
  const logoUrl = branding?.logoUrl ?? "/logo.png";

  const [email, setEmail] = useState("user@gmail.com");
  const [password, setPassword] = useState("user1234");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
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
      const { data } = await api.post<LoginResponse>("/api/auth/login", { email, password });
      if (!data?.accessToken) throw new Error("รูปแบบผลลัพธ์จากเซิร์ฟเวอร์ไม่ถูกต้อง");

      let me: UserResponse | undefined = data.user;
      if (!me) {
        const meRes = await api.get<UserResponse>("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        me = meRes.data ?? { id: "", email };
      }

      await login(data.accessToken, data.refreshToken ?? null, me, remember);

      try {
        const guestCartJson = localStorage.getItem("cart");
        if (guestCartJson) {
          const guestCart = JSON.parse(guestCartJson);
          if (guestCart.items && guestCart.items.length > 0) {
            await api.post("/api/cart/merge", { items: guestCart.items });
            localStorage.removeItem("cart");
          }
        }
      } catch (error) {
        console.error("Failed to merge cart:", error);
      }

      await refreshCart();
      router.replace("/");
      router.refresh();
    } catch (error: any) {
        const data = error?.response?.data;
        // รองรับได้ทั้งรูปแบบ {message}, {error}, string, หรือไม่มีอะไรเลย
        const msg =
          (typeof data === "string" && data) ||
          data?.message ||
          data?.error ||
          error?.message ||
          "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        setErr(msg);
      } finally {
      setLoading(false);
    }
  };

  const goRegister = () => router.push("/register");

  // helper: เช็ค external url สำหรับโลโก้
  const isExternal = (src: string) => /^https?:\/\//i.test(src);

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
            {isExternal(logoUrl) ? (
              <img
                src={logoUrl}
                alt={`${siteName} Logo`}
                className="w-40 h-auto object-contain"   // = 160px กว้าง เท่าของเดิม
              />
            ) : (
              <Image
                src={logoUrl}
                alt={`${siteName} Logo`}
                width={160}
                height={48}
                priority
                className="w-40 h-auto object-contain"   // คุมขนาดให้เท่ากัน
              />
            )}
          </div>
          
          {/* ✅ ใช้ siteName ตรงนี้ */}
          <h1 className="text-2xl font-bold text-center">Login {siteName}</h1>

          {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

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
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
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
              <span>Register with {siteName}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
