// src/components/BrandRow.tsx
import Image from "next/image";
import { Brand } from "@/lib/mock";

export default function BrandRow({ items }: { items: Brand[] }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {items.map(b => (
        <div key={b.id} className="border rounded-md h-24 flex items-center justify-center bg-white">
          <Image src={b.logo} alt={b.name} width={90} height={36} className="object-contain" />
        </div>
      ))}
    </div>
  );
}
