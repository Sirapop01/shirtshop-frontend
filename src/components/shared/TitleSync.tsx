// src/components/TitleSync.tsx
"use client";
import { useEffect } from "react";
import { useBranding } from "@/context/BrandingContext";

export default function TitleSync() {
  const b = useBranding();
  useEffect(() => {
    if (b?.siteName) document.title = b.siteName;
  }, [b?.siteName]);
  return null;
}
