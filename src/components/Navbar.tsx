// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const AUTH_KEY = "shirtshop_auth";

function readIsLoggedIn(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return !!obj?.accessToken;
  } catch {
    return false;
  }
}

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openMobile, setOpenMobile] = useState(false); // เมนู mobile (drawer) เดิม
  const [openMenu, setOpenMenu] = useState(false);     // เมนูเล็กใต้ปุ่มสามขีด
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsLoggedIn(readIsLoggedIn());

    // sync ข้ามแท็บ
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) setIsLoggedIn(readIsLoggedIn());
    };
    window.addEventListener("storage", onStorage);

    // click outside เพื่อปิดเมนูเล็ก
    const onClickOutside = (e: MouseEvent) => {
      if (!menuBtnRef.current) return;
      const target = e.target as Node;
      const pop = document.getElementById("navbar-popover");
      if (
        pop &&
        !pop.contains(target) &&
        !menuBtnRef.current.contains(target)
      ) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("click", onClickOutside);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("click", onClickOutside);
    };
  }, []);

  if (!mounted) return null; // กัน hydration mismatch

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-3 md:px-6">
        {/* แถวบน */}
        <div className="grid grid-cols-12 items-center gap-3 h-16">
          {/* โลโก้ซ้าย */}
          <div className="col-span-6 md:col-span-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="StyleWhere" width={96} height={96} priority />
              <span className="text-2xl font-semibold tracking-wide">StyleWhere</span>
            </Link>
          </div>

          {/* Search กลาง (แสดงเฉพาะ md+ ตามของเดิม) */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-center">
            <div className="flex w-full max-w-xl items-center gap-2 rounded border px-3 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
                <path
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
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

          {/* ปุ่มขวา */}
          <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2 relative">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Login
                </Link>
                {/* Hamburger เฉพาะมือถือ/แท็บเล็ต (drawer เมนูเดิม) */}
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center rounded border px-2 py-1"
                  onClick={() => setOpenMobile((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={openMobile}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* ตะกร้า */}
                <Link
                  href="/cart"
                  className="inline-flex items-center justify-center rounded border px-2 py-1"
                  aria-label="Cart"
                  title="Cart"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path
                      d="M6 7h14l-1.5 9.5a2 2 0 0 1-2 1.5H9.5a2 2 0 0 1-2-1.5L6 7Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M6 7l-1-3H3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Link>

                {/* ปุ่มสามขีด -> เปิดเมนูเล็ก */}
                <button
                  ref={menuBtnRef}
                  type="button"
                  className="inline-flex items-center justify-center rounded border px-2 py-1"
                  onClick={() => setOpenMenu((v) => !v)}
                  aria-label="Open user menu"
                  aria-expanded={openMenu}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>

                {/* เมนูเล็ก (popover) */}
                {openMenu && (
                  <div
                    id="navbar-popover"
                    className="absolute right-0 top-[120%] w-64 rounded-xl border bg-white shadow-xl p-4 z-[60]"
                  >
                    <ul className="space-y-4 text-center">
                      <li>
                        <Link
                          href="/profile"
                          className="block text-lg hover:opacity-80"
                          onClick={() => setOpenMenu(false)}
                        >
                          My Account
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/cart"
                          className="block text-lg hover:opacity-80"
                          onClick={() => setOpenMenu(false)}
                        >
                          My purchases
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="block w-full text-lg hover:opacity-80"
                          onClick={() => {
                            localStorage.removeItem(AUTH_KEY);
                            setOpenMenu(false);
                            setIsLoggedIn(false);
                            window.location.href = "/";
                          }}
                        >
                          Log Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* เมนูหลักกลางจอ (ของเดิม) */}
        <nav className="hidden md:flex h-12 items-center justify-center gap-8 text-gray-700">
          <Link href="/shirts" className="hover:text-black">Shirts</Link>
          <Link href="/for-you" className="hover:text-black">For you</Link>
          <Link href="/products" className="hover:text-black">All products</Link>
        </nav>

        {/* Drawer มือถือเดิม (ใช้ตอนยังไม่ล็อกอิน หรืออยากคงเมนู mobile) */}
        {openMobile && (
          <>
            {/* Overlay */}
            <button
              type="button"
              className="fixed inset-0 bg-black/25 z-40"
              onClick={() => setOpenMobile(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <aside
              className="fixed right-0 top-0 h-screen w-[80%] max-w-sm bg-white border-l z-50 shadow-xl p-3"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Menu</span>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() => setOpenMobile(false)}
                  aria-label="Close menu"
                >
                  Close
                </button>
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2 rounded border px-3 py-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400">
                    <path
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
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

              <nav className="flex flex-col gap-2 text-gray-700">
                <Link href="/shirts" className="rounded px-2 py-2 hover:bg-gray-50">Shirts</Link>
                <Link href="/for-you" className="rounded px-2 py-2 hover:bg-gray-50">For you</Link>
                <Link href="/products" className="rounded px-2 py-2 hover:bg-gray-50">All products</Link>
                {!isLoggedIn && (
                  <Link href="/login" className="rounded px-2 py-2 border text-center mt-1">
                    Login
                  </Link>
                )}
              </nav>
            </aside>
          </>
        )}
      </div>
    </header>
  );
}
