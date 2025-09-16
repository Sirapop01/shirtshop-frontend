"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // นำเข้า useAuth

export default function AdminIndexPage() {
  const { isAdmin, authLoading } = useAuth(); // ดึงสถานะจาก AuthContext
  const router = useRouter();

  useEffect(() => {
    // รอจนกว่า AuthContext จะตรวจสอบสถานะเสร็จสิ้น
    if (!authLoading) {
      if (isAdmin) {
        // ถ้าเป็น Admin ให้ redirect ไปหน้า Admin Products
        router.replace('/admin/products');
      } else {
        // ถ้าไม่ใช่ Admin ให้ redirect ไปหน้า Admin Login
        router.replace('/admin/login');
      }
    }
  }, [authLoading, isAdmin, router]); // Dependency array

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-gray-600">Authenticating...</p> {/* แสดงข้อความระหว่างรอตรวจสอบ */}
    </div>
  );
}