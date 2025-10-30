"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import ProductGallery from "@/components/product/ProductGallery";
import ColorSelector from "@/components/product/ColorSelector";
import SizePill from "@/components/product/SizePill";
import QuantitySelector from "./QuantitySelector";
import { useCart } from "@/context/CartContext";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

interface ProductDetailClientProps {
  product: Product;
}

const MySwal = withReactContent(Swal);
const AUTH_KEY = "accessToken";

function isLoggedIn() {
  try {
    const t = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
    return !!t;
  } catch {
    return false;
  }
}

const THB = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const variantStocks = product?.variantStocks ?? [];

  // ตัวเลือกสี/ไซซ์ตามสต็อก
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
        s.add((v.size || "").trim());
      }
    }
    return Array.from(s);
  }, [variantStocks, selectedColor]);

  useEffect(() => {
    if (!selectedColor && colorOptions.length) setNoThrow(setSelectedColor, colorOptions[0]);
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (selectedColor && sizeOptionsForColor.length) {
      if (!sizeOptionsForColor.includes(selectedSize)) {
        setNoThrow(setSelectedSize, sizeOptionsForColor[0]);
      }
    } else {
      setNoThrow(setSelectedSize, "");
    }
  }, [selectedColor, sizeOptionsForColor]);

  const stockForSelected = useMemo(() => {
    if (!selectedColor || !selectedSize) return 0;
    return (variantStocks || [])
      .filter(
        (v) =>
          normalize(v.color) === normalize(selectedColor) &&
          normalize(v.size) === normalize(selectedSize)
      )
      .reduce(
        (sum, v) => sum + toInt((v as any)?.quantity ?? (v as any)?.stock ?? (v as any)?.qty),
        0
      );
  }, [variantStocks, selectedColor, selectedSize]);

  useEffect(() => {
    setNoThrow(setQuantity, 1);
  }, [selectedColor, selectedSize]);

  const handleAddToCart = async () => {
    if (!selectedColor || !selectedSize) return;

    if (!isLoggedIn()) {
      const r = await MySwal.fire({
        title: "ต้องเข้าสู่ระบบก่อน",
        text: "คุณต้อง Login ก่อนเพิ่มสินค้าลงตะกร้า",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ไปที่ Login",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
      });
      if (r.isConfirmed) {
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

    const res = await MySwal.fire({
      icon: "success",
      title: "เพิ่มลงตะกร้าแล้ว",
      showCancelButton: true,
      confirmButtonText: "ไปตะกร้า",
      cancelButtonText: "เลือกสินค้าต่อ",
      reverseButtons: true,
      timer: 1500,
      showConfirmButton: true,
    });
    if (res.isConfirmed) router.push("/cart");
  };

  const priceNumber = toInt(product?.price);

  // ---- Layout: ซ้าย (แกลเลอรี + คำอธิบาย) / ขวา (บล็อกสั่งซื้อ) ----
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      {/* LEFT: Gallery + Description */}
      <div className="lg:col-span-7 space-y-5">
        <ProductGallery images={product.imageUrls} alt={product.name} />

        {Boolean(product?.description?.trim()) && (
          <section className="rounded-2xl border border-gray-200 bg-white/70 p-5 leading-relaxed text-gray-800">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">รายละเอียดสินค้า</h2>
            <div className="whitespace-pre-line text-[15px]">
              {product.description}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT: Buy Box */}
      <aside className="lg:col-span-5">
        <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm">
          {product.category && (
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              {String(product.category)}
            </p>
          )}
          <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            {product.name}
          </h1>

          <div className="mt-3 flex items-baseline gap-3">
            <p className="text-3xl font-semibold tabular-nums text-gray-900">
              {THB(priceNumber)}
            </p>
            {/* ต้องการตัดป้ายสต็อกออกก็ลบบรรทัดด้านล่างได้เลย */}
            {/* <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-gray-200 text-gray-600">มีสินค้า</span> */}
          </div>

          {/* สี */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">
              สี: <span className="font-normal">{selectedColor || "-"}</span>
            </h3>
            <div className="mt-3">
              <ColorSelector
                colors={colorOptions}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
            </div>
          </div>

          {/* ไซซ์ */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">ไซซ์</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {sizeOptionsForColor.length === 0 ? (
                <span className="text-sm text-gray-500">เลือกสีก่อนเพื่อดูไซซ์ที่มี</span>
              ) : (
                sizeOptionsForColor.map((s) => (
                  <SizePill key={s} active={selectedSize === s} onClick={() => setSelectedSize(s)}>
                    {s}
                  </SizePill>
                ))
              )}
            </div>
          </div>

          {/* จำนวน */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">จำนวน</h3>
            <div className="mt-2">
              <QuantitySelector
                quantity={Number.isFinite(quantity) ? quantity : 1}
                setQuantity={setQuantity}
                maxQuantity={stockForSelected}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {!selectedSize
                ? "โปรดเลือกไซซ์"
                : stockForSelected > 0
                ? `${stockForSelected} ชิ้นคงเหลือ`
                : "รุ่น/ไซซ์นี้สินค้าหมด"}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleAddToCart}
              disabled={stockForSelected <= 0 || !selectedColor || !selectedSize}
              className="w-full rounded-lg bg-gray-900 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {stockForSelected > 0 ? "เพิ่มลงตะกร้า" : "สินค้าหมด"}
            </button>

            {product.imageUrls?.[0] && (
              <button
                onClick={() =>
                  router.push(
                    `/tryon?garmentUrl=${encodeURIComponent(product.imageUrls![0])}`
                  )
                }
                className="w-full rounded-lg border border-gray-900 bg-white px  -5 px-5 py-3 font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                👕 ทดลองเสื้อตัวนี้ (Try-On)
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* helpers */
function normalize(s?: string) {
  return (s || "").trim().toLowerCase();
}
function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function setNoThrow<T>(set: (v: T) => void, v: T) {
  try { set(v); } catch {}
}
