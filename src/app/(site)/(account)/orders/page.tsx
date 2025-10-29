"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* ======================== Types ======================== */
type OrderStatus =
  | "PENDING_PAYMENT"
  | "SLIP_UPLOADED"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";
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
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
  statusNote?: string | null;
  promptpayTarget?: string | null;
  promptpayQrUrl?: string | null;
  paymentSlipUrl?: string | null;
  trackingTag?: string | null;        // (ไม่แสดงในตาราง)
  trackingCreatedAt?: string | null;  // (ไม่แสดงในตาราง)
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
};

type OrderListResponse = {
  items: OrderRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/* ======================== Auth fetch ======================== */
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
  headers.set("Accept", "application/json");
  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
}

/* ======================== Helpers ======================== */
const THB = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);

function fmtDate(s?: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(s);
  }
}

function badgeClass(status: OrderStatus) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1";
  switch (status) {
    case "PENDING_PAYMENT":
      return `${base} bg-amber-50 text-amber-800 ring-amber-200`;
    case "SLIP_UPLOADED":
      return `${base} bg-sky-50 text-sky-700 ring-sky-200`;
    case "PAID":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case "REJECTED":
    case "EXPIRED":
      return `${base} bg-rose-50 text-rose-700 ring-rose-200`;
    case "CANCELED":
      return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  }
}

const statusTH: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "รอชำระ",
  SLIP_UPLOADED: "รอตรวจสลิป",
  PAID: "ชำระแล้ว",
  REJECTED: "ถูกปฏิเสธ",
  EXPIRED: "หมดอายุ",
  CANCELED: "ยกเลิก",
};

/* ======================== Page ======================== */
type TabKey = "all" | "processing" | "success" | "failed";
const tabToStatuses: Record<TabKey, string | undefined> = {
  all: undefined,
  processing: "PENDING_PAYMENT,SLIP_UPLOADED",
  success: "PAID",
  failed: "REJECTED,EXPIRED,CANCELED",
};

export default function OrdersPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    const csv = tabToStatuses[tab];
    if (csv) qs.set("statuses", csv);
    return qs.toString();
  }, [page, size, tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    authFetch(`${API}/api/orders/my?${query}`)
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          throw new Error("กรุณาเข้าสู่ระบบเพื่อดูประวัติการสั่งซื้อ");
        }
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as OrderListResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.items ?? []);
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
      })
      .catch((e) => !cancelled && setErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  const changeTab = (t: TabKey) => {
    setTab(t);
    setPage(0);
  };

  const currentFrom = page * size + (rows.length > 0 ? 1 : 0);
  const currentTo = page * size + rows.length;

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 pb-12">
      {/* Section header (แทน hero gradient เดิม) */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>            
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
              ประวัติการสั่งซื้อ (Order History)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              ตรวจสอบสถานะคำสั่งซื้อ ยอดชำระ และรายละเอียดต่าง ๆ ของคุณ
            </p>
          </div>
        </div>
      </div>


      {/* Tabs + controls (no icons, no counts) */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex overflow-hidden rounded-xl border bg-white p-1 shadow-sm">
          {(
            [
              ["all", "ทั้งหมด"],
              ["processing", "กำลังดำเนินการ"],
              ["success", "สำเร็จ"],
              ["failed", "ไม่สำเร็จ/ยกเลิก"],
            ] as [TabKey, string][]
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ตัวควบคุมขวา ยังเหมือนเดิมได้ */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">แสดงต่อหน้า</label>
          <select
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-lg border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          โหลดข้อมูลผิดพลาด: {err}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-gradient-to-b from-gray-50 to-white text-gray-600">
              <tr className="*:[--pad:theme(spacing.3)] *:px-4 *:py-[var(--pad)]">
                <th className="text-left w-[140px] font-semibold">รหัส</th>
                <th className="text-left w-[200px] font-semibold">วันที่</th>
                <th className="text-left font-semibold">สถานะ</th>
                <th className="text-right w-[130px] font-semibold">ยอดสุทธิ</th>
                <th className="text-left w-[160px] font-semibold">การชำระ</th>
                <th className="text-right w-[160px] font-semibold">การจัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse *:px-4 *:py-3">
                    <td><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td><div className="h-4 w-32 rounded bg-gray-200" /></td>
                    <td><div className="h-5 w-28 rounded-full bg-gray-200" /></td>
                    <td className="text-right">
                      <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="text-right">
                      <div className="ml-auto h-8 w-28 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr
                    key={o.id}
                    className="transition hover:bg-gray-50 *:px-4 *:py-3 align-top"
                  >
                    <td className="font-mono text-xs md:text-sm text-gray-700">
                      #{o.id.slice(-8)}
                    </td>
                    <td className="text-gray-700">{fmtDate(o.createdAt)}</td>
                    <td>
                      <span className={badgeClass(o.status)}>
                        {statusTH[o.status]}
                      </span>
                      {o.statusNote && (
                        <div className="mt-1 text-xs text-gray-500 line-clamp-1">
                          {o.statusNote}
                        </div>
                      )}
                    </td>
                    <td className="text-right font-medium text-gray-900">
                      {THB(o.total)}
                    </td>
                    <td className="text-gray-700">
                      {o.paymentMethod === "PROMPTPAY"
                        ? "PromptPay"
                        : String(o.paymentMethod || "-")}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/orders/${o.id}#shipping`}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        รายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skm-${i}`}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
              <div className="mt-3 h-6 w-28 rounded-full bg-gray-200" />
              <div className="mt-3 h-4 w-24 rounded bg-gray-200" />
              <div className="mt-4 h-8 w-28 rounded bg-gray-200" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          rows.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-gray-900 font-semibold">
                  #{o.id.slice(-8)}
                </div>
                <span className={badgeClass(o.status)}>{statusTH[o.status]}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{fmtDate(o.createdAt)}</div>

              {o.statusNote && (
                <div className="mt-2 text-xs text-gray-500">
                  หมายเหตุ: {o.statusNote}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">การชำระ</div>
                <div className="text-right text-gray-700">
                  {o.paymentMethod === "PROMPTPAY"
                    ? "PromptPay"
                    : String(o.paymentMethod || "-")}
                </div>
                <div className="text-gray-500">ยอดสุทธิ</div>
                <div className="text-right font-medium text-gray-900">
                  {THB(o.total)}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  href={`/orders/${o.id}#shipping`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  รายละเอียด
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-gray-600">
          แสดง {currentFrom}–{currentTo} จาก {totalElements} รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0 || loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600">
            หน้า {page + 1} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages || loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </main>
  );
}

/* ========= Small components ========= */
function EmptyState() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        🧾
      </div>
      <p className="text-sm text-gray-600">ยังไม่มีรายการในหมวดนี้</p>
      <Link
        href="/"
        className="mt-3 inline-flex rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
      >
        ไปเลือกซื้อสินค้า
      </Link>
    </div>
  );
}
