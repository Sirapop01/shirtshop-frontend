// src/components/ProductCard.tsx
import Image from "next/image";
import { Product } from "@/lib/mock";

export default function ProductCard({ p }: { p: Product }) {
  return (
    <div className="rounded-md border bg-white">
      <div className="relative w-full aspect-square">
        <Image src={p.image} alt={p.name} fill className="object-cover rounded-t-md" />
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm line-clamp-2">{p.name}</p>
        {p.badges?.length ? (
          <div className="flex gap-1">{p.badges.map(b => <span key={b} className="text-[10px] px-1.5 py-0.5 border rounded">{b}</span>)}</div>
        ) : null}
        <p className="text-sm text-gray-600">{p.priceFrom ? `Starting from $${p.priceFrom}` : p.price ? `$${p.price}` : "-"}</p>
      </div>
    </div>
  );
}
