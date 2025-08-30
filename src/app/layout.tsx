// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StyleWhere",
  description: "Shirt shop",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        {/* ใส่ Navbar ของเว็บหลักที่นี่ (ถ้ามี) */}
        {children}
      </body>
    </html>
  );
}
