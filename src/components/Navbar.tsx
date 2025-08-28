// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type User = { firstName: string; avatarUrl?: string } | null;

export default function Navbar() {
  // TODO: เปลี่ยน mock เป็นข้อมูลจริงจาก auth ของคุณ
  const [user] = useState<User>(null);
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      {/* Container กลางหน้า */}
      <div className="mx-auto max-w-6xl px-3 md:px-6">
        {/* แถวบน: ใช้ GRID เพื่อคุมตำแหน่ง โลโก้ซ้าย / search กลาง / ปุ่มขวา */}
        <div className="grid grid-cols-12 items-center gap-3 h-16">
          {/* โลโก้: ชิดซ้าย + ใหญ่ขึ้น */}
          <div className="col-span-6 md:col-span-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="StyleWhere" width={40} height={40} priority />
              <span className="text-2xl font-semibold tracking-wide">StyleWhere</span>
            </Link>
          </div>

          {/* Search กลางจอ (ซ่อนบนจอเล็ก) */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-center">
            <div className="flex w-full max-w-xl items-center gap-2 rounded border px-3 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <input
                type="search"
                placeholder="Search shirts…"
                className="w-full outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value;
                    window.location.href = `/search?q=${encodeURIComponent(q)}`;
                  }
                }}
              />
            </div>
          </div>

          {/* ปุ่ม Login / โปรไฟล์ ขวา */}
          <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
            {!user ? (
              <Link
                href="/auth/login"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Login
              </Link>
            ) : (
              <ProfileMenu firstName={user.firstName} avatarUrl={user.avatarUrl} />
            )}

            {/* Hamburger (แสดงเฉพาะมือถือ/แท็บเล็ต) */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded border px-2 py-1"
              onClick={() => setOpenMobile((v) => !v)}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* แถวล่าง: เมนูกลางจอ (ขายเฉพาะเสื้อ) */}
        <nav className="hidden md:flex h-12 items-center justify-center gap-8 text-gray-700">
          <Link href="/shirts" className="hover:text-black">Shirts</Link>
          <Link href="/for-you" className="hover:text-black">For you</Link>
          <Link href="/products" className="hover:text-black">All products</Link>
        </nav>

        {/* Mobile menu */}
        {openMobile && (
          <div className="md:hidden pb-3">
            <div className="mb-2">
              <div className="flex items-center gap-2 rounded border px-3 py-2">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        fill="none" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search shirts…"
                  className="w-full outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = (e.target as HTMLInputElement).value;
                      window.location.href = `/search?q=${encodeURIComponent(q)}`;
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 text-gray-700">
              <Link href="/shirts" className="rounded px-2 py-2 hover:bg-gray-50">Shirts</Link>
              <Link href="/for-you" className="rounded px-2 py-2 hover:bg-gray-50">For you</Link>
              <Link href="/products" className="rounded px-2 py-2 hover:bg-gray-50">All products</Link>
              {!user && (
                <Link href="/auth/login" className="rounded px-2 py-2 border text-center mt-1">
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ===== โปรไฟล์ดรอปดาวน์ ===== */
function ProfileMenu({ firstName, avatarUrl }: { firstName: string; avatarUrl?: string }) {
  const [open, setOpen] = useState(false);
  const initials = (firstName?.[0] || "?").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium max-w-[120px] truncate">{firstName}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-500">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white shadow-lg overflow-hidden" role="menu">
          <Link href="/account" className="block px-3 py-2 text-sm hover:bg-gray-50" role="menuitem">My Account</Link>
          <Link href="/orders" className="block px-3 py-2 text-sm hover:bg-gray-50" role="menuitem">Orders</Link>
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              // TODO: logout จริง แล้ว redirect
              document.cookie = "token=; Max-Age=0; path=/";
              window.location.href = "/auth/login";
            }}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
