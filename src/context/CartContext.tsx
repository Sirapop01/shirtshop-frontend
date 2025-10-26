// src/context/CartContext.tsx
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
import api from "@/lib/api";

/* ---------------- Types ---------------- */
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

/* -------------- helpers: token/header -------------- */
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
    typeof window === "undefined"
        ? null
        : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

const authHeaders = () => {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

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
      const { data } = await api.get("/api/cart", { headers: authHeaders() });
      if (!mounted.current) return;

      const mapped: CartItem[] = Array.isArray(data?.items)
          ? data.items.map(mapFromBackend)
          : [];

      setItems(mapped);
      setSubTotal(Number(data?.subTotal ?? 0));
      setShippingFee(Number(data?.shippingFee ?? 0));
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
    try {
      await api.post("/api/cart/items", body, { headers: authHeaders() });
    } catch (e) {
      console.error("[cart] POST /api/cart/items error", e);
    }
    await refresh();
  };

  const updateItem = async (i: { productId: string; color: string; size: string; quantity: number }) => {
    try {
      await api.put("/api/cart/items", i, { headers: authHeaders() });
    } catch (e) {
      console.error("[cart] PUT /api/cart/items error", e);
    }
    await refresh();
  };

  const removeItem = async (productId: string, color: string, size: string) => {
    try {
      const qs = new URLSearchParams({ productId, color, size }).toString();
      await api.delete(`/api/cart/items?${qs}`, { headers: authHeaders() });
    } catch (e) {
      console.error("[cart] DELETE /api/cart/items error", e);
    }
    await refresh();
  };

  const clearCart = async () => {
    try {
      await api.delete("/api/cart", { headers: authHeaders() });
    } catch (e) {
      console.error("[cart] DELETE /api/cart error", e);
    }
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
