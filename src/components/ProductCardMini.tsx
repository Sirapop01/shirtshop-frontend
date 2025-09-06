"use client";
import React from "react";
import type { Product } from "@/lib/api";
import { useRouter } from "next/navigation";

type Props = {
  item: Product;
};

export default function ProductCardMini({ item }: Props) {
  const router = useRouter();
  const id = item.id || item._id || "";
  const price = typeof item.price === "number" ? `$${item.price.toFixed(0)}` : "-";

  return (
    <button onClick={() => router.push(`/product/${id}`)} className="group text-left">
      <div className="border rounded-lg p-3 hover:shadow-sm transition">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.images?.[0] || "/placeholder.png"}
          alt={item.name}
          className="w-full h-40 object-contain"
          loading="lazy"
        />
      </div>
      <div className="mt-2 text-sm line-clamp-2 group-hover:underline">{item.name}</div>
      <div className="text-gray-500 text-sm">{price}</div>
    </button>
  );
}
