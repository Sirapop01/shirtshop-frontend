// src/components/product/ProductGallery.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

interface ProductGalleryProps {
  images?: string[];
  alt?: string;
}

const PLACEHOLDER = "/images/placeholder-product.png";

export default function ProductGallery({
  images = [],
  alt = "Product image",
}: ProductGalleryProps) {
  const cleaned = useMemo(
    () => (images && images.length ? images.filter(Boolean) : [PLACEHOLDER]),
    [images]
  );
  const [index, setIndex] = useState(0);

  // --- hover-zoom แบบเดิม: ซูมตามตำแหน่งเมาส์ ---
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // percent

  const onMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setPos({ x, y });
  };

  // เลื่อนรูปย่อที่เลือกให้อยู่ในวิวดั้งเดิม
  const railRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el =
      railRef.current?.querySelector<HTMLButtonElement>(`[data-thumb="${index}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  return (
    <div className="relative">
      {/* รูปหลัก: กว้างเต็มคอลัมน์ + ซูมตามเมาส์แบบเดิม */}
      <div className="group relative w-full aspect-square overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div
          className="absolute inset-0 w-full h-full"
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={onMove}
          aria-hidden
        >
          <Image
            src={cleaned[index] || PLACEHOLDER}
            alt={alt}
            fill
            sizes="(min-width:1024px) 720px, 100vw"
            className="object-contain p-2 transition-transform duration-300 ease-out will-change-transform"
            style={{
              // โฟกัสซูมไปยังตำแหน่งเมาส์
              transformOrigin: `${pos.x}% ${pos.y}%`,
              // ถ้าอยากซูมน้อยลง/มากขึ้น ปรับค่านี้ได้ เช่น 1.2 หรือ 1.1
              transform: zoom ? "scale(1.75)" : "scale(1)",
            }}
            unoptimized={cleaned[index]?.startsWith("data:")}
            onError={(ev) => {
              ev.currentTarget.src = PLACEHOLDER;
            }}
            priority
          />
        </div>
      </div>

      {/* แถบรูปย่อเดสก์ท็อป: ลอยซ้าย ไม่กินความกว้างรูปหลัก */}
      <div
        ref={railRef}
        className="hidden md:flex flex-col gap-2 absolute -left-[112px] top-0 max-h-[560px] overflow-auto rounded-2xl border border-gray-200 bg-white p-2"
      >
        {cleaned.map((src, i) => {
          const active = i === index;
          return (
            <button
              key={src + i}
              data-thumb={i}
              onClick={() => setIndex(i)}
              className={[
                "relative aspect-square w-[88px] overflow-hidden rounded-xl ring-1 ring-gray-200 transition",
                active ? "ring-2 ring-gray-900" : "hover:ring-gray-300",
              ].join(" ")}
              aria-current={active ? "true" : undefined}
              title={`รูปที่ ${i + 1}`}
            >
              <Image
                src={src || PLACEHOLDER}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                sizes="88px"
                className="object-cover"
                unoptimized={src?.startsWith("data:")}
                onError={(ev) => {
                  ev.currentTarget.src = PLACEHOLDER;
                }}
              />
            </button>
          );
        })}
      </div>

      {/* แถบรูปย่อมือถือ: แนวนอนใต้รูป */}
      <div className="md:hidden mt-3 flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2">
        {cleaned.map((src, i) => {
          const active = i === index;
          return (
            <button
              key={src + i}
              onClick={() => setIndex(i)}
              className={[
                "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200 transition",
                active ? "ring-2 ring-gray-900" : "hover:ring-gray-300",
              ].join(" ")}
              aria-current={active ? "true" : undefined}
            >
              <Image
                src={src || PLACEHOLDER}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized={src?.startsWith("data:")}
                onError={(ev) => {
                  ev.currentTarget.src = PLACEHOLDER;
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
