import { getProducts } from "@/lib/data";
import { Product } from "@/types";
import SectionTitle from "@/components/SectionTitle";
import ProductGrid from "@/components/ProductGrid";
import Link from "next/link";

/** ปิด cache เพจนี้ (App Router) */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ลำดับหมวดที่อยากให้ขึ้นก่อน */
const CATEGORY_ORDER = [
  "New Arrival",
  "Graphic Tees",
  "T-Shirts",
  "Polo",
  "Long Sleeves",
  "Accessories",
] as const;

/** ตัดซ้ำ: ใช้ ชื่อ+ราคา+หมวด เป็น key */
const dedupeProducts = (products: Product[]) => {
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = `${(p.name || "").trim().toLowerCase()}|${p.price}|${(p.category || "").trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** กลุ่มตามหมวด + sort ภายในหมวด */
const groupAndSort = (products: Product[]) => {
  const grouped: Record<string, Product[]> = {};

  for (const p of products) {
    const cat = p.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  // เรียงในหมวด: createdAt ใหม่→เก่า, fallback ชื่อ A→Z
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => {
      const ad = a.createdAt ? Date.parse(a.createdAt as unknown as string) : NaN;
      const bd = b.createdAt ? Date.parse(b.createdAt as unknown as string) : NaN;
      if (!Number.isNaN(ad) && !Number.isNaN(bd) && ad !== bd) return bd - ad;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  // เรียงหมวด: ตาม CATEGORY_ORDER ก่อน แล้ว A→Z สำหรับที่เหลือ
  const categoryKeys = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]);
    const ib = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  return { grouped, categoryKeys };
};

export default async function AllProductsPage() {
  // แนะนำให้ getProducts ภายในใช้ fetch({ cache: "no-store" }) ด้วย
  const raw = await getProducts();
  const products = dedupeProducts(raw);
  const { grouped, categoryKeys } = groupAndSort(products);

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">All Products</h1>
      </div>

      {categoryKeys.length > 0 ? (
        <div className="space-y-12">
          {categoryKeys.map((category) => (
            <section key={category}>
              <SectionTitle>{category}</SectionTitle>
              <ProductGrid items={grouped[category]} />
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found.</p>
          <p className="mt-4">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
