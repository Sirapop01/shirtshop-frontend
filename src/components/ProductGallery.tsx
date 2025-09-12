"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

// Component สำหรับแสดงแกลเลอรีรูปภาพ
export default function ProductGallery({ images, alt }: ProductGalleryProps) {
  // ถ้าไม่มีรูปภาพ ให้แสดง placeholder
  if (!images || images.length === 0) {
    return (
      <div className="aspect-square w-full relative rounded-lg bg-gray-100">
        <Image 
          src="https://placehold.co/600x600/f0f0f0/333?text=No+Image"
          alt="No image available"
          fill
          className="object-cover rounded-lg"
        />
      </div>
    );
  }
  
  // ใช้ State เพื่อเก็บ URL ของรูปภาพหลักที่กำลังแสดงอยู่
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div className="flex flex-col gap-4">
      {/* รูปภาพหลัก */}
      <div className="aspect-square w-full relative overflow-hidden rounded-lg">
        <Image
          src={mainImage}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      {/* รูปภาพย่อย (Thumbnails) */}
      <div className="grid grid-cols-5 gap-2">
        {images.map((imgUrl, index) => (
          <div
            key={index}
            onClick={() => setMainImage(imgUrl)}
            className={`aspect-square relative cursor-pointer rounded-md overflow-hidden transition-all ${
              mainImage === imgUrl ? 'ring-2 ring-offset-2 ring-black' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Image 
              src={imgUrl}
              alt={`${alt} thumbnail ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
