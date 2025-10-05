"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

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
  shippingFee: number;
  total: number;
  itemCount: number;
  refresh: () => Promise<void>;
  addItem: (i: CartItem) => Promise<void>;
  updateItem: (i: { productId: string; color: string; size: string; quantity: number }) => Promise<void>;
  removeItem: (productId: string, color: string, size: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ---------------- helpers: token + fetch with timeout ---------------- */
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

function authHeader() {
  const t = getAccessToken();
  return t ? `Bearer ${t}` : "";
}

async function authFetch(url: string, init?: RequestInit, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);

  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const ah = authHeader();
  if (ah) headers.set("Authorization", ah);

  try {
    return await fetch(url, { ...init, headers, cache: "no-store", signal: ctrl.signal });
  } finally {
    clearTimeout(to);
  }
}

/* ---------------- Context Provider ---------------- */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const mounted = useRef(true);

  const total = useMemo(() => subTotal + shippingFee, [subTotal, shippingFee]);
  const itemCount = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
    [items]
  );

  const mapFromBackend = (raw: any): CartItem => ({
    productId: String(raw.productId),
    name: raw.name ?? "",
    image: raw.imageUrl ?? raw.image ?? "",
    price: Number(raw.unitPrice ?? raw.price ?? 0),
    color: raw.color ?? "",
    size: raw.size ?? "",
    quantity: Number(raw.quantity ?? 0),
  });

  const refresh = async () => {
    if (!getAccessToken()) {
      if (mounted.current) {
        setItems([]);
        setSubTotal(0);
        setShippingFee(0);
      }
      return;
    }
    try {
      const res = await authFetch(`${API}/api/cart`, { method: "GET" });
      if (!res.ok) {
        console.error("[cart] GET /api/cart failed", res.status, await res.text());
        return;
      }
      const data = await res.json();
      if (!mounted.current) return;

      const mapped: CartItem[] = Array.isArray(data.items)
        ? data.items.map(mapFromBackend)
        : [];

      setItems(mapped);
      setSubTotal(Number(data.subTotal ?? 0));
      setShippingFee(Number(data.shippingFee ?? 0));
    } catch (e) {
      console.error("[cart] GET /api/cart error", e);
    }
  };

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = async (i: CartItem) => {
    const body = {
      productId: i.productId,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
    };
    const res = await authFetch(`${API}/api/cart/items`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[cart] POST /api/cart/items", res.status, await res.text());
    await refresh();
  };

  const updateItem = async (i: { productId: string; color: string; size: string; quantity: number }) => {
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
    <CartContext.Provider
      value={{
        items,
        subTotal,
        shippingFee,
        total,
        itemCount,
        refresh,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
