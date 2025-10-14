// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const { user, logout, authLoading } = useAuth();
  const isLoggedIn = !!user;

  useEffect(() => {
    setMounted(true);

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const pop = document.getElementById("navbar-popover");
      if (pop && !pop.contains(target) && !menuBtnRef.current?.contains(target)) {
        setOpenMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(false);
        setOpenMobile(false);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpenMobile(false);
    };
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = openMobile ? "hidden" : "";
  }, [openMobile, mounted]);

  if (!mounted) return null; // กัน hydration mismatch

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-3 md:px-6">
        {/* Top row */}
        <div className="grid grid-cols-12 items-center gap-3 h-16">
          {/* Logo */}
          <div className="col-span-6 md:col-span-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2" aria-label="StyleWhere home">
              <Image
                src="/logo.png"
                alt="StyleWhere"
                width={140}
                height={36}
                priority
                style={{ height: "auto", width: "140px" }}
              />
              <span className="hidden sm:inline text-2xl font-semibold tracking-wide">StyleWhere</span>
            </Link>
          </div>

          {/* Search (desktop) */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-center">
            <SearchBox />
          </div>

          {/* Right controls */}
          <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2 relative">
            {authLoading ? (
              <div className="h-8 w-28 rounded bg-gray-100 animate-pulse" aria-hidden />
            ) : !isLoggedIn ? (
              <>
                <Link href="/login" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Login
                </Link>
                {/* Hamburger (mobile) */}
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center rounded border px-2 py-1"
                  onClick={() => setOpenMobile((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={openMobile}
                >
                  <IconMenu />
                </button>
              </>
            ) : (
              <>
                {/* Cart + badge */}
                <Link
                  href="/cart"
                  className="inline-flex items-center justify-center rounded border px-2 py-1 relative"
                  aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
                  title="Cart"
                >
                  <IconCart />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center font-semibold shadow"
                      aria-hidden="true"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>

                {/* User menu */}
                <button
                  ref={menuBtnRef}
                  type="button"
                  className="inline-flex items-center justify-center rounded border px-2 py-1"
                  onClick={() => setOpenMenu((v) => !v)}
                  aria-label="Open user menu"
                  aria-haspopup="menu"
                  aria-expanded={openMenu}
                  aria-controls="navbar-popover"
                >
                  <IconMenu strokeWidth={1.8} />
                </button>

                {openMenu && (
                  <div
                    id="navbar-popover"
                    role="menu"
                    className="absolute right-0 top-[120%] w-64 rounded-xl border bg-white shadow-xl p-4 z-[60]"
                  >
                    <ul className="space-y-2 text-sm">
                      <MenuLink href="/orders" onClick={() => setOpenMenu(false)}>
                        คำสั่งซื้อของฉัน
                      </MenuLink>
                      <MenuLink href="/addresses" onClick={() => setOpenMenu(false)}>
                        ที่อยู่จัดส่ง
                      </MenuLink>
                      <MenuLink href="/profile" onClick={() => setOpenMenu(false)}>
                        โปรไฟล์
                      </MenuLink>
                      <li className="pt-2 mt-2 border-t">
                        <button
                          type="button"
                          className="w-full text-left px-2 py-2 rounded hover:bg-gray-50"
                          onClick={() => {
                            setOpenMenu(false);
                            logout();
                            // router.push("/login"); // การ logout จะ redirect ไปเองจาก AuthContext
                          }}
                          role="menuitem"
                        >
                          ออกจากระบบ
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Search (mobile) */}
        <div className="md:hidden py-2">
          <SearchBox />
        </div>

        {/* Main nav (desktop) - Removed */}
        <nav className="hidden md:flex h-12 items-center justify-center gap-8 text-gray-700">
          {/* Links can be added here if needed */}
        </nav>

        {/* Mobile drawer */}
        {openMobile && (
          <>
            <button
              type="button"
              className="fixed inset-0 bg-black/25 z-40"
              onClick={() => setOpenMobile(false)}
              aria-hidden="true"
            />
            <aside
              className="fixed right-0 top-0 h-screen w-[88%] max-w-sm bg-white border-l z-50 shadow-xl p-3 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
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
                <SearchBox />
              </div>

              <nav className="flex flex-col gap-2 text-gray-700">
                {isLoggedIn ? (
                  <>
                    <Link href="/orders" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setOpenMobile(false)}>คำสั่งซื้อของฉัน</Link>
                    <Link href="/addresses" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setOpenMobile(false)}>ที่อยู่จัดส่ง</Link>
                    <Link href="/profile" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setOpenMobile(false)}>โปรไฟล์</Link>
                    <button
                      className="rounded px-2 py-2 text-left border mt-1"
                      onClick={() => { setOpenMobile(false); logout(); }}
                    >
                      ออกจากระบบ
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="rounded px-2 py-2 border text-center mt-1" onClick={() => setOpenMobile(false)}>
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

/* ---------------------- Subcomponents ---------------------- */

function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";

  // 1. State สำหรับ "ค่าในช่อง input" เท่านั้น
  const [inputValue, setInputValue] = useState(queryFromUrl);

  // 2. ✨ EFFECT 1: คอย Sync ค่าจาก URL มาใส่ในช่อง Input ✨
  // Effect นี้จะทำงานเมื่อผู้ใช้กด back/forward หรือ URL เปลี่ยนแปลงจากภายนอก
  useEffect(() => {
    setInputValue(queryFromUrl);
  }, [queryFromUrl]);

  // 3. ✨ EFFECT 2: Debounce ค่าจากช่อง Input แล้วค่อยสั่งเปลี่ยน URL ✨
  // Effect นี้จะทำงานเมื่อผู้ใช้ "พิมพ์" ในช่อง Input
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedValue = inputValue.trim();

      // ถ้าค่าที่พิมพ์ไม่ตรงกับค่าใน URL ปัจจุบัน
      if (trimmedValue !== queryFromUrl) {
        if (trimmedValue) {
          // ถ้ามีคำค้นหา, ให้ navigate ไปยังหน้า /search
          router.push(`/search?q=${encodeURIComponent(trimmedValue)}`);
        } else if (pathname === "/search") {
          // ถ้าคำค้นหาว่างเปล่า และเราอยู่ที่หน้า /search อยู่แล้ว
          // ให้พากลับไปที่หน้าหลัก
          router.push("/");
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, queryFromUrl, pathname, router]);


  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmedValue = inputValue.trim();
        if (trimmedValue) {
            router.push(`/search?q=${encodeURIComponent(trimmedValue)}`);
        }
      }}
      className="flex w-full max-w-xl items-center gap-2 rounded border px-3 py-2 bg-white"
      role="search"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-400" aria-hidden="true">
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
        className="w-full outline-none text-sm bg-transparent"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        aria-label="Search"
      />
    </form>
  );
}


function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block px-2 py-2 rounded hover:bg-gray-50"
        onClick={onClick}
        role="menuitem"
      >
        {children}
      </Link>
    </li>
  );
}

function IconMenu({ strokeWidth = 1.5 }: { strokeWidth?: number }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 7h14l-1.5 9.5a2 2 0 0 1-2 1.5H9.5a2 2 0 0 1-2-1.5L6 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M6 7l-1-3H3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}