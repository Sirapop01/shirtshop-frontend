// src/app/category/[category]/page.tsx

import { getProductsByCategory } from "@/lib/data"; // สมมติว่าเราจะสร้างฟังก์ชันนี้
import ProductGrid from "@/components/product/ProductGrid";
import { notFound } from "next/navigation";
import Link from "next/link";

/** หน้านี้จะถูก Render แบบไดนามิกเสมอ */
export const dynamic = "force-dynamic";

// --- Component แสดงผล ---
export default async function CategoryPage({
    params,
}: {
    params: { category: string };
}) {
    // 1. ถอดรหัสชื่อหมวดหมู่จาก URL (เช่น "New%20Arrival" -> "New Arrival")
    const categoryName = decodeURIComponent(params.category);

    // 2. เรียกใช้ฟังก์ชันใหม่เพื่อดึงสินค้าตามหมวดหมู่
    const products = await getProductsByCategory(categoryName);

    // 3. ถ้าไม่พบสินค้าในหมวดหมู่นี้เลย อาจจะแสดงหน้า 404
    if (!products) {
        notFound();
    }

    return (
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
            <div className="border-b border-gray-200 pb-6">
                <nav aria-label="Breadcrumb" className="text-sm">
                    <ol role="list" className="flex items-center space-x-2">
                        <li>
                            <Link href="/" className="hover:text-gray-700">Home</Link>
                        </li>
                        <li>
                            <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true" className="h-5 w-4 text-gray-300">
                                <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                            </svg>
                        </li>
                        <li>
                            <span className="font-medium text-gray-500">{categoryName}</span>
                        </li>
                    </ol>
                </nav>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900">
                    {categoryName}
                </h1>
                <p className="mt-2 text-base text-gray-500">
                    พบสินค้าทั้งหมด {products.length} รายการ
                </p>
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