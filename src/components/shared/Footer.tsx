// src/components/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { useBranding } from "@/context/BrandingContext";

export default function Footer({ className }: { className?: string }) {
  const branding = useBranding();
  const logoUrl = branding?.logoUrl || null;

  const isExternal = (src: string) => /^https?:\/\//i.test(src);
  const year = new Date().getFullYear();

  // ปรับขนาดโลโก้ที่นี่
  const sizeSm = 48;  // mobile
  const sizeMd = 100;  // md ขึ้นไป

  return (
    <footer className={clsx("w-full bg-zinc-50 border-t border-zinc-200", className)}>
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          {/* Logo only (no name) */}
          <Link href="/" aria-label="Go to Homepage" className="flex items-center">
            {logoUrl ? (
              isExternal(logoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  width={sizeMd}
                  height={sizeMd}
                  className="h-12 w-12 md:h-18 md:w-18 object-contain"
                  style={{ height: sizeSm, width: sizeSm }}
                />
              ) : (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={sizeMd}
                  height={sizeMd}
                  className="object-contain"
                  // ใช้ style ให้รองรับ breakpoint (Next/Image ต้องกำหนด w/h คงที่)
                  style={{ height: sizeSm, width: sizeSm }}
                  priority
                />
              )
            ) : (
              <div
                className="rounded bg-zinc-200"
                style={{ height: sizeSm, width: sizeSm }}
                aria-hidden="true"
              />
            )}
          </Link>

          {/* Social */}
          <div className="flex items-center gap-4">
            <Link aria-label="Facebook" href="https://facebook.com" target="_blank"
                  className="text-zinc-500 hover:text-zinc-800 transition">
              <FaFacebook size={24} />
            </Link>
            <Link aria-label="Instagram" href="https://instagram.com" target="_blank"
                  className="text-zinc-500 hover:text-zinc-800 transition">
              <FaInstagram size={24} />
            </Link>
            <Link aria-label="Twitter" href="https://twitter.com" target="_blank"
                  className="text-zinc-500 hover:text-zinc-800 transition">
              <FaTwitter size={24} />
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4 text-xs text-zinc-500 text-center md:text-left">
          © {year} All rights reserved.
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 768px) {
          footer img[alt="Logo"], footer span > img[alt="Logo"] {
            width: ${sizeMd}px !important;
            height: ${sizeMd}px !important;
          }
        }
      `}</style>
    </footer>
  );
}
