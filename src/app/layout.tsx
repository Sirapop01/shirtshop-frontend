// app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext"; // 👈 import มา
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gray-50">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

