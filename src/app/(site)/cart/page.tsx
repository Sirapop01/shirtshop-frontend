// src/app/(site)/cart/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import CheckoutBar from "@/components/cart/CheckoutBar";

type Item = {
  productId: string;
  name: string;
  image: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
};

const format = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0 });

const PLACEHOLDER_IMG = "/images/placeholder-product.png"; // ใส่รูปสำรองไว้ใน public/

export default function CartPage() {
  const { items, updateItem, removeItem } = useCart();

  // กันกดรัวระหว่างอัปเดต
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const keyOf = (it: Item) => `${it.productId}-${it.color}-${it.size}`;

  const dec = async (it: Item) => {
    const k = keyOf(it);
    if (it.quantity <= 1) return;
    setBusyKey(k);
    try {
      await updateItem({
        productId: it.productId,
        color: it.color,
        size: it.size,
        quantity: Math.max(1, it.quantity - 1),
      });
    } finally {
      setBusyKey(null);
    }
  };

  const inc = async (it: Item) => {
    const k = keyOf(it);
    setBusyKey(k);
    try {
      await updateItem({
        productId: it.productId,
        color: it.color,
        size: it.size,
        quantity: it.quantity + 1,
      });
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (it: Item) => {
    const k = keyOf(it);
    setRemovingKey(k);
    try {
      await removeItem(it.productId, it.color, it.size);
    } finally {
      setRemovingKey(null);
    }
  };

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
          {items.map((it) => {
            const k = keyOf(it);
            const imgSrc = it.image || PLACEHOLDER_IMG;
            const updating = busyKey === k;
            const removing = removingKey === k;

            return (
              <div
                key={k}
                className="flex items-center gap-4 border-b pb-4"
                aria-busy={updating || removing}
              >
                <div className="relative h-20 w-20 rounded overflow-hidden bg-gray-100">
                  <Image
                    src={imgSrc}
                    alt={it.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                    // ถ้าเป็น data URL/โดเมนที่ไม่ได้อนุญาตใน next.config ให้แสดงได้ชัวร์
                    unoptimized={imgSrc.startsWith("data:")}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm text-gray-500">
                    {it.color} / {it.size}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 border rounded disabled:opacity-50"
                    onClick={() => dec(it)}
                    aria-label="Decrease quantity"
                    disabled={updating || it.quantity <= 1}
                  >
                    –
                  </button>
                  <span className="w-6 text-center">{it.quantity}</span>
                  <button
                    className="px-2 border rounded disabled:opacity-50"
                    onClick={() => inc(it)}
                    aria-label="Increase quantity"
                    disabled={updating}
                  >
                    +
                  </button>
                </div>

                <div className="w-28 text-right">
                  {format(it.price * it.quantity)} ฿
                </div>

                <button
                  className="text-red-600 hover:underline ml-4 disabled:opacity-50"
                  onClick={() => remove(it)}
                  aria-label="Remove item"
                  disabled={removing || updating}
                >
                  {removing ? "Removing..." : "Remove"}
                </button>
              </div>
            );
          })}

          <CheckoutBar />
        </div>
      )}
    </main>
  );
}
