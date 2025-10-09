// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { ReceiptText, MapPin, User, LogOut /*, ShoppingCart*/ } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: (path: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/orders",
    label: "คำสั่งซื้อ",
    icon: ReceiptText,
    isActive: (p) => p === "/orders" || p.startsWith("/orders/"),
  },
  {
    href: "/addresses",
    label: "ที่อยู่จัดส่ง",
    icon: MapPin,
    isActive: (p) => p.startsWith("/addresses"),
  },
  {
    href: "/profile",
    label: "โปรไฟล์",
    icon: User,
    isActive: (p) => p.startsWith("/profile"),
  },
  // ถ้าต้องการโชว์ตะกร้าในโซน account ค่อยเปิดอันนี้
  // {
  //   href: "/cart",
  //   label: "ตะกร้าสินค้า",
  //   icon: ShoppingCart,
  //   isActive: (p) => p.startsWith("/cart"),
  // },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

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
                  active
                    ? "bg-[#adbc9f] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
}
