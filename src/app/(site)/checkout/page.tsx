// src/app/(site)/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type CreateOrderResponse = {
  orderId: string;
  total: number;
  promptpayTarget: string;
  promptpayQrUrl: string;
  expiresAt: string; // ISO
};

// สถานะฝั่ง BE
type OrderStatus = "PENDING_PAYMENT" | "SLIP_UPLOADED" | "PAID" | "REJECTED" | "EXPIRED";

type OrderDetail = {
  id: string;
  status: OrderStatus;
  paymentSlipUrl?: string | null;
  expiresAt?: string;
  total?: number;
};

const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

async function authFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return fetch(url, { ...init, headers });
}


export default function CheckoutPage() {
  const { items, total, refresh } = useCart();
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<CreateOrderResponse | null>(null);

  // ✅ เพิ่มตัวแปรสถานะออเดอร์จากเซิร์ฟเวอร์
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);

  const canCheckout = useMemo(() => items.length > 0 && total > 0, [items, total]);
  
  // นับถอยหลังจาก expiresAt ที่ได้ตอนสร้างออเดอร์
  useEffect(() => {
    let t: any;
    if (order?.expiresAt) {
      t = setInterval(() => {
        const diff = Math.max(0, Math.floor((+new Date(order.expiresAt) - Date.now()) / 1000));
        setTimeLeft(diff);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => t && clearInterval(t);
  }, [order?.expiresAt]);

  // ✅ ดึงสถานะออเดอร์เป็นระยะ ๆ เพื่ออัปเดต UI
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
        setOrderDetail({
          id: data.id,
          status: data.status,
          paymentSlipUrl: data.paymentSlipUrl,
          expiresAt: data.expiresAt,
          total: data.total,
        });
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [order?.orderId]);

  // ✅ เงื่อนไขอนุญาตให้อัปโหลดสลิป + เหตุผล
  const { canUploadSlip, disabledReason, banner } = useMemo(() => {
    if (!order) {
      return {
        canUploadSlip: false,
        disabledReason: "ยังไม่ได้สร้างออเดอร์ กรุณากด Create PromptPay Order",
        banner: { tone: "warning" as const, text: "ยังไม่ได้สร้างออเดอร์" },
      };
    }
    if (timeLeft <= 0) {
      return {
        canUploadSlip: false,
        disabledReason: "ออเดอร์หมดอายุ กรุณาสร้างใหม่",
        banner: { tone: "error" as const, text: "ออเดอร์หมดอายุแล้ว" },
      };
    }
    const st = orderDetail?.status ?? "PENDING_PAYMENT";
    if (st === "PENDING_PAYMENT") {
      return {
        canUploadSlip: true,
        disabledReason: "",
        banner: { tone: "success" as const, text: "พร้อมแนบสลิปเพื่อยืนยันการชำระ" },
      };
    }
    if (st === "SLIP_UPLOADED") {
      return {
        canUploadSlip: false,
        disabledReason: "ส่งสลิปแล้ว กรุณารอแอดมินตรวจสอบ",
        banner: { tone: "info" as const, text: "ส่งสลิปแล้ว กำลังรอการตรวจสอบ" },
      };
    }
    if (st === "PAID") {
      return {
        canUploadSlip: false,
        disabledReason: "ชำระเงินยืนยันแล้ว",
        banner: { tone: "success" as const, text: "ชำระเงินสำเร็จแล้ว" },
      };
    }
    if (st === "REJECTED") {
      return {
        canUploadSlip: false,
        disabledReason: "สลิปถูกปฏิเสธ กรุณาสร้างออเดอร์ใหม่",
        banner: { tone: "error" as const, text: "สลิปถูกปฏิเสธ" },
      };
    }
    // EXPIRED หรืออื่น ๆ
    return {
      canUploadSlip: false,
      disabledReason: "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป",
      banner: { tone: "error" as const, text: "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป" },
    };
  }, [order, orderDetail?.status, timeLeft]);

  const startCheckout = async () => {
    if (!canCheckout) return;
    setCreating(true);
    try {
      const res = await authFetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "PROMPTPAY" }),
      });
      if (!res.ok) {
        console.error("[checkout] create order failed", await res.text());
        return;
      }
      const data = (await res.json()) as CreateOrderResponse;
      setOrder(data);
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const onSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlipError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      setSlipError("รองรับเฉพาะไฟล์รูปภาพ PNG / JPG / WebP เท่านั้น");
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
    const url = URL.createObjectURL(f);
    setSlipPreview(url);
  };

  const uploadSlip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order || !canUploadSlip) return;

    const fileInput = e.currentTarget.elements.namedItem("slip") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setSlipError("กรุณาเลือกไฟล์สลิป");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await authFetch(`${API}/api/orders/${order.orderId}/slip`, { method: "POST", body: fd });
      if (!res.ok) {
        setSlipError(`อัปโหลดไม่สำเร็จ: ${await res.text()}`);
        return;
      }
      const data = (await res.json()) as { status: OrderStatus; paymentSlipUrl?: string };
      setOrderDetail((prev) => (prev ? { ...prev, status: data.status, paymentSlipUrl: data.paymentSlipUrl } : prev));
      alert("อัปโหลดสลิปเรียบร้อย รอแอดมินยืนยัน");
    } finally {
      setUploading(false);
    }
  };

  // helper แสดง banner
  const Banner = ({ tone, text }: { tone: "success" | "info" | "warning" | "error"; text: string }) => {
    const toneClass =
      tone === "success"
        ? "bg-green-50 text-green-700 border-green-200"
        : tone === "info"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : tone === "warning"
        ? "bg-yellow-50 text-yellow-800 border-yellow-200"
        : "bg-red-50 text-red-700 border-red-200";
    return <div className={`border rounded-md px-3 py-2 text-sm ${toneClass}`}>{text}</div>;
  };

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>

      {/* สรุปรายการ */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Order summary</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          {items.map((it) => (
            <li key={`${it.productId}-${it.color}-${it.size}`}>
              {it.name} ({it.color}/{it.size}) × {it.quantity}
            </li>
          ))}
        </ul>
        <div className="mt-3 font-semibold">
          Total: {new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(total)}
        </div>
      </section>

      {/* ปุ่มสร้างออเดอร์ / แสดง QR */}
      {!order ? (
        <button
          onClick={startCheckout}
          disabled={!canCheckout || creating}
          className="px-6 py-3 rounded-lg bg-black text-white font-bold disabled:bg-gray-300"
        >
          {creating ? "Creating..." : "Create PromptPay Order"}
        </button>
      ) : (
        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-semibold">Scan to pay (PromptPay)</h2>
          <div className="flex items-start gap-6">
            <div className="border rounded-lg p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.promptpayQrUrl} alt="PromptPay QR" width={360} height={360} className="rounded-md" />
            </div>
            <div className="text-sm">
              <div>
                PromptPay: <span className="font-mono">{order.promptpayTarget}</span>
              </div>
              <div>
                ยอดชำระ:{" "}
                <b>{new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(order.total)}</b>
              </div>
              <div className={`${timeLeft < 60 ? "text-red-600" : ""} mt-2`}>
                หมดอายุภายใน: <b>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} นาที</b>
              </div>
              {/* แสดงสถานะปัจจุบันจากเซิร์ฟเวอร์ */}
              {orderDetail?.status && (
                <div className="mt-2 text-xs text-gray-600">สถานะ: <b>{orderDetail.status}</b></div>
              )}
            </div>
          </div>

          {/* ✅ แถบแจ้งเตือนสถานะการแนบสลิป */}
          <Banner tone={banner.tone} text={banner.text} />

          {/* ✅ ฟอร์มอัปโหลดสลิป พร้อม disabled + เหตุผล */}
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
                  <Image src={slipPreview} alt="Preview" width={220} height={220} className="rounded-md" />
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
