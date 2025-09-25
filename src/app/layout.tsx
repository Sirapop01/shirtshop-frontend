// app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AddressProvider } from "@/context/AddressContext"; // 👈 import เพิ่ม
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <AddressProvider>
              {children}
            </AddressProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
