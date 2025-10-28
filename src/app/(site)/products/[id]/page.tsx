// src/app/(site)/products/[id]/page.tsx
export const dynamic = "force-dynamic";

import { getProductById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/product/ProductDetailClient";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      <ProductDetailClient product={product} />
    </main>
  );
}
