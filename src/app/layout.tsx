// app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext"; // 👈 import มา
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
