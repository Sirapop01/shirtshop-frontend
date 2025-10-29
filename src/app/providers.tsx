// src/app/providers.tsx
"use client";

import { ReactNode } from "react";
import { BrandingProvider } from "@/context/BrandingContext";   // << เพิ่มบรรทัดนี้
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AddressProvider } from "@/context/AddressContext";
import { OrderProvider } from "@/context/OrderContext";
import { PaymentProvider } from "@/context/PaymentContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <BrandingProvider> {/* << ครอบนอกสุด */}
      <AuthProvider>
        <CartProvider>
          <AddressProvider>
            <OrderProvider>
              <PaymentProvider>
                {children}
              </PaymentProvider>
            </OrderProvider>
          </AddressProvider>
        </CartProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}
