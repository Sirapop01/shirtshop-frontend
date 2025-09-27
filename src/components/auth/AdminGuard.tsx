"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, authLoading } = useAuth();
  const router = useRouter();

  // 1) ระหว่างตรวจสอบสิทธิ์—อย่าเพิ่ง redirect
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        Checking permission…
      </div>
    );
  }

  // 2) ตรวจผลแล้วค่อย redirect ทีเดียว
  if (!user) {
    // ยังไม่ล็อกอิน
    useEffect(() => { router.replace("/admin/login"); }, [router]);
    return null;
  }

  if (!isAdmin) {
    // ล็อกอินแล้ว แต่ไม่ใช่แอดมิน
    useEffect(() => { router.replace("/"); }, [router]);
    return null;
  }

  // 3) ผ่านแล้ว แสดงเนื้อหา
  return <>{children}</>;
}
