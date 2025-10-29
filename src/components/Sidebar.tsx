// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { ReceiptText, MapPin, User, LogOut, ShieldCheck } from "lucide-react";

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
  { href: "/addresses", label: "ที่อยู่จัดส่ง", icon: MapPin, isActive: (p) => p.startsWith("/addresses") },
  { href: "/profile", label: "โปรไฟล์", icon: User, isActive: (p) => p.startsWith("/profile") },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <nav className="w-full md:w-64 rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header ชัดแต่เบา */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">บัญชีของฉัน</div>
          <div className="text-xs text-gray-500">จัดการโปรไฟล์และคำสั่งซื้อ</div>
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-5" />

      {/* Nav */}
      <ul className="px-3 py-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive ? isActive(pathname) : pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10",
                  active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition",
                    active ? "bg-white/10 ring-white/15"
                           : "bg-white ring-gray-200 group-hover:ring-gray-300"
                  )}
                >
                  <Icon className={clsx("h-4 w-4", active ? "text-white" : "text-gray-700")} />
                </span>
                <span className="truncate">{label}</span>
                <span
                  className={clsx(
                    "ml-auto opacity-0 -translate-x-1 transition",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                    active && "opacity-100 translate-x-0"
                  )}
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="h-px bg-gray-100 mx-5" />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white ring-1 ring-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-current/20">
            <LogOut className="h-4 w-4" />
          </span>
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
}
