// src/components/Navbar.tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const { user, logout, authLoading } = useAuth();
  const isLoggedIn = !!user;

  const branding = useBranding(); // { siteName, logoUrl } | null
  const siteName = branding?.siteName || "StyleWhere";
  const logoUrl = branding?.logoUrl || null;

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

  if (!mounted) return null;

  const isExternal = (src: string) => /^https?:\/\//i.test(src);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-3 md:px-6">
        {/* Top row */}
        <div className="flex h-16 md:h-20 items-center">
          {/* Left: Logo + Name */}
          <div className="w-1/3 flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 min-w-0 h-full" aria-label={`${siteName} home`}>
              {logoUrl ? (
                isExternal(logoUrl) ? (
                  <img src={logoUrl} alt={siteName} className="block h-9 md:h-10 w-auto object-contain" />
                ) : (
                  <Image
                    src={logoUrl}
                    alt={siteName}
                    width={160}
                    height={40}
                    priority
                    className="block h-9 md:h-10 w-auto object-contain"
                  />
                )
              ) : (
                <div aria-hidden="true" className="h-9 md:h-10 w-24 rounded bg-gray-200" />
              )}
              <span className="hidden sm:inline text-xl md:text-2xl leading-tight font-semibold tracking-wide truncate">
                {siteName}
              </span>
            </Link>
          </div>

          {/* Center: Search (desktop) */}
          <div className="hidden md:flex w-1/3 items-center justify-center">
            <SearchBox />
          </div>

          {/* Right: Controls */}
          <div className="w-1/3 flex items-center justify-end gap-2 relative">
            {authLoading ? (
              <div className="h-8 w-28 rounded bg-gray-100 animate-pulse" aria-hidden />
            ) : !isLoggedIn ? (
              <>
                <Link href="/login" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
                  Login
                </Link>
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
                <Link
                  href="/cart"
                  className="inline-flex items-center justify-center rounded border px-2 py-1 relative"
                  aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
                  title="Cart"
                >
                  <IconCart />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center font-semibold shadow">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>

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
  const [inputValue, setInputValue] = useState(queryFromUrl);

  useEffect(() => {
    setInputValue(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedValue = inputValue.trim();
      if (trimmedValue !== queryFromUrl) {
        if (trimmedValue) router.push(`/search?q=${encodeURIComponent(trimmedValue)}`);
        else if (pathname === "/search") router.push("/");
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, queryFromUrl, pathname, router]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmedValue = inputValue.trim();
        if (trimmedValue) router.push(`/search?q=${encodeURIComponent(trimmedValue)}`);
      }}
      className="flex w-full max-w-xl items-center gap-2 rounded border px-3 h-11 bg-white"
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
      <Link href={href} className="block px-2 py-2 rounded hover:bg-gray-50" onClick={onClick} role="menuitem">
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
      <path d="M6 7h14l-1.5 9.5a2 2 0 0 1-2 1.5H9.5a2 2 0 0 1-2-1.5L6 7Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7l-1-3H3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
