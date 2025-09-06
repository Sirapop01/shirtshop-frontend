import { api, type Product } from "@/lib/api";
import ProductGallery from "@/components/ProductGallery";
import SizePill from "@/components/SizePill";
import ProductCardMini from "@/components/ProductCardMini";
import RecentlyViewed from "@/components/RecentlyViewed";

/**
 * Server Component ส่วนนี้รันบนเซิร์ฟเวอร์:
 * - ดึง product ตาม id
 * - ดึง "You may also like"
 */
export default async function ProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const product = await api.getProduct(id);
  const recs = await api.getRecommendations(id);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <TopSection product={product} />

      {/* You may also like */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">You may also like</h2>
        {recs?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
            {recs.map((it) => (
              <ProductCardMini key={it.id || it._id} item={it} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No suggestions.</p>
        )}
      </section>

      {/* Recently viewed */}
      <RecentlyViewed />
    </div>
  );
}

/** ---------- Client Part: เลือกไซซ์ / Add to Cart / Try-On / RecentlyViewed push ---------- */
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { pushRecentlyViewed } from "@/lib/recentlyViewed";

function TopSection({ product }: { product: Product }) {
  const [size, setSize] = useState<string>("");
  const images = useMemo(() => product?.images || [], [product]);

  useEffect(() => {
    // Default เลือก M ถ้ามี
    if (product?.sizes?.includes("M")) setSize("M");
    // เก็บ recently viewed
    pushRecentlyViewed(product.id || product._id);
  }, [product]);

  const money = (n?: number) => (typeof n === "number" ? `$${n.toFixed(0)}` : "-");

  const handleAddToCart = () => {
    if (!size) {
      alert("Please select a size.");
      return;
    }
    const payload = {
      productId: product.id || product._id,
      name: product.name,
      price: product.price ?? 0,
      size,
      quantity: 1,
      image: product.images?.[0] || "",
    };
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push(payload);
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart.");
  };

  const handleTryOn = () => {
    window.location.href = `/try-on/${product.id || product._id}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <ProductGallery images={images} alt={product.name} />

      <div>
        <h1 className="text-2xl md:text-3xl font-semibold leading-snug">{product.name}</h1>

        <div className="mt-6">
          <div className="text-lg font-medium">Product detail</div>
          <div className="mt-2 text-sm grid grid-cols-2 gap-y-2">
            <div className="text-gray-500">Brand</div>
            <div>{product.brand || "-"}</div>
            <div className="text-gray-500">Release Date</div>
            <div>{product.releaseDate ? new Date(product.releaseDate).toLocaleDateString() : "-"}</div>
            <div className="text-gray-500">Price</div>
            <div className="font-semibold">{money(product.price)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm text-gray-500">Size</div>
          <div className="flex flex-wrap gap-2">
            {(product.sizes || []).map((s) => (
              <SizePill key={s} active={s === size} onClick={() => setSize(s)}>
                {s}
              </SizePill>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={handleTryOn} className="px-5 py-3 border rounded-lg hover:bg-gray-50">
            Try It On
          </button>
          <button
            onClick={handleAddToCart}
            className="px-5 py-3 rounded-lg bg-black text-white hover:opacity-90"
            disabled={!size}
          >
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
}
