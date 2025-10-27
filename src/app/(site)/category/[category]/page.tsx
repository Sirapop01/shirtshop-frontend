// src/app/(site)/category/[category]/page.tsx
export const dynamic = "force-dynamic";

import { getProductsByCategory } from "@/lib/data";
import ProductGrid from "@/components/product/ProductGrid";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  // 👇 ต้องเป็น Promise แล้วค่อย await
  params: Promise<{ category?: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const p = await params; // ✅ await ก่อนใช้
  const raw = p?.category ?? "";
  const categoryName = decodeURIComponent(raw);

  if (!categoryName) notFound();

  const products = await getProductsByCategory(categoryName);
  if (!products) notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="border-b border-gray-200 pb-6">
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol role="list" className="flex items-center space-x-2">
            <li><Link href="/" className="hover:text-gray-700">Home</Link></li>
            <li>
              <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true" className="h-5 w-4 text-gray-300">
                <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
              </svg>
            </li>
            <li><span className="font-medium text-gray-500">{categoryName}</span></li>
          </ol>
        </nav>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">{categoryName}</h1>
        <p className="mt-2 text-base text-gray-500">พบสินค้าทั้งหมด {products.length} รายการ</p>
      </div>

      <div className="pt-12">
        {products.length > 0 ? (
          <ProductGrid items={products} />
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">ไม่พบสินค้าในหมวดหมู่นี้</p>
          </div>
        )}
      </div>
    </main>
  );
}
