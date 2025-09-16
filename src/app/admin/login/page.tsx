"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // นำเข้า useAuth
import Image from 'next/image';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin1234');
  const [rememberMe, setRememberMe] = useState(true); // สถานะ Remember Me
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ดึงสถานะจาก AuthContext
  const { login, isAdmin, authLoading } = useAuth();
  const router = useRouter();

  // useEffect สำหรับตรวจสอบและ redirect ถ้าเป็น Admin อยู่แล้ว
  useEffect(() => {
    // รอจนกว่า AuthContext จะตรวจสอบสถานะเสร็จสิ้น
    if (!authLoading) {
      if (isAdmin) {
        // ถ้าเป็น Admin แล้ว ให้ redirect ไปหน้า Admin Products
        router.replace('/admin/products');
      }
      // ถ้าไม่ใช่ Admin ก็ปล่อยให้อยู่ที่หน้า Login นี้
    }
  }, [authLoading, isAdmin, router]); // Dependency array

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }), // ส่ง rememberMe ไป Backend
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      // ตรวจสอบ role ของ user ที่ล็อกอินเข้ามา
      if (!data.user || !data.user.roles.includes('ADMIN')) {
        throw new Error('Access Denied. You are not an administrator.');
      }

      // เรียกใช้ฟังก์ชัน login จาก AuthContext ซึ่งจะจัดการการบันทึก Token และอัปเดตสถานะทั้งหมด
      login(data.accessToken, data.refreshToken, data.user, rememberMe);

      // ส่งไปที่หน้า Gatekeeper (/admin) เพื่อให้มันจัดการ redirect ไปยัง /admin/products ต่อไป
      router.push('/admin');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // แสดง Loading ระหว่างที่ AuthContext กำลังตรวจสอบสถานะ หรือถ้าเป็น Admin อยู่แล้ว (ก่อน redirect)
  if (authLoading || isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // แสดงฟอร์ม Login ก็ต่อเมื่อตรวจสอบแล้วว่า "ยังไม่ได้ล็อกอินเป็น Admin"
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          {/* ตรวจสอบให้แน่ใจว่ามีไฟล์ logo.png อยู่ในโฟลเดอร์ public นะครับ */}
          <Image src="/logo.png" alt="StyleWhere Logo" width={160} height={48} />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Administrator Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 mb-2 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black mr-2"
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}