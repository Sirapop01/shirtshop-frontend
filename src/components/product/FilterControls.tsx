// src/components/product/FilterControls.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export default function FilterControls() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSort = searchParams.get("sort") || "newest";

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSort = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", newSort);
        // ใช้ router.push เพื่ออัปเดต URL ซึ่งจะทำให้ Server Component re-render ใหม่
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex justify-end mb-8">
            <div className="relative">
                <select
                    value={currentSort}
                    onChange={handleSortChange}
                    className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                >
                    <option value="newest">เรียงตาม: ใหม่ล่าสุด</option>
                    <option value="price-asc">เรียงตาม: ราคา (น้อยไปมาก)</option>
                    <option value="price-desc">เรียงตาม: ราคา (มากไปน้อย)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown size={18} />
                </div>
            </div>
        </div>
    );
}