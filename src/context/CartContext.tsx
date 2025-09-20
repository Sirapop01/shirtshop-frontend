"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  subTotal: number;
  refresh: () => Promise<void>;
  addItem: (i: CartItem) => Promise<void>;
  updateItem: (i: {productId:string;color:string;size:string;quantity:number}) => Promise<void>;
  removeItem: (productId: string, color: string, size: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// --- helpers ---------------------------------------------------------------
function readAuthFromLocal() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("shirtshop_auth") : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAuthHeader() {
  const auth = readAuthFromLocal();
  const token = auth?.accessToken || auth?.token || "";
  const type  = auth?.tokenType || "Bearer";
  return token ? `${type} ${token}` : "";
}

async function authFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const authHeader = getAuthHeader();
  if (authHeader) headers.set("Authorization", authHeader);

  return fetch(url, { ...init, headers, cache: "no-store" });
}
// --------------------------------------------------------------------------


export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subTotal, setSubTotal] = useState(0);

  const refresh = async () => {
    const res = await authFetch(`${API}/api/cart`, { method: "GET" });
    if (!res.ok) {
      console.error("[cart] GET /api/cart failed", res.status, await res.text());
      return;
    }
    const data = await res.json();
    setItems((data.items ?? []).map((x: any) => ({
      productId: x.productId,
      name: x.name,
      image: x.imageUrl,
      price: x.unitPrice,
      color: x.color,
      size: x.size,
      quantity: x.quantity,
    })));
    setSubTotal(data.subTotal ?? 0);
  };

  useEffect(() => { refresh(); }, []);

  const addItem = async (i: CartItem) => {
    const res = await authFetch(`${API}/api/cart/items`, {
      method: "POST",
      body: JSON.stringify({
        productId: i.productId,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
      }),
    });
    if (!res.ok) console.error("[cart] POST /api/cart/items", res.status, await res.text());
    await refresh();
  };

  const updateItem = async (i: {productId:string;color:string;size:string;quantity:number}) => {
    const res = await authFetch(`${API}/api/cart/items`, {
      method: "PUT",
      body: JSON.stringify(i),
    });
    if (!res.ok) console.error("[cart] PUT /api/cart/items", res.status, await res.text());
    await refresh();
  };

  const removeItem = async (productId: string, color: string, size: string) => {
    const qs = new URLSearchParams({ productId, color, size }).toString();
    const res = await authFetch(`${API}/api/cart/items?${qs}`, { method: "DELETE" });
    if (!res.ok) console.error("[cart] DELETE /api/cart/items", res.status, await res.text());
    await refresh();
  };

  const clearCart = async () => {
    const res = await authFetch(`${API}/api/cart`, { method: "DELETE" });
    if (!res.ok) console.error("[cart] DELETE /api/cart", res.status, await res.text());
    await refresh();
  };

  return (
    <CartContext.Provider value={{ items, subTotal, refresh, addItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
