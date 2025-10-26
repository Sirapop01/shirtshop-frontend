// src/context/AddressContext.tsx
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
import api, { getAccessToken } from "@/lib/api";

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
  setDefault: (id: string) => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

/* ----------------- helpers ----------------- */
function authHeaders() {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
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

  // base path ภายใต้ BE — ให้กำหนดโดเมนผ่าน NEXT_PUBLIC_API_BASE ในไฟล์เดียว (lib/api.ts)
  const basePath = useMemo(() => `/api/addresses`, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    if (!getAccessToken()) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(basePath, { headers: authHeaders() });
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
    const { data } = await api.post(basePath, toPayload(a), {
      headers: authHeaders(),
    });
    const created = fromBackend(data);
    await refresh();
    return created;
  };

  const updateAddress = async (id: string, a: AddressPayload) => {
    if (!id) throw new Error("Missing address id");
    const { data } = await api.put(`${basePath}/${id}`, toPayload(a), {
      headers: authHeaders(),
    });
    const updated = fromBackend(data);
    await refresh();
    return updated;
  };

  const removeAddress = async (id: string) => {
    if (!id) throw new Error("Missing address id");
    await api.delete(`${basePath}/${id}`, { headers: authHeaders() });
    await refresh();
  };

  const setDefault = async (id: string) => {
    if (!id) throw new Error("Missing address id");
    await api.put(`${basePath}/${id}/default`, undefined, {
      headers: authHeaders(),
    });
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
