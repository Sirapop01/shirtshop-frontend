// src/app/(site)/products/page.tsx
export const dynamic = "force-dynamic"; // หรือใช้ export const revalidate = 60;

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";

const API_BASE =
  process.env.API_BASE_URL ||               // server-only (แนะนำให้ตั้งอันนี้)
  process.env.NEXT_PUBLIC_API_BASE_URL ||   // เผื่อคุณยังใช้ตัวนี้
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

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Products</h1>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No products found.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group block rounded-lg overflow-hidden border"
            >
              <div className="relative aspect-square">
                <Image
                  src={p.imageUrls?.[0] || "/placeholder.png"}
                  alt={p.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-1">{p.name}</h3>
                <p className="text-base font-semibold mt-1">
                  {new Intl.NumberFormat("th-TH", {
                    style: "currency",
                    currency: "THB",
                  }).format(Number(p.price) || 0)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
