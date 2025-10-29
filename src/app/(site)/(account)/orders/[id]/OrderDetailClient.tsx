// src/app/(site)/orders/[id]/OrderDetailClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge, { OrderStatus } from "@/components/orders/StatusBadge";
import { useCart } from "@/context/CartContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_KEY);

async function authFetch(url: string, init?: RequestInit) {
  const h = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) h.set("Authorization", `Bearer ${t}`);
  h.set("Accept", "application/json");
  return fetch(url, { ...init, headers: h, credentials: "include", cache: "no-store" });
}

type OrderItem = {
  productId: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  color: string;
  size: string;
  quantity: number;
};

type OrderDetail = {
  id: string;
  userId: string;
  items: OrderItem[];
  subTotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "PROMPTPAY" | "CARD" | string;
  status: OrderStatus | "CANCELED";
  promptpayTarget?: string | null;
  promptpayQrUrl?: string | null; // data URL
  expiresAt?: string | null;
  paymentSlipUrl?: string | null;
  createdAt: string;
  updatedAt: string;

  statusNote?: string | null;
  rejectedAt?: string | null;
  canceledAt?: string | null;

  // tracking (แสดงเฉพาะตอน PAID)
  trackingTag?: string | null;
  trackingCreatedAt?: string | null;
};

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { refresh: refreshCart } = useCart();
  const router = useRouter();

  // โหลดรายละเอียด + โพลทุก 5s
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await authFetch(`${API}/api/orders/${orderId}`);
        if (!r.ok) throw new Error(await r.text());
        const json = (await r.json()) as OrderDetail;
        if (!stop) setOrder(json);
      } catch (e) {
        console.error("[order] load", e);
      } finally {
        if (!stop) setLoading(false);
      }
    }
    load();
    const iv = setInterval(() => {
      if (poll) load();
    }, 5000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [orderId, poll]);

  // นับถอยหลังหมดอายุ
  useEffect(() => {
    let iv: any;
    if (order?.expiresAt) {
      iv = setInterval(() => {
        const diff = Math.max(0, Math.floor((+new Date(order.expiresAt!) - Date.now()) / 1000));
        setTimeLeft(diff);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => iv && clearInterval(iv);
  }, [order?.expiresAt]);

  const canUploadSlip = useMemo(() => {
    if (!order) return false;
    if (!order.expiresAt || timeLeft <= 0) return false;
    return order.status === "PENDING_PAYMENT";
  }, [order, timeLeft]);

  const canRestore = useMemo(() => {
    if (!order) return false;
    return order.status === "EXPIRED" || order.status === "REJECTED";
  }, [order]);

  function onSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlipError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      setSlipError("รองรับเฉพาะรูปภาพ PNG / JPG / WebP");
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
  }

  async function submitSlip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order || !canUploadSlip) return;
    const file = (e.currentTarget.elements.namedItem("slip") as HTMLInputElement)?.files?.[0];
    if (!file) {
      setSlipError("กรุณาเลือกไฟล์สลิป");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await authFetch(`${API}/api/orders/${order.id}/slip`, { method: "POST", body: fd });
      if (!r.ok) {
        setSlipError(await r.text());
        return;
      }
      const data = (await r.json()) as OrderDetail;
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              paymentSlipUrl: data.paymentSlipUrl ?? prev.paymentSlipUrl,
              updatedAt: data.updatedAt ?? prev.updatedAt,
            }
          : data
      );
      setPoll(false);
      alert("อัปโหลดสลิปเรียบร้อย รอแอดมินยืนยัน");
    } finally {
      setUploading(false);
    }
  }

  async function restoreToCart() {
    if (!order || !canRestore) return;
    const r = await authFetch(`${API}/api/orders/${order.id}/restore-cart`, { method: "POST" });
    if (!r.ok) {
      alert(await r.text());
      return;
    }
    await refreshCart();
    router.push("/cart");
  }

  const THB = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

  const fmtDateTime = (s?: string | null) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return s ?? "";
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 md:px-6 py-10 text-gray-600">กำลังโหลด...</main>;
  }
  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-4 md:px-6 py-10">
        ไม่พบคำสั่งซื้อ
      </main>
    );
  }

  const showTracking = order.status === "PAID" && !!order.trackingTag;
  const timeWarn =
    timeLeft > 0
      ? timeLeft <= 60
        ? "text-red-600"
        : timeLeft <= 180
        ? "text-orange-600"
        : "text-gray-700"
      : "text-gray-500";

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-6">
      {/* ===== Summary Header ===== */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs text-gray-500">หมายเลขคำสั่งซื้อ</div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
              #{order.id.slice(-8)}
            </h1>
            <div className="mt-1 text-sm text-gray-500">สร้างเมื่อ {fmtDateTime(order.createdAt)}</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge s={order.status as OrderStatus} />
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm">
              ชำระผ่าน: <span className="font-medium">{order.paymentMethod === "PROMPTPAY" ? "PromptPay" : order.paymentMethod || "-"}</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm tabular-nums">
              ยอดรวม: <span className="font-semibold text-gray-900">{THB(order.total)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Shipping / Tracking ===== */}
      <section id="shipping" className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <h2 className="font-semibold text-gray-900">การจัดส่ง</h2>
        {showTracking ? (
          <div className="mt-2 grid gap-1 text-sm">
            <div className="text-gray-600">เลขติดตาม</div>
            <div className="font-mono text-gray-900">{order.trackingTag}</div>
            {order.trackingCreatedAt && (
              <div className="text-xs text-gray-500">
                สร้างเลขติดตามเมื่อ {fmtDateTime(order.trackingCreatedAt)}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-500">ยังไม่มีเลขติดตาม</div>
        )}
      </section>

      {/* ===== Items ===== */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <h2 className="font-semibold text-gray-900">รายการสินค้า</h2>
        <ul className="mt-2 divide-y divide-gray-100">
          {order.items.map((it) => (
            <li key={`${it.productId}-${it.color}-${it.size}`} className="py-3 flex items-center gap-3">
              {/* ใช้ <img> เพื่อไม่ชน domain policy */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.imageUrl}
                alt={it.name}
                width={56}
                height={56}
                className="rounded-lg border border-gray-200 object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{it.name}</div>
                <div className="text-xs text-gray-600">
                  {it.color} / {it.size} × {it.quantity}
                </div>
              </div>
              <div className="text-sm tabular-nums text-gray-900">{THB(it.unitPrice * it.quantity)}</div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-1 text-sm tabular-nums text-gray-700">
          <div className="flex items-center justify-between">
            <span>สินค้า</span>
            <b className="text-gray-900">{THB(order.subTotal)}</b>
          </div>
          <div className="flex items-center justify-between">
            <span>ค่าส่ง</span>
            <b className="text-gray-900">{THB(order.shippingFee)}</b>
          </div>
          <div className="mt-1 h-px bg-gray-100" />
          <div className="flex items-center justify-between font-semibold">
            <span className="text-gray-900">ยอดรวม</span>
            <span className="text-gray-900">{THB(order.total)}</span>
          </div>
        </div>
      </section>

      {/* ===== PromptPay QR & Countdown ===== */}
      {order.promptpayQrUrl &&
        (order.status === "PENDING_PAYMENT" || order.status === "SLIP_UPLOADED") && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
            <h2 className="font-semibold text-gray-900">สแกนชำระ (PromptPay)</h2>
            <div className="mt-3 grid gap-6 md:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.promptpayQrUrl}
                  alt="PromptPay QR"
                  width={360}
                  height={360}
                  className="rounded-md"
                />
              </div>
              <div className="text-sm space-y-2">
                <div>PromptPay: <span className="font-mono">{order.promptpayTarget}</span></div>
                <div>ยอดชำระ: <b>{THB(order.total)}</b></div>
                {order.expiresAt && (
                  <div className={`mt-2 font-medium ${timeWarn}`}>
                    หมดอายุภายใน{" "}
                    <span className="tabular-nums">
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} นาที
                    </span>
                  </div>
                )}
                {order.paymentSlipUrl && (
                  <div className="pt-1">
                    สลิป:{" "}
                    <a href={order.paymentSlipUrl} target="_blank" className="text-blue-600 hover:underline">
                      เปิดดู
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      {/* ===== Status Notes ===== */}
      <section className="space-y-2">
        {order.status === "PENDING_PAYMENT" && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            โปรดแนบสลิปเพื่อยืนยันการชำระ
          </div>
        )}
        {order.status === "SLIP_UPLOADED" && (
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            ส่งสลิปแล้ว กำลังรอการตรวจสอบ
          </div>
        )}
        {order.status === "PAID" && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ชำระเงินสำเร็จแล้ว
          </div>
        )}

        {order.status === "REJECTED" && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
            <div className="text-sm font-semibold text-rose-700">ออเดอร์ถูกปฏิเสธ</div>
            {order.statusNote && (
              <p className="mt-1 text-sm text-rose-700">
                เหตุผลจากร้าน: <span className="font-medium">{order.statusNote}</span>
              </p>
            )}
            {order.rejectedAt && (
              <p className="mt-1 text-xs text-rose-700/80">เวลา: {fmtDateTime(order.rejectedAt)}</p>
            )}
          </div>
        )}

        {order.status === "CANCELED" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="text-sm font-semibold text-amber-700">ออเดอร์ถูกยกเลิก</div>
            {order.statusNote && (
              <p className="mt-1 text-sm text-amber-700">
                เหตุผลจากร้าน: <span className="font-medium">{order.statusNote}</span>
              </p>
            )}
            {order.canceledAt && (
              <p className="mt-1 text-xs text-amber-700/80">เวลา: {fmtDateTime(order.canceledAt)}</p>
            )}
          </div>
        )}

        {order.status === "EXPIRED" && (
          <div className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700">
            ออเดอร์หมดอายุ
          </div>
        )}
      </section>

      {/* ===== Upload Slip ===== */}
      <section
        className={`${!canUploadSlip ? "opacity-60 pointer-events-none" : ""} rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5`}
      >
        <h2 className="font-semibold text-gray-900 mb-2">อัปโหลดสลิปโอนเงิน</h2>
        <form onSubmit={submitSlip} className="space-y-3">
          <div>
            <input
              type="file"
              name="slip"
              accept="image/png,image/jpeg,image/webp"
              onChange={onSlipChange}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
              required
              disabled={!canUploadSlip}
              aria-disabled={!canUploadSlip}
              title={!canUploadSlip ? "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป" : ""}
            />
            {slipPreview && (
              <div className="mt-3">
                <Image src={slipPreview} alt="Preview" width={240} height={240} className="rounded-lg border" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">รองรับ PNG/JPG/WebP ขนาดไม่เกิน 5MB</p>
            {slipError && <p className="text-xs text-rose-600 mt-1">{slipError}</p>}
          </div>
          <button
            type="submit"
            disabled={!canUploadSlip || uploading}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:bg-gray-300"
          >
            {uploading ? "กำลังอัปโหลด..." : "ส่งสลิปเพื่อยืนยัน"}
          </button>
        </form>
      </section>

      {/* ===== Restore Cart ===== */}
      {canRestore && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
          <button
            onClick={restoreToCart}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            กู้คืนสินค้ากลับเข้าตะกร้า
          </button>
        </section>
      )}

      <div className="pt-2">
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          ← กลับไปหน้ารายการสั่งซื้อ
        </Link>
      </div>
    </main>
  );
}
