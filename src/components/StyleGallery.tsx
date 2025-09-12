// src/components/StyleGallery.tsx
import Image from "next/image";

export default function StyleGallery({ items }: { items: {id:string; image:string; title:string}[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(i => (
        <figure key={i.id} className="rounded-md overflow-hidden border bg-white">
          <div className="relative w-full aspect-[4/5]">
            <Image 
              src={i.image} 
              alt={i.title} 
              fill 
              // ⭐️⭐️⭐️ เพิ่มบรรทัดนี้เข้ามา ⭐️⭐️⭐️
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover" 
            />
          </div>
          <figcaption className="p-3 text-sm">{i.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}