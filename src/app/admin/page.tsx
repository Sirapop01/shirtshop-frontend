"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminIndexPage() {
  const { authLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;               // รอให้เช็คเสร็จก่อน
    if (isAdmin) router.replace("/admin/dashboard");
    else router.replace("/admin/login");
  }, [authLoading, isAdmin, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting…</p>
    </div>
  );
}
