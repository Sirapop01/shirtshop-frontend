// components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { clsx } from "clsx";

export default function Sidebar() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = [
    { href: "/profile",   label: "Profile" },
    { href: "/addresses", label: "Address" },
    { href: "/favorite",  label: "Favorite" },
    { href: "/purchase",  label: "Purchase" },
    { href: "/shipping",  label: "Shipping" },
    { href: "/cart",      label: "Shopping Cart" },
  ];

  const linkClasses = "block py-3 px-4 rounded-lg font-medium transition-colors";
  const activeClasses = "bg-[#adbc9f] text-white";
  const inactiveClasses = "text-gray-700 hover:bg-gray-100";

  return (
    <nav className="w-64 flex-shrink-0 bg-white p-5 border-r border-gray-200 flex flex-col">
      <div className="text-3xl font-bold px-2 py-2.5 mb-8">$</div>
      <ul className="flex-grow space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(linkClasses, isActive ? activeClasses : inactiveClasses)}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => { logout(); router.push("/login"); }}
        className="w-full text-left py-3 px-4 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Log Out
      </button>
    </nav>
  );
}
