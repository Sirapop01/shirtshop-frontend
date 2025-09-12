"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminIndexPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // รอจนกว่า AuthContext จะโหลดข้อมูล user เสร็จสิ้น (user จะไม่เป็น undefined)
    if (user !== undefined) {
      if (isAdmin) {
        // ถ้าเป็น Admin ให้ส่งไปหน้าเพิ่มสินค้า
        router.replace('/admin/products/new');
      } else {
        // ถ้าไม่ใช่ Admin (หรือไม่ล็อกอิน) ให้ส่งไปหน้าล็อกอิน
        router.replace('/admin/login');
      }
    }
  }, [user, isAdmin, router]);

  // ระหว่างรอตรวจสอบสถานะ ให้แสดงหน้า Loading
  // เพื่อป้องกันการกระพริบของหน้าจอ
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-gray-500">Loading & Redirecting...</p>
    </div>
  );
}