"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images = [], alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] || 'https://placehold.co/600x750?text=No+Image';

  // State สำหรับฟังก์ชันซูม
  const [zoom, setZoom] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPosition({ x, y });
  };

  return (
    // Container หลักที่เปลี่ยน Layout ตามขนาดหน้าจอ
    <div className="flex flex-col md:flex-row-reverse md:gap-6">
      
      {/* รูปภาพหลัก พร้อมฟังก์ชันซูม */}
      <div className="flex-1 relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100 mb-4 md:mb-0">
        <div
            className="w-full h-full"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={handleMouseMove}
        >
            <Image
                key={activeIndex} // ใช้ key เพื่อ force re-render และให้ transition ทำงานเมื่อเปลี่ยนรูป
                src={activeImage}
                alt={alt}
                fill
                sizes="(max-width: 768px) 100vw, 75vw"
                className="object-cover transition-transform duration-300 ease-in-out"
                style={{
                    transformOrigin: `${position.x}% ${position.y}%`,
                    transform: zoom ? 'scale(1.75)' : 'scale(1)',
                }}
                onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/600x750?text=Image+Error';
                }}
            />
        </div>
      </div>

      {/* Thumbnails */}
      {/* Desktop: แสดงแนวตั้ง */}
      <div className="hidden md:flex md:flex-col gap-3 w-20">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
              activeIndex === index ? 'border-black' : 'border-gray-200'
            }`}
          >
            <Image
              src={image}
              alt={`${alt} thumbnail ${index + 1}`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      
      {/* Mobile: แสดงแนวนอน */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
              activeIndex === index ? 'border-black' : 'border-gray-200'
            }`}
          >
            <Image
              src={image}
              alt={`${alt} thumbnail ${index + 1}`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

    </div>
  );
}