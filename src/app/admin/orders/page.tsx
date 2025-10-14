"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/* ---------------- Types ---------------- */
type OrderStatus = "PENDING_PAYMENT" | "SLIP_UPLOADED" | "PAID" | "REJECTED" | "EXPIRED";

type OrderItem = { productId: string; name?: string; quantity?: number; price?: number };
type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  subTotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  paymentSlipUrl?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  rejectReason?: string | null;
};

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type UserLite = { id: string; fullName: string; email: string };

/* ---------------- Utils ---------------- */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const THB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending",
  SLIP_UPLOADED: "SLIP_UPLOADED",
  PAID: "PAID",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
};

function StatusBadge({ s }: { s: OrderStatus }) {
  const cls =
    s === "PAID"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
      : s === "SLIP_UPLOADED"
      ? "bg-amber-50 text-amber-600 ring-amber-200"
      : s === "REJECTED"
      ? "bg-red-50 text-red-600 ring-red-200"
      : s === "EXPIRED"
      ? "bg-slate-50 text-slate-600 ring-slate-200"
      : "bg-gray-50 text-gray-600 ring-gray-200";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg
                  px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ${cls}`}
      style={{ minWidth: 86, textAlign: "center" }}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${className}`}>{children}</th>;
}

/* ============================================================ */

export default function AdminOrdersPage() {
  const { token } = useAuth();

  // table state
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<OrderStatus | "ALL">("SLIP_UPLOADED");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Page<Order>>({ content: [], totalElements: 0, totalPages: 0, number: 0, size });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // customer cache
  const [userMap, setUserMap] = useState<Record<string, UserLite>>({});

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token]
  );

  /* ------------- fetch orders ------------- */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ page: String(page), size: String(size) });
      if (status !== "ALL") qs.set("status", status);
      const res = await fetch(`${API_BASE}/api/admin/orders?${qs.toString()}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = (await res.json()) as Page<Order>;
      setData(json);
    } catch (e: any) {
      setErr(e.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [token, headers, page, size, status]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------- fetch customers on-demand (cached) ------------- */
  async function fetchUser(userId: string): Promise<UserLite | null> {
    try {
      // ปรับ endpoint ให้ตรงกับของคุณ ถ้าไม่ใช่ /api/customers/{id}
      const res = await fetch(`${API_BASE}/api/customers/${userId}`, { headers, cache: "no-store" });
      if (!res.ok) return null;
      const u = await res.json();
      const fullName =
        u.fullName ??
        (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? userId);
      return { id: userId, fullName, email: u.email ?? "" };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const ids = Array.from(new Set(data.content.map((o) => o.userId))).filter((id) => id && !userMap[id]);
    if (ids.length === 0) return;
    (async () => {
      const list = await Promise.all(ids.map((id) => fetchUser(id)));
      const patch: Record<string, UserLite> = {};
      list.forEach((u) => {
        if (u) patch[u.id] = u;
      });
      if (Object.keys(patch).length) setUserMap((prev) => ({ ...prev, ...patch }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.content, headers]);

  /* ------------- derived ------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.content;
    return data.content.filter(
      (o) => o.id.toLowerCase().includes(q) || (o.userId ?? "").toLowerCase().includes(q)
    );
  }, [data.content, query]);

  const kpiTotal = data.totalElements;
  const kpiAwait = filtered.filter((o) => o.status === "SLIP_UPLOADED").length;
  const kpiPaid = filtered.filter((o) => o.status === "PAID").length;
  const kpiRejected = filtered.filter((o) => o.status === "REJECTED").length;

  /* ------------- actions ------------- */
  async function patchStatus(orderId: string, next: "PAID" | "REJECTED", reason?: string) {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: next, rejectReason: reason ?? null }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `Patch failed (${res.status})`));
    load();
  }
  const approve = (o: Order) => {
    if (!confirm(`ยืนยันรับชำระออเดอร์ #${o.id.slice(-6)} จำนวน ${THB.format(o.total)} ?`)) return;
    patchStatus(o.id, "PAID").catch((e) => alert(e.message));
  };
  const reject = (o: Order) => {
    const reason = prompt(`เหตุผลการปฏิเสธสำหรับ #${o.id.slice(-6)}`, o.rejectReason ?? "");
    if (reason === null) return;
    patchStatus(o.id, "REJECTED", reason || undefined).catch((e) => alert(e.message));
  };

  /* ------------- UI ------------- */
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Header />
        <CardsRowSkeleton />
        <ToolbarSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Header />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="All orders" value={String(kpiTotal)} />
        <KpiCard label="Awaiting review" value={String(kpiAwait)} />
        <KpiCard label="Paid" value={String(kpiPaid)} />
        <KpiCard label="Rejected" value={String(kpiRejected)} />
      </div>

      {/* Toolbar */}
      <div className="items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order id or user id…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">⌘K</span>
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value as any);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="SLIP_UPLOADED">Slip</option>
            <option value="PENDING_PAYMENT">Pending</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
            <option value="ALL">All</option>
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2 md:mt-0">
          <select
            value={size}
            onChange={(e) => {
              setPage(0);
              setSize(Number(e.target.value));
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s} / หน้า
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setQuery("");
              setStatus("SLIP_UPLOADED");
              setSize(10);
              setPage(0);
              load();
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
              <Th>Order</Th>
              <Th>Created</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Slip</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((o) => {
              const created = o.createdAt ? new Date(o.createdAt) : null;
              const itemsCount = o.items?.reduce((a, b) => a + (b.quantity || 0), 0) ?? 0;
              const u = userMap[o.userId];
              return (
                <tr key={o.id} className="hover:bg-gray-50 align-top">
                  {/* ORDER (ซ่อน ObjectId ยาว) */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">#{o.id.slice(-6)}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{created ? created.toLocaleDateString("th-TH") : "-"}</div>
                    <div className="text-xs text-gray-500">{created ? created.toLocaleTimeString("th-TH") : ""}</div>
                  </td>

                  {/* CUSTOMER: ชื่อ–นาม + email */}
                  <td className="px-4 py-3">
                    {!u ? (
                      <>
                        <div className="mb-1 h-3 w-28 animate-pulse rounded bg-gray-100" />
                        <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900">{u.fullName || "-"}</div>
                        <div className="text-xs text-gray-500">{u.email || "\u2014"}</div>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{itemsCount} ชิ้น</div>
                    <div className="text-xs text-gray-500">
                      {o.items?.slice(0, 2).map((it, i) => (
                        <span key={i}>
                          {it.name ?? it.productId} × {it.quantity}
                          {i < Math.min(1, (o.items.length - 1)) ? ", " : ""}
                        </span>
                      ))}
                      {(o.items?.length ?? 0) > 2 ? " ..." : ""}
                    </div> 
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{THB.format(o.total)}</div>
                    {/*<div className="text-xs text-gray-500">สินค้า {THB.format(o.subTotal)} • ส่ง {THB.format(o.shippingFee)}</div>*/}
                  </td>

                  <td className="px-4 py-3 uppercase text-gray-700">
                    {o.paymentMethod}
                    {o.expiresAt && <div className="text-xs text-gray-500">หมดอายุ: {new Date(o.expiresAt).toLocaleString("th-TH")}</div>}
                  </td>

                  <td className="px-4 py-3">
                    {o.paymentSlipUrl ? (
                      <a
                          href={o.paymentSlipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center
                                    rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600
                                    shadow-sm hover:bg-blue-100 transition cursor-pointer"
                          style={{ minWidth: 86, textAlign: "center" }}
                        >
                          Open
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge s={o.status} />
                    {o.status === "REJECTED" && o.rejectReason && (
                      <div className="mt-1 text-xs text-rose-600">เหตุผล: {o.rejectReason}</div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {o.status === "SLIP_UPLOADED" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => approve(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 shadow-sm hover:bg-green-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  ไม่พบออเดอร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Error */}
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

      {/* Footer */}
      <div className="flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {data.content.length} of {data.totalElements} orders • หน้า {data.number + 1}/{data.totalPages || 1}
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Before
          </button>
          <button
            disabled={page + 1 >= (data.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Small UI bits ---------------- */

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Check the Order</h1>
      <p className="text-sm text-gray-500">Review payment slips and confirm orders</p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function CardsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  );
}
function ToolbarSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-80 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-9 w-40 animate-pulse rounded-xl bg-gray-100" />
        <div className="ml-auto h-9 w-24 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-9 w-24 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse border-b border-gray-100 bg-gray-50 last:border-0" />
      ))}
    </div>
  );
}
