//AddressContext.tsx
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

/* ----------------- Types ----------------- */
export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  subdistrict: string; // tambon (TH)
  district: string;    // amphure_id (string)
  province: string;    // province_id (string)
  postalCode: string;
  isDefault?: boolean;
}
type AddressPayload = Omit<Address, "id">;

interface AddressContextType {
  addresses: Address[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAddress: (a: AddressPayload) => Promise<Address>;
  updateAddress: (id: string, a: AddressPayload) => Promise<Address>;
  removeAddress: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>; // ✅ เพิ่ม
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ----------------- helpers ----------------- */
const ACCESS_TOKEN_KEY = "accessToken";
const getToken = () =>
  (typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY));

function authHeader() {
  const t = getToken();
  return t ? `Bearer ${t}` : "";
}

async function authFetch(url: string, init?: RequestInit, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const ah = authHeader();
  if (ah) headers.set("Authorization", ah);

  try {
    return await fetch(url, { ...init, headers, cache: "no-store", signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** FE -> BE payload */
function toPayload(a: Address | AddressPayload): AddressPayload {
  return {
    fullName: (a.fullName || "").trim(),
    phone: (a.phone || "").trim(),
    addressLine1: (a.addressLine1 || "").trim(),
    province: String(a.province ?? ""),
    district: String(a.district ?? ""),
    subdistrict: (a.subdistrict || "").trim(),
    postalCode: String(a.postalCode ?? "").padStart(5, "0"),
    isDefault: Boolean(a.isDefault),
  };
}

/** BE -> FE normalize (รองรับ default/isDefault/_id) */
function fromBackend(raw: any): Address {
  return {
    id: raw?.id ?? raw?._id ?? undefined,
    fullName: raw?.fullName ?? "",
    phone: raw?.phone ?? "",
    addressLine1: raw?.addressLine1 ?? "",
    subdistrict: raw?.subdistrict ?? "",
    district: String(raw?.district ?? ""),
    province: String(raw?.province ?? ""),
    postalCode: String(raw?.postalCode ?? ""),
    isDefault: Boolean(raw?.isDefault ?? raw?.default ?? false),
  };
}

/* ----------------- Provider ----------------- */
export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const apiBase = useMemo(() => `${API}/api/addresses`, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    if (!getToken()) { setAddresses([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await authFetch(apiBase, { method: "GET" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const mapped = Array.isArray(data) ? data.map(fromBackend) : [];
      if (mounted.current) setAddresses(mapped);
    } catch (e: any) {
      console.error("[address] GET error", e);
      if (mounted.current) setError(e?.message ?? "Network error");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const addAddress = async (a: AddressPayload) => {
    const res = await authFetch(apiBase, { method: "POST", body: JSON.stringify(toPayload(a)) });
    if (!res.ok) throw new Error((await res.text()) || "Create address failed");
    const created = fromBackend(await res.json());
    await refresh();
    return created;
  };

  const updateAddress = async (id: string, a: AddressPayload) => {
    if (!id) throw new Error("Missing address id");
    const res = await authFetch(`${apiBase}/${id}`, { method: "PUT", body: JSON.stringify(toPayload(a)) });
    if (!res.ok) throw new Error((await res.text()) || "Update address failed");
    const updated = fromBackend(await res.json());
    await refresh();
    return updated;
  };

  const removeAddress = async (id: string) => {
    if (!id) throw new Error("Missing address id");
    const res = await authFetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.text()) || "Delete address failed");
    await refresh();
  };

  const setDefault = async (id: string) => {
    if (!id) throw new Error("Missing address id");
    const res = await authFetch(`${apiBase}/${id}/default`, { method: "PUT" });
    if (!res.ok) throw new Error((await res.text()) || "Set default failed");
    await refresh();
  };

  return (
    <AddressContext.Provider
      value={{ addresses, loading, error, refresh, addAddress, updateAddress, removeAddress, setDefault }}
    >
      {children}
    </AddressContext.Provider>
  );
}

/* ----------------- Hook ----------------- */
export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used inside AddressProvider");
  return ctx;
}
