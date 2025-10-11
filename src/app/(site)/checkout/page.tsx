// src/app/(site)/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ---------- Types ---------- */
type CreateOrderResponse = {
  orderId: string;
  total: number;
  promptpayTarget: string;
  promptpayQrUrl: string; // may be data URL or external URL
  expiresAt: string; // ISO
};

type OrderStatus = "PENDING_PAYMENT" | "SLIP_UPLOADED" | "PAID" | "REJECTED" | "EXPIRED";

type OrderItem = {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  color: string;
  size: string;
  quantity: number;
};

type ShippingAddress = {
  id?: string; // when coming from /api/addresses
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postcode?: string | null;
  isDefault?: boolean;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  paymentSlipUrl?: string | null;
  expiresAt?: string | null;
  total?: number;
  promptpayTarget?: string | null;
  promptpayQrUrl?: string | null;
  items?: OrderItem[];
  shippingAddress?: ShippingAddress | null; // snapshot from BE (if provided)
};

type AddressListItem = ShippingAddress & { id: string };

/* ---------- Auth helpers ---------- */
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

async function authFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(url, { ...init, headers, cache: "no-store" });
}

/* ================================================================= */

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, total: cartTotal, refresh } = useCart();

  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  // addresses
  const [addresses, setAddresses] = useState<AddressListItem[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  /* ----- redirect unauthenticated ----- */
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
    }
  }, [router]);

  /* ----- load addresses (only before order is created) ----- */
  useEffect(() => {
    if (order) return; // after created, freeze address on UI
    let stop = false;
    const load = async () => {
      setAddrLoading(true);
      try {
        const res = await authFetch(`${API}/api/addresses`);
        if (!res.ok) return;
        const data = (await res.json()) as AddressListItem[];
        if (stop) return;
        setAddresses(data || []);
        // select default or first
        const def = data.find(a => a.isDefault) || data[0];
        setSelectedAddressId(def?.id || null);
      } finally {
        setAddrLoading(false);
      }
    };
    load();
    return () => { stop = true; };
  }, [order]);

  const canCheckout = useMemo(
    () => cartItems.length > 0 && cartTotal > 0 && !!selectedAddressId,
    [cartItems, cartTotal, selectedAddressId]
  );

  /* ----- countdown ----- */
  useEffect(() => {
    let t: any;
    const exp = orderDetail?.expiresAt || order?.expiresAt;
    if (exp) {
      t = setInterval(() => {
        const diff = Math.max(0, Math.floor((+new Date(exp) - Date.now()) / 1000));
        setTimeLeft(diff);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => t && clearInterval(t);
  }, [order?.expiresAt, orderDetail?.expiresAt]);

  /* ----- poll order status ----- */
  useEffect(() => {
    if (!order?.orderId) {
      setOrderDetail(null);
      return;
    }
    let stop = false;
    const fetchStatus = async () => {
      const res = await authFetch(`${API}/api/orders/${order.orderId}`);
      if (stop) return;
      if (res.ok) {
        const data = (await res.json()) as OrderDetail;
        setOrderDetail(data);
      }
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, [order?.orderId]);

  /* ----- upload gate / banner ----- */
  const { canUploadSlip, disabledReason, banner } = useMemo(() => {
    if (!order) {
      return { canUploadSlip: false, disabledReason: "ยังไม่ได้สร้างออเดอร์", banner: { tone: "warning" as const, text: "ยังไม่ได้สร้างออเดอร์" } };
    }
    if (timeLeft <= 0) {
      return { canUploadSlip: false, disabledReason: "ออเดอร์หมดอายุ", banner: { tone: "error" as const, text: "ออเดอร์หมดอายุแล้ว" } };
    }
    const st = orderDetail?.status ?? "PENDING_PAYMENT";
    if (st === "PENDING_PAYMENT") return { canUploadSlip: true, disabledReason: "", banner: { tone: "success" as const, text: "พร้อมแนบสลิปเพื่อยืนยันการชำระ" } };
    if (st === "SLIP_UPLOADED") return { canUploadSlip: false, disabledReason: "ส่งสลิปแล้ว", banner: { tone: "info" as const, text: "ส่งสลิปแล้ว กำลังรอการตรวจสอบ" } };
    if (st === "PAID") return { canUploadSlip: false, disabledReason: "ชำระเงินยืนยันแล้ว", banner: { tone: "success" as const, text: "ชำระเงินสำเร็จแล้ว" } };
    if (st === "REJECTED") return { canUploadSlip: false, disabledReason: "สลิปถูกปฏิเสธ", banner: { tone: "error" as const, text: "สลิปถูกปฏิเสธ" } };
    return { canUploadSlip: false, disabledReason: "ออเดอร์ไม่พร้อม", banner: { tone: "error" as const, text: "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป" } };
  }, [order, orderDetail?.status, timeLeft]);

  /* ----- create order (must have selectedAddressId) ----- */
  const startCheckout = async () => {
    if (!canCheckout || !selectedAddressId) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "PROMPTPAY", addressId: selectedAddressId }), // 👈 ส่ง addressId
      });
      if (!res.ok) {
        console.error("[checkout] create order failed", await res.text());
        return;
      }
      const data = (await res.json()) as CreateOrderResponse;
      setOrder(data);
      await refresh(); // FE cart -> clear
    } finally {
      setCreating(false);
    }
  };

  /* ----- slip handlers ----- */
  const onSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlipError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      setSlipError("รองรับเฉพาะ PNG / JPG / WebP");
      e.target.value = ""; setSlipPreview(null); return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setSlipError("ไฟล์ใหญ่เกิน 5MB");
      e.target.value = ""; setSlipPreview(null); return;
    }
    setSlipPreview(URL.createObjectURL(f));
  };

  const uploadSlip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order || !canUploadSlip) return;
    const fileInput = e.currentTarget.elements.namedItem("slip") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) { setSlipError("กรุณาเลือกไฟล์สลิป"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch(`${API}/api/orders/${order.orderId}/slip`, { method: "POST", body: fd });
      if (!res.ok) { setSlipError(`อัปโหลดไม่สำเร็จ: ${await res.text()}`); return; }
      const data = (await res.json()) as { status: OrderStatus; paymentSlipUrl?: string };
      setOrderDetail(prev => prev ? { ...prev, status: data.status, paymentSlipUrl: data.paymentSlipUrl } : prev);
      alert("อัปโหลดสลิปเรียบร้อย รอแอดมินยืนยัน");
    } finally {
      setUploading(false);
    }
  };

  /* ----- small helpers ----- */
  const Banner = ({ tone, text }: { tone: "success" | "info" | "warning" | "error"; text: string }) => {
    const toneClass =
      tone === "success" ? "bg-green-50 text-green-700 border-green-200"
        : tone === "info" ? "bg-blue-50 text-blue-700 border-blue-200"
          : tone === "warning" ? "bg-yellow-50 text-yellow-800 border-yellow-200"
            : "bg-red-50 text-red-700 border-red-200";
    return <div className={`border rounded-md px-3 py-2 text-sm ${toneClass}`}>{text}</div>;
  };
  const money = (n?: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n || 0);

  const summaryItems = order && orderDetail?.items?.length ? orderDetail.items : null;
  const chosenAddress: ShippingAddress | null =
    orderDetail?.shippingAddress ||
    (addresses.find(a => a.id === selectedAddressId) ?? null);

  /* ============================ UI ============================ */

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>

      {/* 1) ที่อยู่จัดส่ง (ต้องเลือกก่อนสร้างออเดอร์) */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Shipping address</h2>
          {!order && (
            <Link href="/addresses" className="text-sm text-blue-600 hover:underline">
              จัดการที่อยู่
            </Link>
          )}
        </div>

        {/* หลังสร้างออเดอร์: แช่แข็ง (แสดง snapshot จาก BE ถ้ามี) */}
        {order ? (
          chosenAddress ? (
            <AddressCard a={chosenAddress} frozen />
          ) : (
            <p className="text-sm text-gray-500">—</p>
          )
        ) : (
          <>
            {addrLoading ? (
              <p className="text-sm text-gray-500">กำลังโหลดที่อยู่…</p>
            ) : addresses.length === 0 ? (
              <div className="text-sm">
                <p className="text-gray-600">ยังไม่มีที่อยู่จัดส่ง</p>
                <Link href="/addresses" className="text-blue-600 hover:underline">+ เพิ่มที่อยู่ใหม่</Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {addresses.map(a => (
                  <li key={a.id} className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="addr"
                      value={a.id}
                      className="mt-1"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id!)}
                    />
                    <AddressCard a={a} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* 2) สรุปรายการ */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Order summary</h2>

        {summaryItems ? (
          <>
            <ul className="text-sm text-gray-700 divide-y">
              {summaryItems.map((it) => (
                <li key={`${it.productId}-${it.color}-${it.size}`} className="py-1">
                  {it.name} ({it.color}/{it.size}) × {it.quantity}
                </li>
              ))}
            </ul>
            <div className="mt-3 font-semibold">Total: {money(orderDetail?.total)}</div>
          </>
        ) : (
          <>
            <ul className="text-sm text-gray-700 space-y-1">
              {cartItems.map((it) => (
                <li key={`${it.productId}-${it.color}-${it.size}`}>
                  {it.name} ({it.color}/{it.size}) × {it.quantity}
                </li>
              ))}
            </ul>
            <div className="mt-3 font-semibold">Total: {money(cartTotal)}</div>
          </>
        )}
      </section>

      {/* 3) ปุ่มสร้างออเดอร์ / QR + อัปโหลดสลิป */}
      {!order ? (
        <button
          onClick={startCheckout}
          disabled={!canCheckout || creating}
          className="px-6 py-3 rounded-lg bg-black text-white font-bold disabled:bg-gray-300"
          title={!selectedAddressId ? "กรุณาเลือกที่อยู่จัดส่ง" : ""}
        >
          {creating ? "Creating..." : "Create PromptPay Order"}
        </button>
      ) : (
        <section className="rounded-xl border p-4 space-y-4">
          <div className="flex items-start gap-6">
            <div className="border rounded-lg p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orderDetail?.promptpayQrUrl || order.promptpayQrUrl}
                alt="PromptPay QR"
                width={360}
                height={360}
                className="rounded-md"
              />
            </div>
            <div className="text-sm">
              <div>PromptPay: <span className="font-mono">{orderDetail?.promptpayTarget || order.promptpayTarget}</span></div>
              <div>ยอดชำระ: <b>{money(orderDetail?.total ?? order.total)}</b></div>
              <div className={`${timeLeft < 60 ? "text-red-600" : ""} mt-2`}>
                หมดอายุภายใน: <b>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} นาที</b>
              </div>
              {orderDetail?.status && (
                <div className="mt-2 text-xs text-gray-600">สถานะ: <b>{orderDetail.status}</b></div>
              )}
              <div className="mt-2">
                <Link href={`/orders/${order.orderId}`} className="text-blue-600 hover:underline">
                  ไปหน้าคำสั่งซื้อ #{order.orderId.slice(-8)}
                </Link>
              </div>
            </div>
          </div>

          <Banner tone={banner.tone} text={banner.text} />

          <form onSubmit={uploadSlip} className="space-y-3">
            <div className={`${!canUploadSlip ? "opacity-60 pointer-events-none" : ""}`}>
              <label className="block text-sm font-medium mb-1">
                อัปโหลดสลิปโอนเงิน {disabledReason && <span className="text-red-600">({disabledReason})</span>}
              </label>
              <input
                type="file"
                name="slip"
                accept="image/png,image/jpeg,image/webp"
                onChange={onSlipChange}
                className="block w-full text-sm"
                disabled={!canUploadSlip}
                aria-disabled={!canUploadSlip}
                required
                title={disabledReason || ""}
              />
              {slipPreview && (
                <div className="mt-2">
                  <Image src={slipPreview} alt="Preview" width={220} height={220} className="rounded-md" unoptimized />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">รองรับ PNG/JPG/WebP ขนาดไม่เกิน 5MB</p>
              {slipError && <p className="text-xs text-red-600 mt-1">{slipError}</p>}
            </div>

            <button
              type="submit"
              disabled={!canUploadSlip || uploading}
              className="px-6 py-3 rounded-lg bg-black text-white font-bold disabled:bg-gray-300"
              title={disabledReason || ""}
            >
              {uploading ? "Uploading..." : "ส่งสลิปเพื่อยืนยัน"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

/* ---------- Small Address Card ---------- */
function AddressCard({ a, frozen = false }: { a: ShippingAddress; frozen?: boolean }) {
  return (
    <div className={`flex-1 rounded-lg border p-3 ${frozen ? "bg-gray-50" : ""}`}>
      <div className="font-medium">{a.recipientName} <span className="text-gray-500">· {a.phone}</span></div>
      <div className="text-sm text-gray-700">
        {[a.line1, a.line2, a.subdistrict, a.district, a.province, a.postcode].filter(Boolean).join(" ")}
      </div>
    </div>
  );
}
