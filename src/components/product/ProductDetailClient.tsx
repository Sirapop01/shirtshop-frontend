// src/components/ProductDetailClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useState } from "react";


import { Product } from "@/types";
import ProductGallery from "@/components/product/ProductGallery";
import ColorSelector from "@/components/product/ColorSelector";
import SizePill from "@/components/product/SizePill";
import QuantitySelector from "./QuantitySelector";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

interface ProductDetailClientProps {
  product: Product;
}

const MySwal = withReactContent(Swal);
const AUTH_KEY = "shirtshop_auth";


function isLoggedIn() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return !!obj?.accessToken; // โครงตามที่คุณเก็บ
  } catch {
    return false;
  }
}
export default function ProductDetailClient({ product }: ProductDetailClientProps) {

  const router = useRouter();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const { addItem } = useCart();

  const variantStocks = product?.variantStocks ?? [];

  /** รวมสีที่มีในสต็อกจาก variantStocks (unique) */
  const colorOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of variantStocks) {
      const c = (v?.color ?? "").trim();
      if (c) s.add(c);
    }
    return Array.from(s);
  }, [variantStocks]);

  const sizeOptionsForColor = useMemo(() => {
    if (!selectedColor) return [];
    const s = new Set<string>();
    for (const v of variantStocks) {
      if (!v?.size) continue;
      if (normalize(v.color) === normalize(selectedColor)) {
        s.add(v.size.trim());
      }
    }
    return Array.from(s);
  }, [variantStocks, selectedColor]);

  useEffect(() => {
    if (!selectedColor && colorOptions.length > 0) {
      setSelectedColor(colorOptions[0]);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (selectedColor && sizeOptionsForColor.length > 0) {
      if (!sizeOptionsForColor.includes(selectedSize)) {
        setSelectedSize(sizeOptionsForColor[0]);
      }
    } else {
      setSelectedSize("");
    }
  }, [selectedColor, sizeOptionsForColor]);

  const stockForSelectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return 0;
    const total = variantStocks
      .filter(
        (v) =>
          normalize(v.color) === normalize(selectedColor) &&
          normalize(v.size) === normalize(selectedSize)
      )
      .reduce((sum, v) => sum + toInt((v as any)?.quantity ?? (v as any)?.stock ?? (v as any)?.qty), 0);
    return total;
  }, [variantStocks, selectedColor, selectedSize]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedColor, selectedSize]);

  const handleAddToCart = async () => {

    if (!selectedColor || !selectedSize) return;

    if (!isLoggedIn()) {
      const result = await MySwal.fire({
        title: "ต้องเข้าสู่ระบบก่อน",
        text: "คุณต้อง Login ก่อนเพิ่มสินค้าลงตะกร้า",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ไปที่ Login",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        const next = typeof window !== "undefined" ? window.location.pathname : "/";
        router.push(`/login?next=${encodeURIComponent(next)}`);
      }
      return;
    }

    await addItem({
      productId: product.id,
      name: product.name,
      image: product.imageUrls?.[0] ?? "",
      price: toInt(product.price),
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
  };

  const priceNumber = toInt(product?.price); // กันกรณี price เป็น string

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      <ProductGallery images={product.imageUrls} alt={product.name} />

      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {product.category}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2">{product.name}</h1>
        <p className="text-3xl font-semibold mt-4">
          {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(priceNumber)}
        </p>

        {/* Color */}
        <div className="mt-8">
          <h3 className="text-md font-semibold">
            Color: <span className="font-normal">{selectedColor || "-"}</span>
          </h3>
          <div className="mt-3">
            <ColorSelector
              colors={colorOptions}
              selectedColor={selectedColor}
              onColorSelect={(c) => setSelectedColor(c)}
            />
          </div>
        </div>

        {/* Size */}
        <div className="mt-8">
          <h3 className="text-md font-semibold">Size</h3>
          <div className="flex flex-wrap gap-3 mt-3">
            {sizeOptionsForColor.length === 0 && (
              <span className="text-sm text-gray-500">No size available for this color</span>
            )}
            {sizeOptionsForColor.map((size) => (
              <SizePill key={size} active={selectedSize === size} onClick={() => setSelectedSize(size)}>
                {size}
              </SizePill>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="mt-8">
          <h3 className="text-md font-semibold">Quantity</h3>
          <QuantitySelector quantity={quantity} setQuantity={setQuantity} maxQuantity={stockForSelectedVariant} />
          <p className="text-xs text-gray-500 mt-2">
            {!selectedSize
              ? "Please select a size"
              : stockForSelectedVariant > 0
                ? `${stockForSelectedVariant} pieces available`
                : "Out of stock for this selection"}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-8">
          <button
            onClick={handleAddToCart}
            disabled={stockForSelectedVariant <= 0 || !selectedColor || !selectedSize}
            className="w-full py-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {stockForSelectedVariant > 0 ? "Add To Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helpers */
function normalize(input?: string) {
  return (input ?? "").trim().toLowerCase();
}
function toInt(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}
