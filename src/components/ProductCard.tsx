'use client'

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
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Link href={`/product/${product.id}`} className="group block overflow-hidden">
      <div className="relative h-[350px] sm:h-[450px]">
        <Image
          src={product.imageUrls[0] || '/placeholder.png'}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover opacity-100 group-hover:opacity-75 transition-opacity"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x550/f0f0f0/333?text=Image+Not+Found';
          }}
        />
      </div>
      <div className="relative pt-3">
        <p className="text-sm text-gray-500">{product.category}</p>
        <h3 className="text-md text-gray-700 group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <p className="mt-1.5 text-lg font-bold tracking-wide text-gray-900">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}