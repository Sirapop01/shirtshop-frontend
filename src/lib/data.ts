// src/lib/data.ts
// ศูนย์รวม data-fetch สำหรับสินค้า/หมวดหมู่ ฯลฯ
// ทุกอย่างเรียกผ่าน axios instance เดียว (src/lib/api.ts)
// แนวทาง: ตั้ง NEXT_PUBLIC_API_BASE เป็น "โดเมนล้วน" แล้วเรียก path `/api/...`

import api from "@/lib/api";
import type { Product } from "@/types";

// ---------- Types ----------
export type SortKey = "newest" | "price-asc" | "price-desc";
export type PageParams = { page?: number; limit?: number; sort?: SortKey };

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

function toQS(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---------- Product list ----------
export async function getProducts(params: PageParams = {}): Promise<Product[]> {
  // รองรับทั้งกรณีที่ BE คืน {items,total,...} และกรณีคืน array ตรงๆ
  const { data } = await api.get("/api/products" + toQS(params));
  if (Array.isArray(data)) return data as Product[];
  if (data?.items && Array.isArray(data.items)) return data.items as Product[];
  return [];
}

// แบบแบ่งหน้า (ถ้าหน้าใดต้องการ pagination เต็มๆ)
export async function getProductsPaged(params: PageParams = {}): Promise<PagedResult<Product>> {
  const { data } = await api.get("/api/products" + toQS(params));
  if (data?.items && typeof data.total !== "undefined") {
    return {
      items: data.items as Product[],
      total: Number(data.total ?? 0),
      page: Number(data.page ?? params.page ?? 1),
      limit: Number(data.limit ?? params.limit ?? 20),
    };
  }
  // ถ้า BE คืน array เปล่าๆ สร้างผลลัพธ์ให้ใช้งานได้
  const arr: Product[] = Array.isArray(data) ? data : [];
  return { items: arr, total: arr.length, page: 1, limit: arr.length || (params.limit ?? 20) };
}

// ---------- Product detail ----------
export async function getProductById(id: string): Promise<Product | null> {
  if (!id) {
    console.error("[getProductById] missing id");
    return null;
  }
  const { data } = await api.get(`/api/products/${encodeURIComponent(id)}`);
  return (data as Product) ?? null;
}

// ---------- Category ----------
export async function getCategories(): Promise<string[]> {
  const { data } = await api.get("/api/categories");
  if (Array.isArray(data)) return data.map((x) => String(x));
  if (Array.isArray(data?.items)) return data.items.map((x: any) => String(x?.name ?? x));
  return [];
}

export async function getProductsByCategory(
    category: string,
    params: PageParams = {}
): Promise<Product[]> {
  if (!category) return [];
  const { data } = await api.get(
      `/api/categories/${encodeURIComponent(category)}/products` + toQS(params)
  );
  if (Array.isArray(data)) return data as Product[];
  if (data?.items && Array.isArray(data.items)) return data.items as Product[];
  return [];
}

// ---------- Search ----------
export async function searchProducts(
    q: string,
    params: PageParams = {}
): Promise<Product[]> {
  if (!q) return [];
  const { data } = await api.get("/api/products/search" + toQS({ q, ...params }));
  if (Array.isArray(data)) return data as Product[];
  if (data?.items && Array.isArray(data.items)) return data.items as Product[];
  return [];
}

// ---------- Highlights / Collections ----------
export async function getNewArrival(limit = 12): Promise<Product[]> {
  const { data } = await api.get("/api/products/new" + toQS({ limit }));
  return Array.isArray(data) ? (data as Product[]) : Array.isArray(data?.items) ? data.items : [];
}

export async function getFeatured(limit = 12): Promise<Product[]> {
  const { data } = await api.get("/api/products/featured" + toQS({ limit }));
  return Array.isArray(data) ? (data as Product[]) : Array.isArray(data?.items) ? data.items : [];
}

export async function getRelatedProducts(
    productId: string,
    limit = 8
): Promise<Product[]> {
  if (!productId) return [];
  const { data } = await api.get(
      `/api/products/${encodeURIComponent(productId)}/related` + toQS({ limit })
  );
  if (Array.isArray(data)) return data as Product[];
  if (data?.items && Array.isArray(data.items)) return data.items as Product[];
  return [];
}

// ---------- Utilities (optional) ----------
// จัดเรียงฝั่ง FE ถ้าจำเป็น (ถ้า BE รองรับ sort แล้ว ไม่ต้องใช้)
export function sortProducts(products: Product[], sort: SortKey = "newest"): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price-desc":
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "newest":
    default:
      return arr.sort(
          (a, b) =>
              new Date(String(b.createdAt ?? 0)).getTime() -
              new Date(String(a.createdAt ?? 0)).getTime()
      );
  }
}
