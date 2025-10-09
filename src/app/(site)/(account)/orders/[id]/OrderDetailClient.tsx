"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge, { OrderStatus } from "@/components/orders/StatusBadge";
import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined" ? null :
  sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

async function authFetch(url: string, init?: RequestInit) {
  const h = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) h.set("Authorization", `Bearer ${t}`);
  return fetch(url, { ...init, headers: h, cache: "no-store" });
}

type OrderItem = {
  productId: string; name: string; imageUrl: string;
  unitPrice: number; color: string; size: string; quantity: number;
};

type OrderDetail = {
  id: string;
  userId: string;
  items: OrderItem[];
  subTotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "PROMPTPAY" | "CARD";
  status: OrderStatus;
  promptpayTarget?: string | null;
  promptpayQrUrl?: string | null;  // data URL จาก BE
  expiresAt?: string | null;
  paymentSlipUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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

  // โหลดรายละเอียดครั้งแรก + โพลทุก 5s
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await authFetch(`${API}/api/orders/${orderId}`);
        if (!r.ok) throw new Error(await r.text());
        const json = await r.json();
        if (!stop) setOrder(json);
      } catch (e) { console.error("[order] load", e); }
      finally { if (!stop) setLoading(false); }
    }
    load();
    const iv = setInterval(() => { if (poll) load(); }, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, [orderId, poll]);

  // นับถอยหลังหมดอายุ
  useEffect(() => {
    let iv: any;
    if (order?.expiresAt) {
      iv = setInterval(() => {
        const diff = Math.max(0, Math.floor((+new Date(order.expiresAt!) - Date.now())/1000));
        setTimeLeft(diff);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => iv && clearInterval(iv);
  }, [order?.expiresAt]);

  // เงื่อนไข UI
  const canUploadSlip = useMemo(() => {
    if (!order) return false;
    if (!order.expiresAt || timeLeft <= 0) return false;
    return order.status === "PENDING_PAYMENT";
  }, [order, timeLeft]);

  const canRestore = useMemo(() => {
    if (!order) return false;
    return order.status === "EXPIRED" || order.status === "REJECTED";
  }, [order]);

  // อัปโหลดสลิป
  function onSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlipError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      setSlipError("รองรับเฉพาะรูปภาพ PNG / JPG / WebP");
      e.target.value = ""; setSlipPreview(null); return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setSlipError("ไฟล์ใหญ่เกิน 5MB");
      e.target.value = ""; setSlipPreview(null); return;
    }
    setSlipPreview(URL.createObjectURL(f));
  }

  async function submitSlip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order || !canUploadSlip) return;
    const file = (e.currentTarget.elements.namedItem("slip") as HTMLInputElement)?.files?.[0];
    if (!file) { setSlipError("กรุณาเลือกไฟล์สลิป"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await authFetch(`${API}/api/orders/${order.id}/slip`, { method: "POST", body: fd });
      if (!r.ok) { setSlipError(await r.text()); return; }
      const data = await r.json();
      setOrder((prev) => prev ? { ...prev, status: data.status, paymentSlipUrl: data.paymentSlipUrl } : prev);
      setPoll(false); // หยุดโพลหลังส่งสลิป (แล้วแต่ดีไซน์)
      alert("อัปโหลดสลิปเรียบร้อย รอแอดมินยืนยัน");
    } finally { setUploading(false); }
  }

  // กู้คืนเข้าตะกร้า
  async function restoreToCart() {
    if (!order || !canRestore) return;
    const r = await authFetch(`${API}/api/orders/${order.id}/restore-cart`, { method: "POST" });
    if (!r.ok) { alert(await r.text()); return; }
    await refreshCart();
    router.push("/cart");
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 md:px-6 py-8">กำลังโหลด...</main>;
  }
  if (!order) {
    return <main className="mx-auto max-w-4xl px-4 md:px-6 py-8">ไม่พบคำสั่งซื้อ</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Order #{order.id.slice(-8)}</h1>
        <StatusBadge s={order.status} />
      </div>

      {/* รายการสินค้า */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">รายการสินค้า</h2>
        <ul className="divide-y">
          {order.items.map((it) => (
            <li key={`${it.productId}-${it.color}-${it.size}`} className="py-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.name} width={56} height={56} className="rounded border" />
              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-600">{it.color} / {it.size} × {it.quantity}</div>
              </div>
              <div className="text-sm">
                {new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(it.unitPrice * it.quantity)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-sm text-gray-700 space-y-1">
          <div>สินค้า: <b>{new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(order.subTotal)}</b></div>
          <div>ค่าส่ง: <b>{new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(order.shippingFee)}</b></div>
          <div className="font-semibold">ยอดรวม: <b>
            {new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(order.total)}
          </b></div>
        </div>
      </section>

      {/* PromptPay QR + countdown (ถ้ามี) */}
      {order.promptpayQrUrl && (order.status==="PENDING_PAYMENT" || order.status==="SLIP_UPLOADED") && (
        <section className="rounded-xl border p-4 space-y-4">
          <h2 className="font-semibold">Scan to pay (PromptPay)</h2>
          <div className="flex items-start gap-6">
            <div className="border rounded-lg p-2">
              {/* ใช้ <img> รองรับ data URL ได้ชัวร์ */}
              <img src={order.promptpayQrUrl} alt="PromptPay QR" width={360} height={360} className="rounded-md" />
            </div>
            <div className="text-sm">
              <div>PromptPay: <span className="font-mono">{order.promptpayTarget}</span></div>
              <div>ยอดชำระ: <b>
                {new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB"}).format(order.total)}
              </b></div>
              {order.expiresAt && (
                <div className={`${timeLeft < 60 ? "text-red-600" : ""} mt-2`}>
                  หมดอายุภายใน: <b>{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,"0")} นาที</b>
                </div>
              )}
              {order.paymentSlipUrl && (
                <div className="mt-2">
                  สลิป: <a href={order.paymentSlipUrl} target="_blank" className="text-blue-600 hover:underline">เปิดดู</a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Banner สถานะสั้น ๆ */}
      <section>
        {order.status==="PENDING_PAYMENT" && <div className="border rounded-md px-3 py-2 text-sm bg-green-50 text-green-700 border-green-200">โปรดแนบสลิปเพื่อยืนยันการชำระ</div>}
        {order.status==="SLIP_UPLOADED" && <div className="border rounded-md px-3 py-2 text-sm bg-blue-50 text-blue-700 border-blue-200">ส่งสลิปแล้ว กำลังรอการตรวจสอบ</div>}
        {order.status==="PAID" && <div className="border rounded-md px-3 py-2 text-sm bg-green-50 text-green-700 border-green-200">ชำระเงินสำเร็จแล้ว</div>}
        {order.status==="REJECTED" && <div className="border rounded-md px-3 py-2 text-sm bg-red-50 text-red-700 border-red-200">สลิปถูกปฏิเสธ</div>}
        {order.status==="EXPIRED" && <div className="border rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-700 border-gray-200">ออเดอร์หมดอายุ</div>}
      </section>

      {/* ฟอร์มอัปโหลดสลิป */}
      <section className={`${!canUploadSlip ? "opacity-60 pointer-events-none" : ""} rounded-xl border p-4`}>
        <h2 className="font-semibold mb-2">อัปโหลดสลิปโอนเงิน</h2>
        <form onSubmit={submitSlip} className="space-y-3">
          <div>
            <input
              type="file" name="slip" accept="image/png,image/jpeg,image/webp"
              onChange={onSlipChange} className="block w-full text-sm" required
              disabled={!canUploadSlip} aria-disabled={!canUploadSlip}
              title={!canUploadSlip ? "ออเดอร์ไม่พร้อมสำหรับการแนบสลิป" : ""}
            />
            {slipPreview && (
              <div className="mt-2">
                <Image src={slipPreview} alt="Preview" width={220} height={220} className="rounded-md" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">รองรับ PNG/JPG/WebP ขนาดไม่เกิน 5MB</p>
            {slipError && <p className="text-xs text-red-600 mt-1">{slipError}</p>}
          </div>
          <button type="submit" disabled={!canUploadSlip || uploading}
            className="px-6 py-3 rounded-lg bg-black text-white font-bold disabled:bg-gray-300">
            {uploading ? "Uploading..." : "ส่งสลิปเพื่อยืนยัน"}
          </button>
        </form>
      </section>

      {/* ปุ่มกู้คืนตะกร้า (กรณีล้มเหลว/หมดอายุ) */}
      {canRestore && (
        <section className="rounded-xl border p-4">
          <button onClick={restoreToCart}
            className="px-6 py-3 rounded-lg bg-white border font-semibold hover:bg-gray-50">
            กู้คืนสินค้ากลับเข้าตะกร้า
          </button>
        </section>
      )}
    </main>
  );
}
