// src/components/HeroBanner.tsx
import Image from "next/image";

export default function HeroBanner() {
  return (
    <div className="relative w-full h-56 md:h-80 lg:h-96 mb-6 overflow-hidden rounded-md">
      <Image src="/hero.jpg" alt="Hero" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
