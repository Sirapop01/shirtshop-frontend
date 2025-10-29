// src/app/(site)/cart/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
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

const num = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0 });

const PLACEHOLDER_IMG = "/images/placeholder-product.png";

export default function CartPage() {
  const { items, updateItem, removeItem } = useCart();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const keyOf = (it: Item) => `${it.productId}-${it.color}-${it.size}`;

  const dec = async (it: Item) => {
    const k = keyOf(it);
    if (it.quantity <= 1) return;
    setBusyKey(k);
    try {
      await updateItem({ productId: it.productId, color: it.color, size: it.size, quantity: it.quantity - 1 });
    } finally {
      setBusyKey(null);
    }
  };
  const inc = async (it: Item) => {
    const k = keyOf(it);
    setBusyKey(k);
    try {
      await updateItem({ productId: it.productId, color: it.color, size: it.size, quantity: it.quantity + 1 });
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

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.price * it.quantity, 0),
    [items]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
              ตะกร้าสินค้า
            </h1>
            <p className="text-sm text-gray-500">
              ตรวจสอบรายการก่อนสั่งซื้อ — แก้จำนวนหรือลบได้ที่นี่
            </p>
          </div>
          <Link href="/products" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            ← เลือกซื้อสินค้าต่อ
          </Link>
        </div>
      </section>

      {/* ถ้าว่าง แสดงการ์ดเดียวตรงกลาง */}
      {items.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-16 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100" />
          <h2 className="text-lg font-semibold text-gray-900">ยังไม่มีสินค้าในตะกร้า</h2>
          <p className="mt-1 text-sm text-gray-500">เริ่มช้อปปิ้งและเพิ่มสินค้าที่คุณชอบได้เลย</p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              ← กลับหน้าแรก
            </Link>
          </div>
        </section>
      ) : (
        // ====== GRID: ซ้าย = รายการสินค้า (2 คอลัมน์), ขวา = สรุปยอด (1 คอลัมน์) ======
        <div className="grid gap-6 md:grid-cols-3">
          {/* LEFT: cart list */}
          <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>สินค้าในตะกร้า</span>
                <span className="tabular-nums">
                  รวมชั่วคราว: <b className="text-gray-900">{num(subtotal)} ฿</b>
                </span>
              </div>
            </div>

            <ul className="divide-y divide-gray-100">
              {items.map((it) => {
                const k = keyOf(it);
                const imgSrc = it.image || PLACEHOLDER_IMG;
                const updating = busyKey === k;
                const removing = removingKey === k;

                return (
                  <li key={k} className="px-4 md:px-6 py-4" aria-busy={updating || removing}>
                    <div className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[96px_1fr_auto_auto] gap-4 md:gap-6 items-center">
                      {/* Image */}
                      <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={imgSrc}
                          alt={it.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized={imgSrc.startsWith("data:")}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{it.name}</div>
                        <div className="mt-0.5 text-sm text-gray-600">
                          {it.color} / {it.size}
                        </div>
                        <div className="mt-1 text-sm text-gray-800 tabular-nums md:hidden">
                          ราคา: {num(it.price)} ฿
                        </div>
                      </div>

                      {/* Qty stepper */}
                      <div className="justify-self-end">
                        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-sm">
                          <button
                            className="h-9 w-9 select-none text-lg leading-none border-r border-gray-200 disabled:opacity-50 hover:bg-gray-50 active:translate-y-[1px] rounded-l-lg"
                            onClick={() => dec(it)}
                            aria-label="ลดจำนวน"
                            disabled={updating || it.quantity <= 1}
                          >
                            –
                          </button>
                          <div className="w-10 text-center tabular-nums">{it.quantity}</div>
                          <button
                            className="h-9 w-9 select-none text-lg leading-none border-l border-gray-200 disabled:opacity-50 hover:bg-gray-50 active:translate-y-[1px] rounded-r-lg"
                            onClick={() => inc(it)}
                            aria-label="เพิ่มจำนวน"
                            disabled={updating}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price + remove */}
                      <div className="justify-self-end text-right">
                        <div className="hidden md:block text-sm text-gray-500 tabular-nums">
                          {num(it.price)} ฿ / ชิ้น
                        </div>
                        <div className="mt-0.5 text-base font-semibold text-gray-900 tabular-nums">
                          {num(it.price * it.quantity)} ฿
                        </div>
                        <button
                          className="mt-2 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 disabled:opacity-50"
                          onClick={() => remove(it)}
                          aria-label="ลบออกจากตะกร้า"
                          disabled={removing || updating}
                        >
                          {removing ? "กำลังลบ..." : "ลบ"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-600">รวมชั่วคราว</span>
              <span className="tabular-nums text-gray-900 font-semibold">
                {num(subtotal)} ฿
              </span>
            </div>
          </section>

          {/* RIGHT: summary (sticky) */}
          <aside className="md:col-span-1 md:sticky md:top-24 h-max">
            <CheckoutBar />
          </aside>
        </div>
      )}
    </main>
  );
}
