// src/app/(site)/search/page.tsx

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";

// ✨ --- START: ส่วนที่เพิ่มเข้ามา --- ✨
// บรรทัดนี้จะบอก Next.js ว่าให้ render หน้านี้แบบไดนามิกเสมอ
export const dynamic = 'force-dynamic';
// ✨ --- END: ส่วนที่เพิ่มเข้ามา --- ✨

// --- ฟังก์ชันดึงข้อมูล (เหมือนเดิม) ---
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function searchProducts(query: string): Promise<Product[]> {
    if (!query) return [];
    try {
        const res = await fetch(`${API}/api/products/search?q=${encodeURIComponent(query)}`, {
            cache: "no-store",
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}

// --- Type Definition (เหมือนเดิม) ---
interface SearchPageProps {
    searchParams: {
        [key: string]: string | string[] | undefined;
    };
}

// --- Component แสดงผล ---
export default async function SearchPage({ searchParams }: SearchPageProps) {
    const query = typeof searchParams.q === "string" ? searchParams.q : "";
    const products = await searchProducts(query);

    return (
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
            {query && products.length === 0 && (
                <div className="w-full text-center py-10">
                    <p className="text-gray-500">No products found matching your search.</p>
                </div>
            )}

            {products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </main>
    );
}


function ProductCard({ product }: { product: Product }) {
    const THB = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);

    const imageUrl = product.imageUrls?.[0] || "/placeholder.png";

    return (
        <Link href={`/products/${product.id}`} className="group block border rounded-lg overflow-hidden">
            <div className="relative aspect-square">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                />
            </div>
            <div className="p-3">
                <h3 className="text-sm font-medium truncate">{product.name}</h3>
                <p className="text-base font-semibold mt-1">{THB(product.price)}</p>
            </div>
        </Link>
    )
}