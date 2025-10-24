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
  // tracking* ยังส่งมาได้ แต่ “ไม่แสดงในตาราง” ตาม requirement ใหม่
  trackingTag?: string | null;
  trackingCreatedAt?: string | null;
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

/** แนบ Bearer token ถ้ามี และ include คุกกี้เสมอ (แก้ 403) */
async function authFetch(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  const t = getAccessToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  headers.set("Accept", "application/json");
  return fetch(url, {
    ...init,
    headers,
    credentials: "include", // สำคัญ: ส่งคุกกี้ไปด้วย
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
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "PENDING_PAYMENT":
      return `${base} bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200`;
    case "SLIP_UPLOADED":
      return `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`;
    case "PAID":
      return `${base} bg-green-50 text-green-700 ring-1 ring-green-200`;
    case "REJECTED":
    case "EXPIRED":
      return `${base} bg-red-50 text-red-700 ring-1 ring-red-200`;
    case "CANCELED":
      return `${base} bg-gray-100 text-gray-700 ring-1 ring-gray-200`;
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
  CANCELED: "ยกเลิก",
};

/* ======================== Page ======================== */
// ตัดแท็บ “รอจัดส่ง” ออกตาม requirement ใหม่
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
          // กรณีไม่ได้ล็อกอิน/สิทธิ์ไม่พอ — โชว์ข้อความอ่านง่าย
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

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-6 py-8">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Order history
        </h1>
        <p className="text-sm text-gray-500">ประวัติการสั่งซื้อทั้งหมดของคุณ</p>
      </div>

      {/* Tabs (ไม่มี “รอจัดส่ง”) */}
      <div className="mb-5 inline-flex rounded-xl border bg-white p-1 shadow-sm">
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

      {/* Error */}
      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          โหลดข้อมูลผิดพลาด: {err}
        </div>
      )}

      {/* Table (เอาคอลัมน์เลขติดตามออก) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="*:[--pad:theme(spacing.3)] *:px-4 *:py-[var(--pad)]">
                <th className="text-left w-[140px] font-semibold">รหัส</th>
                <th className="text-left w-[180px] font-semibold">วันที่</th>
                <th className="text-left font-semibold">สถานะ</th>
                <th className="text-right w-[120px] font-semibold">ยอดสุทธิ</th>
                <th className="text-left w-[140px] font-semibold">การชำระ</th>
                <th className="text-right w-[150px] font-semibold">การจัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse *:px-4 *:py-3">
                    <td><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td><div className="h-4 w-28 rounded bg-gray-200" /></td>
                    <td><div className="h-5 w-24 rounded bg-gray-200" /></td>
                    <td className="text-right">
                      <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
                    </td>
                    <td><div className="h-4 w-20 rounded bg-gray-200" /></td>
                    <td className="text-right">
                      <div className="ml-auto h-8 w-28 rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100" />
                    <p className="text-sm text-gray-500">ไม่มีรายการในหมวดนี้</p>
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr
                    key={o.id}
                    className="transition hover:bg-gray-50 *:px-4 *:py-3 align-top"
                  >
                    <td className="font-mono text-xs md:text-sm text-gray-700">
                      {o.id.slice(-8)}
                    </td>
                    <td className="text-gray-700">{fmtDate(o.createdAt)}</td>
                    <td>
                      <span className={badgeClass(o.status)}>{statusTH[o.status]}</span>
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
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
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

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          แสดง {page * size + (rows.length > 0 ? 1 : 0)}–{page * size + rows.length} จาก{" "}
          {totalElements} รายการ
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
