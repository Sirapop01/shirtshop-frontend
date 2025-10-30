// src/app/(site)/products/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";

const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  null;

async function listProducts(): Promise<Product[]> {
  if (!API_BASE) {
    console.error("API_BASE_URL is not set");
    return [];
  }
  try {
    const res = await fetch(`${API_BASE}/api/products`, { cache: "no-store" });
    if (!res.ok) {
      console.error("[/products] HTTP", res.status);
      return [];
    }
    const data = (await res.json()) as Product[];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[/products] fetch error:", e);
    return [];
  }
}

const THB = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12 space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">สินค้า</h1>
            <p className="text-sm text-gray-500">เลือกดูสินค้าทั้งหมดในร้าน</p>
          </div>
          {products.length > 0 && (
            <span className="text-sm text-gray-600">
              ทั้งหมด <b className="text-gray-900">{products.length}</b> รายการ
            </span>
          )}
        </div>
      </section>

      {/* Empty state */}
      {products.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-16 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100" />
          <h2 className="text-lg font-semibold text-gray-900">ยังไม่มีสินค้า</h2>
          <p className="mt-1 text-sm text-gray-500">กรุณาลองใหม่อีกครั้งภายหลัง</p>
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
        <section>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => {
              const cover = p.imageUrls?.[0] || "/placeholder.png";
              const price = Number(p.price) || 0;

              return (
                <li key={p.id}>
                  <Link
                    href={`/products/${p.id}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={cover}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 25vw"
                        unoptimized={cover.startsWith("data:")}
                      />
                      {/* hover hint */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    <div className="p-3 md:p-4">
                      <h3 className="line-clamp-2 text-sm md:text-[15px] font-medium text-gray-900">
                        {p.name}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="tabular-nums text-base md:text-lg font-semibold text-gray-900">
                          {THB(price)}
                        </span>
                        {p.category && (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            {p.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
