// src/app/(site)/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useThaiLocations } from "@/lib/useThaiLocations";

// ✅ SweetAlert
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ---------- Types ---------- */
type CreateOrderResponse = {
  orderId: string;
  total: number;
  promptpayTarget: string;
  promptpayQrUrl: string; // may be data URL or external URL
  expiresAt: string; // ISO
};

type OrderStatus =
  | "PENDING_PAYMENT"
  | "SLIP_UPLOADED"
  | "PAID"
  | "REJECTED"
  | "EXPIRED";

type OrderItem = {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  color: string;
  size: string;
  quantity: number;
};

/* ---------- Address ---------- */
const preferName = (name?: string | null, code?: string | null) =>
  name && name.trim() ? name : code ?? "";

type AnyAddr = {
  id?: string;
  fullName?: string | null;
  recipientName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  line1?: string | null;
  line2?: string | null;
  subdistrict?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  districtName?: string | null;
  province?: string | null;
  provinceName?: string | null;
  postalCode?: string | null;
  postcode?: string | null;
};

const normalizeAddr = (a: AnyAddr) => ({
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
});

/* prettier Thai address using location hooks */
function useFormatThaiAddress() {
  const { getProvinceNameById, getAmphureNameById } = useThaiLocations();
  return (a: AnyAddr) => {
    const n = normalizeAddr(a);
    const dist =
      n.districtName ||
      (n.district ? getAmphureNameById(String(n.district)) : "") ||
      n.district;
    const prov =
      n.provinceName ||
      (n.province ? getProvinceNameById(String(n.province)) : "") ||
      n.province;
    return [
      n.subdistrict && `ต.${n.subdistrict}`,
      dist && `อ.${dist}`,
      prov && `จ.${prov}`,
      n.postalCode,
    ]
      .filter(Boolean)
      .join(" ");
  };
}

/* ---------- Auth helpers ---------- */
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_KEY);

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
  const formatThaiAddress = useFormatThaiAddress();

  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  // addresses
  type AddressListItem = AnyAddr & { id: string; isDefault?: boolean };
  const [addresses, setAddresses] = useState<AddressListItem[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );

  /* ----- redirect unauthenticated ----- */
  useEffect(() => {
    if (!getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
    }
  }, [router]);

  /* ----- load addresses (only before order is created) ----- */
  useEffect(() => {
    if (order) return;
    let stop = false;
    const load = async () => {
      setAddrLoading(true);
      try {
        const res = await authFetch(`${API}/api/addresses`);
        if (!res.ok) return;
        const data = (await res.json()) as AddressListItem[];
        if (stop) return;
        setAddresses(data || []);
        const def = data.find((a) => a.isDefault) || data[0];
        setSelectedAddressId(def?.id || null);
      } finally {
        setAddrLoading(false);
      }
    };
    load();
    return () => {
      stop = true;
    };
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
        const diff = Math.max(
          0,
          Math.floor((+new Date(exp) - Date.now()) / 1000)
        );
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
        const data = await res.json();
        setOrderDetail(data);
      }
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [order?.orderId]);

  /* ----- upload gate / banner ----- */
  const { canUploadSlip, disabledReason, banner } = useMemo(() => {
    if (!order) {
      return {
        canUploadSlip: false,
        disabledReason: "ยังไม่ได้สร้างออเดอร์",
        banner: { tone: "warning" as const, text: "ยังไม่ได้สร้างออเดอร์" },
      };
    }
    if (timeLeft <= 0) {
      return {
        canUploadSlip: false,
        disabledReason: "ออเดอร์หมดอายุ",
        banner: { tone: "error" as const, text: "ออเดอร์หมดอายุแล้ว" },
      };
    }
    const st = orderDetail?.status ?? "PENDING_PAYMENT";
    if (st === "PENDING_PAYMENT")
      return {
        canUploadSlip: true,
        disabledReason: "",
        banner: {
          tone: "success" as const,
          text: "พร้อมแนบสลิปเพื่อยืนยันการชำระ",
        },
      };
    if (st === "SLIP_UPLOADED")
      return {
        canUploadSlip: false,
        disabledReason: "ส่งสลิปแล้ว",
        banner: { tone: "info" as const, text: "ส่งสลิปแล้ว กำลังรอการตรวจสอบ" },
      };
    if (st === "PAID")
      return {
        canUploadSlip: false,
        disabledReason: "ชำระเงินยืนยันแล้ว",
        banner: { tone: "success" as const, text: "ชำระเงินสำเร็จแล้ว" },
      };
    if (st === "REJECTED")
      return {
        canUploadSlip: false,
        disabledReason: "สลิปถูกปฏิเสธ",
        banner: { tone: "error" as const, text: "สลิปถูกปฏิเสธ" },
      };
    return {
      canUploadSlip: false,
      disabledReason: "ออเดอร์ไม่พร้อม",
      banner: {
        tone: "error" as const,
        text: "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป",
      },
    };
  }, [order, orderDetail?.status, timeLeft]);

  /* ----- create order (must have selectedAddressId) ----- */
  const startCheckout = async () => {
    if (!canCheckout || !selectedAddressId) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "PROMPTPAY",
          addressId: selectedAddressId,
        }),
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
      e.target.value = "";
      setSlipPreview(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setSlipError("ไฟล์ใหญ่เกิน 5MB");
      e.target.value = "";
      setSlipPreview(null);
      return;
    }
    setSlipPreview(URL.createObjectURL(f));
  };

  const uploadSlip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order || !canUploadSlip) return;

    const fileInput = e.currentTarget.elements.namedItem(
      "slip"
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setSlipError("กรุณาเลือกไฟล์สลิป");
      return;
    }

    setUploading(true);

    // ✅ เปิด SweetAlert โหมดโหลด (ไม่ await)
    MySwal.fire({
      title: "กำลังอัปโหลด...",
      text: "โปรดรอสักครู่",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        MySwal.showLoading();
      },
    });

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await authFetch(`${API}/api/orders/${order.orderId}/slip`, {
        method: "POST",
        body: fd,
      });

      // ปิดโหลดก่อน
      MySwal.close();

      if (!res.ok) {
        const msg = await res.text();
        await MySwal.fire({
          icon: "error",
          title: "อัปโหลดไม่สำเร็จ",
          text: msg || "ลองใหม่อีกครั้ง",
          confirmButtonText: "ตกลง",
        });
        return;
      }

      const data = (await res.json()) as {
        status: OrderStatus;
        paymentSlipUrl?: string;
      };
      setOrderDetail((prev: any) =>
        prev
          ? { ...prev, status: data.status, paymentSlipUrl: data.paymentSlipUrl }
          : prev
      );

      await MySwal.fire({
        icon: "success",
        title: "อัปโหลดสลิปเรียบร้อย",
        text: "กรุณารอแอดมินตรวจสอบ",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err: any) {
      MySwal.close();
      await MySwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถอัปโหลดได้",
        confirmButtonText: "ตกลง",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ----- helpers ----- */
  const money = (n?: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(n || 0);

  const summaryItems =
    order && orderDetail?.items?.length ? orderDetail.items : null;
  const chosenAddress: AnyAddr | null =
    orderDetail?.shippingAddress ||
    (addresses.find((a) => a.id === selectedAddressId) ?? null);

  /* ============================ UI ============================ */

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
          Checkout
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: Address + Items */}
          <section className="lg:col-span-8 space-y-6">
            {/* Address card */}
            <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm">
              <div className="flex items-center justify-between border-b px-4 md:px-6 py-3">
                <h2 className="text-sm font-semibold">Shipping address</h2>
                {!order && (
                  <Link
                    href="/addresses"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    จัดการที่อยู่
                  </Link>
                )}
              </div>

              <div className="p-4 md:p-6">
                {order ? (
                  chosenAddress ? (
                    (() => {
                      const n = normalizeAddr(chosenAddress);
                      return (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                          <div className="font-medium text-zinc-900">
                            {n.fullName || "-"}
                          </div>
                          <div className="text-sm text-zinc-500">
                            · {n.phone || "-"}
                          </div>
                          {n.addressLine1 && (
                            <div className="text-sm text-zinc-700">
                              {n.addressLine1}
                            </div>
                          )}
                          {n.line2 && (
                            <div className="text-sm text-zinc-700">{n.line2}</div>
                          )}
                          <div className="text-sm text-zinc-700">
                            {formatThaiAddress(chosenAddress)}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-zinc-500">—</p>
                  )
                ) : addrLoading ? (
                  <p className="text-sm text-zinc-500">กำลังโหลดที่อยู่…</p>
                ) : addresses.length === 0 ? (
                  <div className="text-sm">
                    <p className="text-zinc-600">ยังไม่มีที่อยู่จัดส่ง</p>
                    <Link
                      href="/addresses"
                      className="text-blue-600 hover:underline"
                    >
                      + เพิ่มที่อยู่ใหม่
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {addresses.map((a) => {
                      const n = normalizeAddr(a);
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
                            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50"
                          >
                            <div className="font-medium text-zinc-900">
                              {n.fullName || "-"}
                            </div>
                            <div className="text-sm text-zinc-500">
                              · {n.phone || "-"}
                            </div>
                            {n.addressLine1 && (
                              <div className="text-sm text-zinc-700">
                                {n.addressLine1}
                              </div>
                            )}
                            {n.line2 && (
                              <div className="text-sm text-zinc-700">{n.line2}</div>
                            )}
                            <div className="text-sm text-zinc-700">
                              {formatThaiAddress(a)}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm">
              <div className="border-b px-4 md:px-6 py-3">
                <h2 className="text-sm font-semibold">Items</h2>
              </div>
              <div className="p-4 md:p-6">
                {order && !summaryItems ? (
                  <p className="text-sm text-zinc-500">Loading order summary...</p>
                ) : summaryItems ? (
                  <ul className="divide-y">
                    {summaryItems.map((it: any) => {
                      const img =
                        it.imageUrl ||
                        it.image ||
                        it.thumbnailUrl ||
                        (Array.isArray(it.images) ? it.images[0] : null);
                      const price =
                        it.unitPrice ?? it.price ?? it.unit_price ?? it.unitprice ?? 0;

                      return (
                        <li
                          key={`${it.productId}-${it.color}-${it.size}`}
                          className="flex items-center gap-4 py-3"
                        >
                          <div className="h-16 w-16 overflow-hidden rounded-md border">
                            {img ? (
                              <img
                                src={img}
                                alt={it.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-zinc-100" />
                            )}
                          </div>
                          <div className="flex-1 text-sm">
                            <div className="font-medium text-zinc-900">
                              {it.name}
                            </div>
                            <div className="text-zinc-500">
                              {it.color}/{it.size} × {it.quantity}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-zinc-900">
                            {money(price * (it.quantity ?? 1))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <>
                    {cartItems.length === 0 ? (
                      <p className="text-sm text-zinc-500">ตะกร้าของคุณว่างเปล่า</p>
                    ) : (
                      <ul className="divide-y">
                        {cartItems.map((it: any) => {
                          const img =
                            it.imageUrl ||
                            it.image ||
                            it.thumbnailUrl ||
                            (Array.isArray(it.images) ? it.images[0] : null);
                          const price =
                            it.unitPrice ?? it.price ?? it.unit_price ?? it.unitprice ?? 0;

                          return (
                            <li
                              key={`${it.productId}-${it.color}-${it.size}`}
                              className="flex items-center gap-4 py-3"
                            >
                              <div className="h-16 w-16 overflow-hidden rounded-md border">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={it.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-zinc-100" />
                                )}
                              </div>
                              <div className="flex-1 text-sm">
                                <div className="font-medium text-zinc-900">
                                  {it.name}
                                </div>
                                <div className="text-zinc-500">
                                  {it.color}/{it.size} × {it.quantity}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-zinc-900">
                                {money(price * (it.quantity ?? 1))}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT: Summary / Actions */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm p-5">
              <h3 className="text-sm font-semibold mb-3">Summary</h3>
              <div className="flex items-center justify-between text-sm">
                <span>สินค้า</span>
                <span className="font-medium">
                  {money(orderDetail?.total ?? cartTotal)}
                </span>
              </div>
              <div className="mt-3 h-px bg-zinc-200" />

              {!order ? (
                <button
                  onClick={startCheckout}
                  disabled={!canCheckout || creating}
                  className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  title={!selectedAddressId ? "กรุณาเลือกที่อยู่จัดส่ง" : ""}
                >
                  {creating ? "Creating..." : "Create PromptPay Order"}
                </button>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* QR */}
                  <div className="rounded-xl border border-zinc-200 p-3 text-center">
                    <div className="inline-block rounded-lg border p-1 bg-white">
                      <img
                        src={orderDetail?.promptpayQrUrl || order.promptpayQrUrl}
                        alt="PromptPay QR"
                        width={260}
                        height={260}
                        className="h-auto w-[260px] rounded-md"
                      />
                    </div>
                    <div className="mt-2 text-xs text-zinc-600">
                      PromptPay:{" "}
                      <span className="font-mono">
                        {orderDetail?.promptpayTarget || order.promptpayTarget}
                      </span>
                    </div>
                    <div className="text-sm">
                      ยอดชำระ: <b>{money(orderDetail?.total ?? order.total)}</b>
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          timeLeft < 60
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        หมดอายุ: {Math.floor(timeLeft / 60)}:
                        {String(timeLeft % 60).padStart(2, "0")} นาที
                      </span>
                    </div>
                  </div>

                  {/* Banner */}
                  <Banner tone={banner.tone} text={banner.text} />

                  {/* Upload slip */}
                  <form onSubmit={uploadSlip} className="space-y-3">
                    <div
                      className={`${
                        !canUploadSlip ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <label className="mb-1 block text-sm font-medium">
                        อัปโหลดสลิปโอนเงิน
                        {disabledReason && (
                          <span className="text-rose-600">
                            {" "}
                            ({disabledReason})
                          </span>
                        )}
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
                          <Image
                            src={slipPreview}
                            alt="Preview"
                            width={200}
                            height={200}
                            className="rounded-md border"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">
                        รองรับ PNG/JPG/WebP ขนาดไม่เกิน 5MB
                      </p>
                      {slipError && (
                        <p className="mt-1 text-xs text-rose-600">{slipError}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!canUploadSlip || uploading}
                      className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                      title={disabledReason || ""}
                    >
                      {uploading ? "Uploading..." : "ส่งสลิปเพื่อยืนยัน"}
                    </button>
                  </form>

                  <div className="text-xs text-zinc-600">
                    <Link
                      href={`/orders/${order.orderId}`}
                      className="text-blue-600 hover:underline"
                    >
                      ไปหน้าคำสั่งซื้อ #{order.orderId.slice(-8)}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ---------- Small Banner ---------- */
function Banner({
  tone,
  text,
}: {
  tone: "success" | "info" | "warning" | "error";
  text: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "info"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <div className={`border rounded-md px-3 py-2 text-sm ${toneClass}`}>
      {text}
    </div>
  );
}
