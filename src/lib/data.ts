// lib/data.ts
import { Product, ImageInfo, VariantStock } from "@/types";

const BACKEND_BASE_OAUTH = process.env.NEXT_PUBLIC_BASE_OAUTH; 

const api = (path: string) => `${BACKEND_BASE_OAUTH}${path}`;


const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : v != null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

function normalizeProduct(raw: any): Product {
  // รูป: รองรับทั้ง imageUrls [] และ images [{url}]
  const imageUrls: string[] =
    Array.isArray(raw?.imageUrls) && raw.imageUrls.length > 0
      ? raw.imageUrls
      : Array.isArray(raw?.images)
      ? (raw.images as any[]).map((i) => i?.url).filter(Boolean)
      : [];

  // images (object)
  const images: ImageInfo[] = Array.isArray(raw?.images)
    ? (raw.images as any[])
        .map((i) => ({
          publicId: i?.publicId ?? "",
          url: i?.url ?? "",
        }))
        .filter((i) => i.url)
    : [];

  // variantStocks
  const variantStocks: VariantStock[] = Array.isArray(raw?.variantStocks)
    ? (raw.variantStocks as any[]).map((v) => ({
        color: `${v?.color ?? ""}`.trim(),
        size: `${v?.size ?? ""}`.trim(),
        quantity: toNumber(v?.quantity, 0),
      }))
    : [];

  return {
    id: raw?.id ?? raw?._id ?? "",
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    price: toNumber(raw?.price, 0),
    category: raw?.category ?? "Uncategorized",
    imageUrls,
    images,                 // ✅ ใส่คืน
    variantStocks,          // ✅ ใส่คืน
    availableColors: Array.isArray(raw?.availableColors) ? raw.availableColors : [],
    availableSizes: Array.isArray(raw?.availableSizes) ? raw.availableSizes : [],
    stockQuantity: toNumber(raw?.stockQuantity, 0),
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
  };
}

/** ดึงสินค้าทั้งหมด */
export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(api("/api/products"), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeProduct) : [];
  } catch (err) {
    console.error("[getProducts] Error:", err);
    return [];
  }
}

/** ดึงสินค้าแบบรายตัว */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(api(`/api/products/${id}`), { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch product ${id}: ${res.status}`);
    const raw = await res.json();
    return normalizeProduct(raw);
  } catch (err) {
    console.error("[getProductById] Error:", err);
    return null;
  }
}
