// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import TitleSync from "@/components/shared/TitleSync";

export const metadata: Metadata = {
  title: "StyleWhere",               // ค่า default ก่อนโหลด branding
  description: "ShirtShop Frontend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>
          <TitleSync />               {/* อัปเดต document.title ตาม siteName จาก BE */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
