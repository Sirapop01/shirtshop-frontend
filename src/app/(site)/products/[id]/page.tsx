import { getProductById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/ProductDetailClient";

// ⭐️ นี่คือ Server Component ที่ทำหน้าที่ดึงข้อมูล
export default async function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  // ดึงข้อมูลสินค้าจาก Backend
  const product = await getProductById(id);

  // ถ้าไม่เจอสินค้า ให้แสดงหน้า 404
  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 py-8">
      <ProductDetailClient product={product} />
    </main>
  );
}
