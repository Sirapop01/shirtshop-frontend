// components/cart/CheckoutBar.tsx
"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function CheckoutBar() {
  const { subTotal, shippingFee, total, itemCount, clearCart } = useCart();
  const disabled = itemCount === 0;
  const shippingText = shippingFee > 0 ? `${fmt(shippingFee)} ฿` : "คำนวณตอนชำระเงิน";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
      {/* Summary */}
      <div className="flex flex-col gap-1 text-sm text-gray-700 tabular-nums items-end">
        <div className="flex w-full max-w-sm items-center justify-between">
          <span>จำนวนสินค้า</span>
          <span className="font-medium">{itemCount} ชิ้น</span>
        </div>
        <div className="flex w-full max-w-sm items-center justify-between">
          <span>รวมสินค้า</span>
          <span className="font-medium">{fmt(subTotal)} ฿</span>
        </div>
        <div className="flex w-full max-w-sm items-center justify-between">
          <span>ค่าจัดส่ง</span>
          <span className="font-medium">{shippingText}</span>
        </div>

        <div className="mt-2 h-px w-full max-w-sm bg-gray-100" />

        <div
          className="flex w-full max-w-sm items-center justify-between text-base"
          aria-live="polite"
        >
          <span className="font-semibold text-gray-900">ยอดสุทธิ</span>
          <span className="font-semibold text-gray-900">{fmt(total)} ฿</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => !disabled && clearCart()}
          disabled={disabled}
          className={[
            "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5",
            "text-sm font-semibold text-gray-800 shadow-sm transition",
            "hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          ล้างตะกร้า
        </button>

        <Link
          href="/checkout"
          aria-disabled={disabled}
          className={[
            "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10",
            disabled
              ? "bg-gray-300 text-white pointer-events-none"
              : "bg-gray-900 text-white hover:bg-gray-800",
          ].join(" ")}
        >
          ดำเนินการชำระเงิน
        </Link>
      </div>
    </div>
  );
}
