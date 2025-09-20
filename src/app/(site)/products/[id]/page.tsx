// src/app/(site)/products/[id]/page.tsx

import { getProductById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";

// ⭐️ นี่คือ Server Component ที่ทำหน้าที่ดึงข้อมูล
export default async function ProductPage({ params }: { params: { id: string } }) {
  
  // ⭐️ 1. ดึงค่า id ออกมาเก็บในตัวแปรใหม่ก่อน
  const { id } = await params; 
  const productId = String(id); 
  
  
  // ⭐️ 2. จากนั้นค่อยเรียกใช้ await กับฟังก์ชันที่ดึงข้อมูล
  const product = await getProductById(productId);
  console.log("ProductPage - productId:", productId);
  console.log("ProductPage - product:", product);
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