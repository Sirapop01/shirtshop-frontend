// src/components/home/HeroLogo.tsx
"use client";
/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useMemo } from "react";
import { useBranding } from "@/context/BrandingContext";

type HeroLogoProps = {
  height?: number;
  width?: number;               // ✅ เพิ่ม prop นี้
  showName?: boolean;
  className?: string;
  nameClassName?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] || "").toUpperCase())
    .join("");
}

export default function HeroLogo({
  height = 40,
  width,                        // ✅ รับ width
  showName = false,
  className = "",
  nameClassName = "ml-2 text-xl md:text-2xl font-semibold tracking-wide truncate",
}: HeroLogoProps) {
  const branding = useBranding();
  const siteName = branding?.siteName || "StyleWhere";
  const logoUrl = branding?.logoUrl || null;

  const isExternal = useMemo(() => !!logoUrl && /^https?:\/\//i.test(logoUrl), [logoUrl]);
  const initials = useMemo(() => getInitials(siteName) || "SW", [siteName]);

  // ถ้าไม่กำหนด width จะเดาให้จากอัตราส่วนแนวนอน
  const computedWidth = width ?? Math.round(height * 4);

  return (
    <span className={`inline-flex items-center min-w-0 ${className}`}>
      {logoUrl ? (
        isExternal ? (
          <img
            src={logoUrl}
            alt={siteName}
            height={height}
            width={computedWidth}       // ✅ ใช้ width ที่รับมา/คำนวณ
            className="object-contain"
          />
        ) : (
          <Image
            src={logoUrl}
            alt={siteName}
            height={height}
            width={computedWidth}       // ✅ ใช้ width ที่รับมา/คำนวณ
            priority
            className="h-auto w-auto max-h-10 object-contain"
          />
        )
      ) : (
        <span
          aria-hidden
          style={{ height, width: height }}
          className="inline-flex items-center justify-center rounded-lg bg-gray-200 text-gray-700 font-bold"
          title={siteName}
        >
          {initials}
        </span>
      )}

      {showName && (
        <span className={nameClassName} title={siteName}>
          {siteName}
        </span>
      )}
    </span>
  );
}
