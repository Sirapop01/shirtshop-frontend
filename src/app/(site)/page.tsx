import { getProducts } from "@/lib/data";
import { Product } from "@/types";
import Link from "next/link";
import Image from "next/image";
import SectionTitle from "@/components/shared/SectionTitle";
import ProductGrid from "@/components/product/ProductGrid";
import FilterControls from "@/components/product/FilterControls";

export const dynamic = "force-dynamic";

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
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'newest':
        default:
            return sorted.sort((a, b) => 
                (new Date(b.createdAt as string)).getTime() - (new Date(a.createdAt as string)).getTime()
            );
    }
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const sort = typeof searchParams?.sort === "string" ? searchParams.sort : "newest";

  const rawProducts = await getProducts();
  const sortedProducts = applySorting(rawProducts, sort);
  const products = dedupeProducts(sortedProducts);
  const { grouped, categoryKeys } = groupAndSort(products);

  return (
    <main className="bg-white">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-3xl py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              StyleWhere Collection
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              ค้นพบสไตล์ที่เป็นคุณกับคอลเลคชั่นเสื้อผ้าใหม่ล่าสุดของเรา ไม่ว่าจะเป็นเสื้อยืดพิมพ์ลายกราฟิกสุดเท่ หรือเสื้อโปโลสุดคลาสสิก เรามีทุกอย่างให้คุณเลือกสรร
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/category/New%20Arrival"
                className="rounded-md bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                ดูสินค้ามาใหม่
              </Link>
              <Link href="#products" className="text-sm font-semibold leading-6 text-gray-900">
                เลือกซื้อทั้งหมด <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div id="products" className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <FilterControls />

        {categoryKeys.length > 0 ? (
          <div className="space-y-16">
            {categoryKeys.map((category) => {
              const allProductsInCategory = grouped[category];
              const totalProducts = allProductsInCategory.length;
              const displayedProducts = allProductsInCategory.slice(0, PRODUCTS_PER_CATEGORY_LIMIT);
              const hasMoreProducts = totalProducts > PRODUCTS_PER_CATEGORY_LIMIT;

              return (
                <section key={category}>
                  <div className="flex justify-between items-baseline mb-6">
                    <SectionTitle>{category}</SectionTitle>
                    {hasMoreProducts && (
                      <Link
                        href={`/category/${encodeURIComponent(category)}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        ดูทั้งหมด ({totalProducts}) <span aria-hidden="true">&rarr;</span>
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