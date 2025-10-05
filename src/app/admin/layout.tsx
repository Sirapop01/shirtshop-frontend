"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/auth/AdminGuard";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [openProducts, setOpenProducts] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  // ปิด sidebar เมื่อ path เปลี่ยน
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ปิดเมนูโปรไฟล์เมื่อคลิกนอก
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = document.getElementById("user-menu-anchor");
      if (el && !el.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const NavItem = ({
    href,
    label,
    icon,
  }: { href: string; label: string; icon?: React.ReactNode }) => {
    const active =
      pathname === href || (href !== "/admin" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
          active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full transition ${
            active ? "bg-gray-900" : "bg-transparent group-hover:bg-gray-300"
          }`}
        />
        <span className="opacity-80">{icon}</span>
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  // ❗️ไม่ครอบ /admin/login
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80
                      transition-transform duration-300 md:translate-x-0 ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                      }`}
          aria-label="Sidebar"
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Link href="/admin" className="text-lg font-semibold tracking-tight">
              SyleWhere
            </Link>
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1 p-3">
            <NavItem href="/admin/dashboard" label="Dashboard" icon={<span>📊</span>} />

            {/* Products group */}
            <button
              type="button"
              onClick={() => setOpenProducts((s) => !s)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <span>🛍️</span>
              <span className="flex-1 text-left">Products</span>
              <span className="text-xs">{openProducts ? "▾" : "▸"}</span>
            </button>
            {openProducts && (
              <div className="ml-6 space-y-1">
                <NavItem href="/admin/products" label="All Products" />
                <NavItem href="/admin/products/new" label="Add Product" />
              </div>
            )}

            <NavItem href="/admin/orders" label="Orders" icon={<span>🧾</span>} />
            <NavItem href="/admin/customers" label="Customers" icon={<span>👥</span>} />

            <button
                type="button"
                onClick={() => setOpenSettings((s) => !s)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                <span>⚙️</span>
                <span className="flex-1 text-left">Setting</span>
                <span className="text-xs">{openSettings ? "▾" : "▸"}</span>
            </button>
              {openSettings && (
                <div className="ml-6 space-y-1">
                  <NavItem href="/admin/setting/payment" label="Payment & Shipping" />
                  <NavItem href="/admin/setting/admin" label="Admin" />
                  <NavItem href="/admin/setting/branding" label="Logo & Website name" />
                </div>
              )}
          </nav>
          <div className="absolute bottom-0 w-full border-t px-4 py-3 text-xs text-gray-500">
            © {new Date().getFullYear()} SyleWhere
          </div>
        </aside>

        {/* Main area */}
        <div className="md:pl-64">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  ☰
                </button>
                <h1 className="text-base font-medium text-gray-800">Admin Console</h1>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3">
                <button className="hidden rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 md:inline-flex">
                  Help
                </button>

                <div id="user-menu-anchor" className="relative">
                  {/* trigger */}
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <span className="inline-block h-6 w-6 overflow-hidden rounded-full bg-gray-200" />
                    <span>Admin</span>
                    <span className="text-gray-400">▾</span>
                  </button>

                  {/* dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
        </div>

        {/* Backdrop (mobile) */}
        {sidebarOpen && (
          <button
            aria-label="Close overlay"
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </AdminGuard>
  );
}
