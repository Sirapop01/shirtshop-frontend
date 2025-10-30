// src/app/(site)/page.tsx
import { getProducts } from "@/lib/data";
import { Product } from "@/types";
import Link from "next/link";
import Image from "next/image";
import SectionTitle from "@/components/shared/SectionTitle";
import ProductGrid from "@/components/product/ProductGrid";
import FilterControls from "@/components/product/FilterControls";
import { unstable_noStore as noStore } from "next/cache";
import HeroBrandName from "@/components/home/HeroBrandName"; 
// กัน cache ฝั่ง server/ui ให้หมด
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_ORDER = [
    "New Arrival",
    "Graphic Tees",
    "T-Shirts",
    "Polo",
    "Long Sleeves",
    "Accessories",
] as const;

const PRODUCTS_PER_CATEGORY_LIMIT = 4;

const dedupeProducts = (products: Product[]): Product[] => {
    const seen = new Set<string>();
    return products.filter((p) => {
        const key = `${(p.name || "").trim()}|${p.price}|${(p.category || "").trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const groupAndSort = (products: Product[]) => {
    const grouped: Record<string, Product[]> = {};
    for (const p of products) {
        const cat = p.category || "Uncategorized";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    }
    const categoryKeys = Object.keys(grouped).sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a as any);
        const ib = CATEGORY_ORDER.indexOf(b as any);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });
    return { grouped, categoryKeys };
};

const applySorting = (products: Product[], sort: string | null): Product[] => {
    const sorted = [...products];
    switch (sort) {
        case "price-asc":
            return sorted.sort((a, b) => a.price - b.price);
        case "price-desc":
            return sorted.sort((a, b) => b.price - a.price);
        case "newest":
        default:
            return sorted.sort(
                (a, b) =>
                    new Date(b.createdAt as string).getTime() -
                    new Date(a.createdAt as string).getTime()
            );
    }
};

// NOTE: searchParams เป็น Promise ใน Server Component รุ่นใหม่ → ต้อง await ก่อนใช้
type SP = { [key: string]: string | string[] | undefined };

export default async function HomePage({
                                           searchParams,
                                       }: {
    searchParams: Promise<SP>;
}) {
    noStore();

    const sp = await searchParams; // ✅ แก้จุด error
    const sort = typeof sp?.sort === "string" ? sp.sort : "newest";

    const rawProducts = await getProducts();
    const sortedProducts = applySorting(rawProducts, sort);
    const products = dedupeProducts(sortedProducts);
    const { grouped, categoryKeys } = groupAndSort(products);

    return (
        <main className="bg-white">
            {/* === HERO === */}
            <div className="relative isolate overflow-hidden px-6 pt-14 lg:px-8">
                {/* bg image */}
                <Image
                src="/mainbg.png"
                alt=""
                fill
                priority
                className="object-cover object-center -z-10 pointer-events-none select-none filter brightness-75"
                />
                {/* overlay ไล่เฉดให้ตัวหนังสือเด่น */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/10" />

                <div className="mx-auto max-w-4xl py-28 sm:py-40">
                {/* แผงข้อความโปร่งใส (ช่วยให้อ่านง่ายบนจอเล็ก) */}
                <div className="mx-auto max-w-3xl text-center rounded-2xl sm:rounded-3xl/none sm:bg-transparent sm:backdrop-blur-0 sm:p-0 bg-black/20 backdrop-blur-sm p-6">
                    <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
                    <HeroBrandName /> Collection
                    </h1>
                    <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-8 text-white/90">
                    ค้นพบสไตล์ที่เป็นคุณกับคอลเลคชั่นเสื้อผ้าใหม่ล่าสุดของเรา ไม่ว่าจะเป็นเสื้อยืดพิมพ์ลายกราฟิกสุดเท่ หรือเสื้อโปโลสุดคลาสสิก เรามีทุกอย่างให้คุณเลือกสรร
                    </p>

                    <div className="mt-10 flex items-center justify-center gap-x-4 sm:gap-x-6">
                    <Link
                        href="/category/New%20Arrival"
                        prefetch={false}
                        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg ring-1 ring-white/20 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        ดูสินค้ามาใหม่
                    </Link>
                    <Link
                        href="#products"
                        prefetch={false}
                        className="text-sm font-semibold leading-6 text-white/90 hover:text-white underline-offset-4 hover:underline"
                    >
                        เลือกซื้อทั้งหมด <span aria-hidden="true">→</span>
                    </Link>
                    </div>
                </div>
                </div>
            </div>

            {/* === PRODUCTS === */}
            <div
                id="products"
                className="mx-auto max-w-7xl px-4 md:px-6 py-16 sm:py-24 scroll-mt-24"
            >
                {/* หัวข้อส่วนสินค้า + คำโปรยสั้นๆ */}
                <div className="mb-8 sm:mb-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                    สินค้าแนะนำตามหมวดหมู่
                </h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                    เลือกดูหมวดที่คุณสนใจ หรือจัดเรียงตามราคากับสินค้ามาใหม่ได้ทันที
                </p>
                </div>

                <FilterControls />

                {categoryKeys.length > 0 ? (
                <div className="space-y-16 sm:space-y-20">
                    {categoryKeys.map((category) => {
                    const allProductsInCategory = grouped[category];
                    const totalProducts = allProductsInCategory.length;
                    const displayedProducts = allProductsInCategory.slice(
                        0,
                        PRODUCTS_PER_CATEGORY_LIMIT
                    );
                    const hasMoreProducts =
                        totalProducts > PRODUCTS_PER_CATEGORY_LIMIT;

                    return (
                        <section key={category}>
                        <div className="flex justify-between items-baseline mb-6">
                            <SectionTitle>{category}</SectionTitle>
                            {hasMoreProducts && (
                            <Link
                                href={`/category/${encodeURIComponent(category)}`}
                                prefetch={false}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                ดูทั้งหมด ({totalProducts}){" "}
                                <span aria-hidden="true">→</span>
                            </Link>
                            )}
                        </div>
                        <ProductGrid items={displayedProducts} />
                        </section>
                    );
                    })}
                </div>
                ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">ไม่พบสินค้าในขณะนี้</p>
                </div>
                )}
            </div>
            </main>

    );
}
