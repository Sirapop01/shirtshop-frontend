"use client";
import { useBranding } from "@/context/BrandingContext";

export default function HeroBrandName() {
  const branding = useBranding();
  return <>{branding?.siteName || "StyleWhere"}</>;
}
