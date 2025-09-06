"use client";
import React, { useEffect, useState } from "react";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import { api, type Product } from "@/lib/api";
import ProductCardMini from "./ProductCardMini";
import { useParams } from "next/navigation";

export default function RecentlyViewed() {
  const [items, setItems] = useState<Product[]>([]);
  const params = useParams();
  const currentId = (params?.id as string) || "";

  useEffect(() => {
    (async () => {
      const ids = getRecentlyViewed().filter((x) => x !== currentId);
      if (!ids.length) {
        setItems([]);
        return;
      }
      try {
        const data = await api.getProductsByIds(ids);
        setItems(data || []);
      } catch {
        setItems([]);
      }
    })();
  }, [currentId]);

  if (!items.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold">Recently viewed</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-4">
        {items.map((it) => (
          <ProductCardMini key={it.id || it._id} item={it} />
        ))}
      </div>
    </section>
  );
}
