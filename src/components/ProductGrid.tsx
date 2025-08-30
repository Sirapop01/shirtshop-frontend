// src/components/ProductGrid.tsx
import ProductCard from "./ProductCard";
import { Product } from "@/lib/mock";

export default function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(p => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
