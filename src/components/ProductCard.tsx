"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(price);
  };

  return (
    <Link href={`/product/${product.id}`} className="group block overflow-hidden">
      
      {/* ⭐️ 1. แก้ไข Container ของรูปภาพ */}
      {/* - ลบคลาส h-[350px] sm:h-[450px] ออก */}
      {/* - เพิ่มคลาส aspect-square เพื่อทำให้เป็นสี่เหลี่ยมจัตุรัส */}
      {/* - เพิ่ม bg-gray-50 เพื่อให้มีพื้นหลังสีเทาอ่อนๆ */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={product.imageUrls[0] || '/placeholder.png'}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          // ⭐️ 2. เพิ่ม transition และ hover effect ให้สวยงามขึ้น
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/500x500/f0f0f0/333?text=Image+Not+Found';
          }}
        />
      </div>

      <div className="relative pt-3">
        <p className="text-sm text-gray-500">{product.category}</p>
        <h3 className="text-md text-gray-700 group-hover:underline group-hover:underline-offset-4 truncate">
          {product.name}
        </h3>
        <p className="mt-1.5 text-lg font-bold tracking-wide text-gray-900">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}