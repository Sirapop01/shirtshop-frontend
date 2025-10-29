// src/app/(site)/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThaiLocations } from "@/lib/useThaiLocations";

// ✅ SweetAlert2
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

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
const preferName = (name?: string | null, code?: string | null) =>
  (name && name.trim()) ? name : (code ?? "")

const normalizeAddr = (a: AnyAddr) => {
  return {
    fullName: a.fullName ?? a.recipientName ?? "",
    phone: a.phone ?? "",
    addressLine1: a.addressLine1 ?? a.line1 ?? "",
    line2: a.line2 ?? "",
    subdistrict: a.subdistrict ?? a.subDistrict ?? "",
    districtName: a.districtName ?? "",
    district: a.district ?? "",
    provinceName: a.provinceName ?? "",
    province: a.province ?? "",
    postalCode: a.postalCode ?? a.postcode ?? "",
  };
};

const formatThaiAddress = (a: AnyAddr) => {
  const n = normalizeAddr(a);
  const dist = preferName(n.districtName, n.district);
  const prov = preferName(n.provinceName, n.province);
  return [
    n.subdistrict && `ต.${n.subdistrict}`,
    dist && `อ.${dist}`,
    prov && `จ.${prov}`,
    n.postalCode,
  ].filter(Boolean).join(" ");
};

type AnyAddr = {
  id?: string;
  // ชื่อ/เบอร์ + บรรทัดแรก
  fullName?: string | null;
  recipientName?: string | null;   // จาก snapshot order
  phone?: string | null;
  addressLine1?: string | null;    // จากหน้าที่อยู่
  line1?: string | null;           // จาก snapshot order
  line2?: string | null;

  // เขต/จังหวัด (รองรับทั้ง response ของ address และ snapshot order)
  subdistrict?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  districtName?: string | null;
  province?: string | null;
  provinceName?: string | null;
  postalCode?: string | null;
  postcode?: string | null;
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
  districtName?: string | null;   // ✅ ชื่ออำเภอ
  provinceName?: string | null;   // ✅ ชื่อจังหวัด
  postalCode?: string | null;
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

/* ---------- SweetAlert helpers ---------- */
const MySwal = withReactContent(Swal);
const toast = MySwal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
});
const sSuccess = (title: string, text?: string) => toast.fire({ icon: "success", title, text });
const sError = (title: string, text?: string) => toast.fire({ icon: "error", title, text });
const sInfo = (title: string, text?: string) => toast.fire({ icon: "info", title, text });
const sWarn = (title: string, text?: string) => toast.fire({ icon: "warning", title, text });

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

  const { getProvinceNameById, getAmphureNameById } = useThaiLocations();
  /* ----- redirect unauthenticated ----- */
  useEffect(() => {
    if (!getAccessToken()) {
      MySwal.fire({
        icon: "warning",
        title: "กรุณาเข้าสู่ระบบ",
        text: "ต้องเข้าสู่ระบบก่อนทำการชำระเงิน",
        confirmButtonText: "ไปหน้าเข้าสู่ระบบ",
      }).then(() => {
        router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
      });
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
    if (!selectedAddressId) {
      sWarn("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }
    if (cartItems.length === 0 || cartTotal <= 0) {
      sWarn("ตะกร้าสินค้าว่าง", "เลือกรายการสินค้าก่อนทำการชำระเงิน");
      return;
    }

    // ✅ ยืนยันก่อนสร้างออเดอร์
    const chosen = addresses.find(a => a.id === selectedAddressId);
    const addrText = chosen
      ? `${chosen.recipientName} • ${chosen.phone}\n${chosen.line1} ${chosen.line2 ?? ""}\n${formatThaiAddress(chosen)}`
      : "—";

    const confirm = await MySwal.fire({
      icon: "question",
      title: "ยืนยันสร้างคำสั่งซื้อด้วย PromptPay?",
      html: `
        <div style="text-align:left">
          <div><b>ยอดชำระ:</b> ${new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(cartTotal)}</div>
          <div style="margin-top:6px"><b>ที่อยู่จัดส่ง:</b><br/><pre style="white-space:pre-wrap;font-family:inherit">${addrText}</pre></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    setCreating(true);
    try {
      const res = await authFetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "PROMPTPAY", addressId: selectedAddressId }),
      });
      if (!res.ok) {
        const msg = await res.text();
        sError("สร้างคำสั่งซื้อไม่สำเร็จ", msg || undefined);
        return;
      }
      const data = (await res.json()) as CreateOrderResponse;
      setOrder(data);
      sSuccess("สร้างคำสั่งซื้อสำเร็จ", "สแกน QR เพื่อชำระเงินได้เลย");
      await refresh(); // FE cart -> clear
    } catch (e: any) {
      sError("เกิดข้อผิดพลาด", e?.message || "ไม่สามารถสร้างคำสั่งซื้อ");
    } finally {
      setCreating(false);
    }
  };

  const formatThaiAddress = (a: AnyAddr) => {
    const n = normalizeAddr(a);
    // ถ้าไม่มีชื่อ ให้ลอง map จากรหัสก่อน แล้วค่อย fallback เป็นรหัสจริง ๆ
    const dist =
      n.districtName ||
      (n.district ? getAmphureNameById(String(n.district)) : "") ||
      n.district;

    const prov =
      n.provinceName ||
      (n.province ? getProvinceNameById(String(n.province)) : "") ||
      n.province;

    return [n.subdistrict && `ต.${n.subdistrict}`, dist && `อ.${dist}`, prov && `จ.${prov}`, n.postalCode]
      .filter(Boolean)
      .join(" ");
  };

  /* ----- slip handlers ----- */
  const onSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlipError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      const msg = "รองรับเฉพาะ PNG / JPG / WebP";
      setSlipError(msg);
      sError("ไฟล์ไม่ถูกต้อง", msg);
      e.target.value = ""; setSlipPreview(null); return;
    }
    if (f.size > 5 * 1024 * 1024) {
      const msg = "ไฟล์ใหญ่เกิน 5MB";
      setSlipError(msg);
      sError("ไฟล์ใหญ่เกินไป", msg);
      e.target.value = ""; setSlipPreview(null); return;
    }
    setSlipPreview(URL.createObjectURL(f));
    sInfo("เพิ่มสลิปเรียบร้อย", "ตรวจสอบตัวอย่างก่อนส่ง");
  };

  const uploadSlip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order || !canUploadSlip) {
      sWarn("ไม่สามารถอัปโหลดสลิปได้", disabledReason || "");
      return;
    }
    const fileInput = e.currentTarget.elements.namedItem("slip") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      const msg = "กรุณาเลือกไฟล์สลิป";
      setSlipError(msg);
      sWarn("ยังไม่ได้เลือกไฟล์", msg);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch(`${API}/api/orders/${order.orderId}/slip`, { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        setSlipError(`อัปโหลดไม่สำเร็จ: ${msg}`);
        sError("อัปโหลดไม่สำเร็จ", msg || undefined);
        return;
      }
      const data = (await res.json()) as { status: OrderStatus; paymentSlipUrl?: string };
      setOrderDetail(prev => prev ? { ...prev, status: data.status, paymentSlipUrl: data.paymentSlipUrl } : prev);
      await MySwal.fire({
        icon: "success",
        title: "อัปโหลดสลิปเรียบร้อย",
        text: "กรุณารอแอดมินตรวจสอบยืนยันการชำระเงิน",
        confirmButtonText: "ตกลง",
      });
    } catch (e: any) {
      sError("เกิดข้อผิดพลาด", e?.message || "ไม่สามารถอัปโหลดสลิป");
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
            (() => {
              const n = normalizeAddr(chosenAddress as any);
              return (
                <div className="rounded-xl border p-3 bg-white/60">
                  <div className="font-medium text-gray-900">{n.fullName || "-"}</div>
                  <div className="text-sm text-gray-500">· {n.phone || "-"}</div>
                  {n.addressLine1 && <div className="text-sm text-gray-700">{n.addressLine1}</div>}
                  {n.line2 && <div className="text-sm text-gray-700">{n.line2}</div>}
                  <div className="text-sm text-gray-700">{formatThaiAddress(chosenAddress as any)}</div>
                </div>
              );
            })()
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
                {addresses.map(a => {
                  const n = normalizeAddr(a as any);
                  const inputId = `addr-${a.id}`;
                  return (
                    <li key={a.id} className="flex items-start gap-2">
                      <input
                        id={inputId}
                        type="radio"
                        name="addr"
                        value={a.id}
                        className="mt-1"
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id!)}
                      />
                      <label
                        htmlFor={inputId}
                        className="flex-1 rounded-xl border p-3 cursor-pointer"
                      >
                        <div className="font-medium text-gray-900">{n.fullName || "-"}</div>
                        <div className="text-sm text-gray-500">· {n.phone || "-"}</div>
                        {n.addressLine1 && <div className="text-sm text-gray-700">{n.addressLine1}</div>}
                        {n.line2 && <div className="text-sm text-gray-700">{n.line2}</div>}
                        <div className="text-sm text-gray-700">{formatThaiAddress(a as any)}</div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

      </section>

      {/* 2) สรุปรายการ */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Order summary</h2>

        {order && !summaryItems ? (
          <p className="text-sm text-gray-500">Loading order summary...</p>
        ) : summaryItems ? (
          <>
            {/* แสดงรายการสินค้าจาก orderDetail ที่โหลดมาแล้ว */}
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
            {/* แสดงรายการสินค้าจาก cartItems (ก่อนสร้าง order) */}
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
        {[a.line1, a.line2, formatThaiAddress(a)].filter(Boolean).join(" ")}
      </div>
    </div>
  );
}
