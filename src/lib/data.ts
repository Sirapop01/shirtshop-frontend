// lib/data.ts
import { Product } from "@/types";

/**
 * ใช้ BASE URL จาก env (สำหรับ Server-side เท่านั้น)
 * - ใส่ใน .env.local: API_BASE=http://localhost:8080
 */
const API_BASE = process.env.API_BASE || "http://localhost:8080";

const api = (path: string) => `${API_BASE}${path}`;

/** ปรับรูปแบบข้อมูลให้ FE ใช้งานได้เสมอ (กันกรณี BE ส่ง field ไม่ครบ/ต่างเวอร์ชัน) */
function normalizeProduct(raw: any): Product {
  // รูป: รองรับได้ทั้ง imageUrls (เก่า) และ images [{url}] (ใหม่)
  const imageUrls: string[] =
    Array.isArray(raw?.imageUrls) && raw.imageUrls.length > 0
      ? raw.imageUrls
      : Array.isArray(raw?.images)
      ? raw.images.map((i: any) => i?.url).filter(Boolean)
      : [];

  // ราคา: บางทีจาก DB อาจเป็น string -> แปลงเป็น number
  const priceNum =
    typeof raw?.price === "number"
      ? raw.price
      : raw?.price != null
      ? Number(raw.price)
      : 0;

  return {
    id: raw?.id ?? raw?._id ?? "",
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    price: Number.isFinite(priceNum) ? priceNum : 0,
    category: raw?.category ?? "Uncategorized",
    imageUrls,
    availableColors: raw?.availableColors ?? [],
    availableSizes: raw?.availableSizes ?? [],
    stockQuantity:
      typeof raw?.stockQuantity === "number"
        ? raw.stockQuantity
        : Number(raw?.stockQuantity) || 0,
    createdAt: raw?.createdAt ?? raw?.created_at ?? undefined,
  } as Product;
}

/** ดึงสินค้าทั้งหมด (สดใหม่ทุกครั้ง ไม่ติด cache) */
export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(api("/api/products"), {
      // cache: "no-store" เพียงพอสำหรับการไม่แคช
      cache: "no-store", 
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(normalizeProduct);
  } catch (error) {
    console.error("[getProducts] Error:", error);
    return [];
  }
}

/** ดึงสินค้าแบบรายตัว (สดใหม่ทุกครั้ง) */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(api(`/api/products/${id}`), {
      cache: "no-store",
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to fetch product ${id}: ${res.status}`);
    }

    const raw = await res.json();
    return normalizeProduct(raw);
  } catch (error) {
    console.error("[getProductById] Error:", error);
    return null;
  }
}