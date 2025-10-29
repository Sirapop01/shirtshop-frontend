// src/context/BrandingContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import api, { buildUrl } from "@/lib/api";

type Branding = { siteName: string; logoUrl?: string | null };
const Ctx = createContext<Branding | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [val, setVal] = useState<Branding | null>(null);

  const fetchBranding = async () => {
    const r = await api.get<Branding>("/api/settings/branding", { headers: { "Cache-Control": "no-cache" } });
    const b = r.data ?? { siteName: "StyleWhere", logoUrl: null };
    setVal({ siteName: b.siteName || "StyleWhere", logoUrl: b.logoUrl ? buildUrl(b.logoUrl) : null });
  };

  useEffect(() => { fetchBranding().catch(() => setVal({ siteName: "StyleWhere", logoUrl: null })); }, []);
  useEffect(() => {
    const h = () => fetchBranding().catch(() => {});
    window.addEventListener("branding:changed", h);
    return () => window.removeEventListener("branding:changed", h);
  }, []);

  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}
export const useBranding = () => useContext(Ctx);
