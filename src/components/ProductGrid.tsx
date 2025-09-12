'use client'

import { Product } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  items: Product[];
}

export default function ProductGrid({ items }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}