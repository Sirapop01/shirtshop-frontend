"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { ReceiptText, MapPin, User, LogOut, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { deleteMyAccount } from "@/lib/account";

const MySwal = withReactContent(Swal);

type NavItem = {
  href: string; label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: (path: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/orders", label: "คำสั่งซื้อ", icon: ReceiptText, isActive: (p) => p === "/orders" || p.startsWith("/orders/") },
  { href: "/addresses", label: "ที่อยู่จัดส่ง", icon: MapPin, isActive: (p) => p.startsWith("/addresses") },
  { href: "/profile", label: "โปรไฟล์", icon: User, isActive: (p) => p.startsWith("/profile") },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const onDelete = async () => {
    const c = await MySwal.fire({
      title: "ลบบัญชีผู้ใช้?",
      html: "การลบนี้ <b>ถาวร</b> และไม่สามารถกู้คืนได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบถาวร",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!c.isConfirmed) return;

    MySwal.fire({ title: "กำลังลบบัญชี...", allowOutsideClick: false, didOpen: () => MySwal.showLoading(), showConfirmButton: false });

    try {
      const msg = await deleteMyAccount();
      logout(); // เคลียร์ token + state
      await MySwal.fire({ icon: "success", title: "สำเร็จ", text: msg || "ลบบัญชีเรียบร้อย" });
      router.replace("/");
      router.refresh();
    } catch (e: any) {
      await MySwal.fire({
        icon: "error",
        title: "ล้มเหลว",
        text: e?.response?.data?.message || e?.message || "ไม่สามารถลบบัญชีได้",
      });
    }
  };

  return (
    <nav className="w-full md:w-64 bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
      <div className="text-2xl font-bold tracking-tight px-2 py-1 mb-4">บัญชีของฉัน</div>

      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive ? isActive(pathname) : pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-[#adbc9f] text-white" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" /><span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t border-gray-200 pt-4 space-y-2">
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </button>

        <button
          onClick={onDelete}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> ลบบัญชีถาวร
        </button>
      </div>
    </nav>
  );
}
