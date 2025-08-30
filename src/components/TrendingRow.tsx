// src/components/TrendingRow.tsx
import { Product } from "@/lib/mock";
import ProductCard from "./ProductCard";

export default function TrendingRow({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(p => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
