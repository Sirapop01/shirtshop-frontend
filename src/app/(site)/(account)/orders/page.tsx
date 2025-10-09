// src/app/(site)/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ======================== Types ======================== */
type OrderStatus = "PENDING_PAYMENT" | "SLIP_UPLOADED" | "PAID" | "REJECTED" | "EXPIRED";
type PaymentMethod = "PROMPTPAY" | "COD" | "CARD" | string;

type OrderItem = {
  productId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  color?: string | null;
  size?: string | null;
};

type OrderRow = {
  id: string;
  userId: string;
  items: OrderItem[];
  subTotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  promptpayTarget?: string | null;
  promptpayQrUrl?: string | null;
  paymentSlipUrl?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  expiresAt?: string | null;
};

type OrderListResponse = {
  items: OrderRow[];
  page: number;           // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
};

/* ======================== Auth fetch ======================== */
const ACCESS_TOKEN_KEY = "accessToken";
const getAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);

async function authFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  headers.set("Accept", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

/* ======================== Helpers ======================== */
const THB = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return s;
  }
}

function statusBadge(s: OrderStatus) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  switch (s) {
    case "PENDING_PAYMENT":
      return `${base} bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200`;
    case "SLIP_UPLOADED":
      return `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`;
    case "PAID":
      return `${base} bg-green-50 text-green-700 ring-1 ring-green-200`;
    case "REJECTED":
    case "EXPIRED":
      return `${base} bg-red-50 text-red-700 ring-1 ring-red-200`;
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}
const statusTH: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "รอชำระ",
  SLIP_UPLOADED: "รอตรวจสลิป",
  PAID: "ชำระแล้ว",
  REJECTED: "ถูกปฏิเสธ",
  EXPIRED: "หมดอายุ",
};

/* แท็บกรองสถานะ -> ส่งไปเป็น CSV */
type TabKey = "all" | "processing" | "success" | "failed";
const tabToStatuses: Record<TabKey, string | undefined> = {
  all: undefined,
  processing: "PENDING_PAYMENT,SLIP_UPLOADED",
  success: "PAID",
  failed: "REJECTED,EXPIRED",
};

/* ======================== Page ======================== */
export default function OrdersPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);       // 0-based
  const [size, setSize] = useState(20);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    const csv = tabToStatuses[tab];
    if (csv) qs.set("status", csv);
    return qs.toString();
  }, [page, size, tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    authFetch(`${API}/api/orders/my?${query}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        const data: OrderListResponse = await r.json();
        if (cancelled) return;
        setRows(data.items ?? []);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch((e) => !cancelled && setErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  // เปลี่ยนแท็บแล้วรีเซ็ตหน้า
  const changeTab = (t: TabKey) => {
    setTab(t);
    setPage(0);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Order history</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ["all", "ทั้งหมด"],
          ["processing", "กำลังดำเนินการ"],
          ["success", "สำเร็จ"],
          ["failed", "ไม่สำเร็จ"],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              tab === key ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mb-4 border border-red-200 bg-red-50 text-red-700 rounded-md px-3 py-2 text-sm">
          โหลดข้อมูลผิดพลาด: {err}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 w-[140px]">รหัส</th>
              <th className="text-left px-4 py-3 w-[160px]">วันที่</th>
              <th className="text-left px-4 py-3">สถานะ</th>
              <th className="text-right px-4 py-3 w-[120px]">ยอดสุทธิ</th>
              <th className="text-left px-4 py-3 w-[140px]">การชำระ</th>
              <th className="text-right px-4 py-3 w-[150px]">การจัดการ</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded w-20" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 bg-gray-200 rounded ml-auto w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-8 bg-gray-200 rounded w-28 ml-auto" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  ไม่มีรายการในหมวดนี้
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs md:text-sm">{o.id.slice(-8)}</td>
                  <td className="px-4 py-3">{fmtDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(o.status)}>{statusTH[o.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{THB(o.total)}</td>
                  <td className="px-4 py-3">
                    {o.paymentMethod === "PROMPTPAY" ? "PromptPay" : String(o.paymentMethod || "-")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/orders/${o.id}`}
                        className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                      >
                        รายละเอียด
                      </Link>
                      {o.status === "PENDING_PAYMENT" && (
                        <Link
                          href={`/checkout`}
                          className="px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800"
                          title="ไปหน้าชำระเงินเพื่อแนบสลิป"
                        >
                          ชำระ / แนบสลิป
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          แสดง {(page * size) + (rows.length > 0 ? 1 : 0)}–{page * size + rows.length} จาก {totalElements} รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0 || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600">
            หน้า {page + 1} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </main>
  );
}
