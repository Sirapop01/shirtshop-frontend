// src/app/(site)/products/[id]/page.tsx

import { getProductById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";

// ⭐️ นี่คือ Server Component ที่ทำหน้าที่ดึงข้อมูล
export default async function ProductPage({ params }: { params: { id: string } }) {
  
  const { id } = await params; 
  const productId = String(id); 
  
  
  const product = await getProductById(productId);
  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 py-8">
      <ProductDetailClient product={product} />
    </main>
  );
}