// src/app/admin/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";                 // ✅ ใช้ axios instance ที่ผูก .env + แนบ token อัตโนมัติ (ถ้ามี)
import { useAuth } from "@/context/AuthContext";
import HeroLogo from "@/components/home/HeroLogo"; 

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin1234");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, isAdmin, authLoading } = useAuth();
  const router = useRouter();

  // ถ้าตรวจแล้วเป็นแอดมินอยู่แล้ว → เด้งเข้าหน้า dashboard
  useEffect(() => {
    if (!authLoading && isAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      // ✅ เรียกผ่าน axios instance และ path ใต้ /api
      const res = await api.post("/api/auth/login", { email, password, rememberMe });
      const data = res.data as any;

      if (!data?.user || !Array.isArray(data.user.roles) || !data.user.roles.includes("ADMIN")) {
        throw new Error("Access Denied. You are not an administrator.");
      }

      // ✅ ตั้งค่าไว้ใน AuthContext (คาดว่า context จะเก็บ token ให้ตาม rememberMe)
      login(data.accessToken, data.refreshToken, data.user, rememberMe);

      // ไปหน้าแดชบอร์ด
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      let msg = "Login failed.";
      if (axios.isAxiosError(err)) {
        const ax = err as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (err instanceof Error) {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <HeroLogo width={160} height={48} />
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">Administrator Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-2 block font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-3 font-bold text-white transition-colors hover:bg-gray-800 disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
