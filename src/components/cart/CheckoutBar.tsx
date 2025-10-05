// components/cart/CheckoutBar.tsx
"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

const format = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function CheckoutBar() {
  const { subTotal, shippingFee, total, itemCount, clearCart } = useCart();
  const disabled = itemCount === 0;

  const shippingText =
    shippingFee > 0 ? `${format(shippingFee)} ฿` : "คำนวณตอน Checkout";

  return (
    <div className="flex flex-col items-end gap-3 pt-4">
      <div className="text-sm text-gray-600">
        <div>Subtotal: <span className="font-medium">{format(subTotal)} ฿</span></div>
        <div>Shipping: <span className="font-medium">{shippingText}</span></div>
        <div className="text-lg">
          Total: <span className="font-bold">{format(total)} ฿</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className={`px-3 py-2 rounded border ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabled && clearCart()}
          disabled={disabled}
        >
          Clear Cart
        </button>
        <Link
          href="/checkout"
          className={`px-4 py-2 rounded bg-black text-white ${disabled ? "opacity-50 pointer-events-none" : ""}`}
          aria-disabled={disabled}
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
