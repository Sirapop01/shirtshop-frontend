"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";      // ← ของคุณอยู่แล้ว
import { CartProvider } from "@/context/CartContext";      // ← ของคุณอยู่แล้ว
import { AddressProvider } from "@/context/AddressContext";// ← ใช้ไฟล์ของคุณ (แนบด้านล่างให้ครบ)
import { OrderProvider } from "@/context/OrderContext";  // ← ของคุณอยู่แล้ว
import { PaymentProvider } from "@/context/PaymentContext"; // ← ของคุณอยู่แล้ว
export default function Providers({ children }: { children: ReactNode }) {
  return (
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
  );
}
