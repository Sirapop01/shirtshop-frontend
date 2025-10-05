"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import CheckoutBar from "@/components/cart/CheckoutBar";

const format = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function CartPage() {
  const { items, updateItem, removeItem } = useCart();

  const dec = (it: any) =>
    updateItem({ productId: it.productId, color: it.color, size: it.size, quantity: Math.max(1, it.quantity - 1) });
  const inc = (it: any) =>
    updateItem({ productId: it.productId, color: it.color, size: it.size, quantity: it.quantity + 1 });

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <Link href="/products" className="text-sm text-gray-700 hover:underline">
          ← Back to Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No items in cart.</p>
          <p className="mt-4">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((it) => (
            <div key={`${it.productId}-${it.color}-${it.size}`} className="flex items-center gap-4 border-b pb-4">
              <div className="relative h-20 w-20 rounded overflow-hidden bg-gray-100">
                {/* ถ้าภาพเป็น external อย่าลืม config next.config.js domains */}
                <Image src={it.image} alt={it.name} fill className="object-cover" />
              </div>

              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-500">{it.color} / {it.size}</div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-2 border rounded" onClick={() => dec(it)}>-</button>
                <span className="w-6 text-center">{it.quantity}</span>
                <button className="px-2 border rounded" onClick={() => inc(it)}>+</button>
              </div>

              <div className="w-28 text-right">{format(it.price * it.quantity)} ฿</div>

              <button className="text-red-600 hover:underline ml-4"
                onClick={() => removeItem(it.productId, it.color, it.size)}>
                Remove
              </button>
            </div>
          ))}

          <CheckoutBar />
        </div>
      )}
    </main>
  );
}
