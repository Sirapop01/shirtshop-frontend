"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AdminGuard from "@/components/auth/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openProducts, setOpenProducts] = useState(true);

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`block rounded-md px-3 py-2 text-sm ${
          active ? "bg-gray-100 text-gray-900 font-medium"
                 : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  // ❗️ไม่ครอบ /admin/login
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <aside className="fixed left-0 top-0 z-30 h-screen w-60 border-r bg-white">
          <div className="px-4 py-4 border-b">
            <Link href="/admin" className="block text-lg font-semibold">SyleWhere</Link>
          </div>
          <nav className="p-3 space-y-1">
            <NavItem href="/admin/dashboard" label="Dashboard" />
            <button
              type="button"
              onClick={() => setOpenProducts((s) => !s)}
              className="w-full text-left rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <span className="inline-flex items-center gap-2">
                Products <span className="ml-auto text-xs">{openProducts ? "▾" : "▸"}</span>
              </span>
            </button>
            {openProducts && (
              <div className="ml-3 space-y-1">
                <NavItem href="/admin/products" label="All Products" />
                <NavItem href="/admin/products/new" label="Add Product" />
              </div>
            )}
            <NavItem href="/admin/orders" label="Orders" />
            <NavItem href="/admin/customers" label="Customers" />
            <NavItem href="/admin/setting" label="Setting" />
          </nav>
        </aside>

        <div className="pl-60">
          <header className="sticky top-0 z-20 border-b bg-white">
            <div className="flex items-center justify-between px-6 py-3">
              <h1 className="text-base font-medium text-gray-700">Admin Console</h1>
              <div className="text-sm text-gray-500">Admin ▾</div>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
