"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

/* ---------------- Types ---------------- */
type OrderStatus =
  | "PENDING_PAYMENT"
  | "SLIP_UPLOADED"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";

type OrderItem = {
  productId: string;
  name?: string;
  quantity?: number; // backend ของคุณใช้ quantity
  price?: number;
};

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
  rejectReason?: string | null; // ใช้ field เดิมส่งเหตุผล ทั้ง reject/cancel
};

type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type Address = {
  fullName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  subDistrict?: string | null;  // ตำบล
  district?: string | null;     // อำเภอ
  province?: string | null;
  postcode?: string | null;
};

type UserLite = { id: string; fullName: string; email: string; address?: Address | null; };

/* ---------------- Utils ---------------- */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "รอชำระ",
  SLIP_UPLOADED: "ส่งสลิปแล้ว",
  PAID: "ชำระแล้ว",
  REJECTED: "ถูกปฏิเสธ",
  EXPIRED: "หมดอายุ",
  CANCELED: "ยกเลิกแล้ว",
};

function StatusBadge({ s }: { s: OrderStatus }) {
  const cls =
    s === "PAID"
      ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
      : s === "SLIP_UPLOADED"
      ? "bg-amber-50 text-amber-600 ring-amber-200"
      : s === "REJECTED"
      ? "bg-red-50 text-red-600 ring-red-200"
      : s === "CANCELED"
      ? "bg-red-50 text-red-600 ring-red-200"
      : s === "EXPIRED"
      ? "bg-slate-50 text-slate-600 ring-slate-200"
      : "bg-gray-50 text-gray-600 ring-gray-200";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ${cls}`}
      style={{ minWidth: 86, textAlign: "center" }}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

/* ============================================================ */

export default function AdminOrdersPage() {
  const { token } = useAuth();

  // table state
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<OrderStatus | "ALL">("SLIP_UPLOADED");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Page<Order>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // view modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // customer cache
  const [userMap, setUserMap] = useState<Record<string, UserLite>>({});

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
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
      const res = await fetch(`${API_BASE}/api/admin/orders?${qs.toString()}`, {
        headers,
        cache: "no-store",
      });
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
    // ปรับ path ให้ตรงกับระบบจริง (admin หรือ public ก็ได้)
    const res = await fetch(`${API_BASE}/api/customers/${userId}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const u = await res.json();

    const fullName =
      u.fullName ??
      (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? userId);

    // เดาคีย์ที่อาจเป็น "ที่อยู่เริ่มต้น"
    const rawAddr =
      u.defaultAddress ??
      u.shippingAddress ??
      u.address ??
      (Array.isArray(u.addresses) ? u.addresses[0] : null) ??
      (Array.isArray(u.shippingAddresses) ? u.shippingAddresses[0] : null);

    const addr: Address | null = rawAddr
      ? {
          fullName: rawAddr.fullName ?? rawAddr.name ?? fullName ?? null,
          phone: rawAddr.phone ?? rawAddr.tel ?? null,
          line1: rawAddr.line1 ?? rawAddr.address1 ?? rawAddr.address ?? null,
          line2: rawAddr.line2 ?? rawAddr.address2 ?? null,
          subDistrict: rawAddr.subDistrict ?? rawAddr.ward ?? null,
          district: rawAddr.district ?? rawAddr.city ?? null,
          province: rawAddr.province ?? rawAddr.state ?? null,
          postcode: rawAddr.postcode ?? rawAddr.zip ?? rawAddr.zipcode ?? null,
        }
      : null;

    return { id: userId, fullName, email: u.email ?? "", address: addr };
  } catch {
    return null;
  }
}

  
  /* ------------- derived ------------- */

// แปลง data -> rows (กัน undefined) รองรับหลายรูปทรง response (content | items | data)
const rows = useMemo<Order[]>(() => {
  const anyData = data as any;
  if (Array.isArray(anyData?.content)) return anyData.content as Order[];
  if (Array.isArray(anyData?.items))   return anyData.items as Order[];
  if (Array.isArray(anyData?.data))    return anyData.data as Order[];
  return [];
}, [data]);

useEffect(() => {
    const ids = Array.from(new Set(rows.map((o) => o.userId))).filter(
      (id) => id && !userMap[id]
    );
    if (ids.length === 0) return;
    (async () => {
      const list = await Promise.all(ids.map((id) => fetchUser(id)));
      const patch: Record<string, UserLite> = {};
      list.forEach((u) => { if (u) patch[u.id] = u; });
      if (Object.keys(patch).length) setUserMap((prev) => ({ ...prev, ...patch }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, headers]);

// กรองด้วย query จาก rows (ไม่อิง data.content ตรงๆ แล้ว)
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (o) => o.id.toLowerCase().includes(q) || (o.userId ?? "").toLowerCase().includes(q)
  );
}, [rows, query]);


  const kpiTotal    = (data?.totalElements ?? rows.length);
  const kpiAwait    = filtered.filter((o) => o.status === "SLIP_UPLOADED").length;
  const kpiPaid     = filtered.filter((o) => o.status === "PAID").length;
  const kpiRejected = filtered.filter((o) => o.status === "REJECTED").length;


  /* ------------- actions ------------- */
  async function patchStatus(
    orderId: string,
    next: "PAID" | "REJECTED" | "CANCELED",
    reason?: string
  ) {
    const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: next, rejectReason: reason ?? null }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `Patch failed (${res.status})`));
    load();
  }

  const approve = (o: Order) => {
    if (
      !confirm(
        `ยืนยันรับชำระออเดอร์ #${o.id.slice(-6)} จำนวน ${THB.format(o.total)} ?`
      )
    )
      return;
    patchStatus(o.id, "PAID").catch((e) => alert(e.message));
  };

  const reject = (o: Order) => {
    const reason = prompt(
      `เหตุผลการปฏิเสธสำหรับ #${o.id.slice(-6)}`,
      o.rejectReason ?? ""
    );
    if (reason === null) return;
    patchStatus(o.id, "REJECTED", reason || undefined).catch((e) =>
      alert(e.message)
    );
  };

  async function onView(o: Order) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/orders/${o.id}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    const full = (await res.json()) as Order;
    setViewOrder(full);

    // ✅ ensure customer loaded (for address)
    if (!userMap[o.userId]) {
      const u = await fetchUser(o.userId);
      if (u) setUserMap((prev) => ({ ...prev, [u.id]: u }));
    }

    setViewOpen(true);
  } catch (e: any) {
    alert(e.message || "โหลดรายละเอียดไม่สำเร็จ");
  }
}

  function onCancel(o: Order) {
    const reason = prompt(
      `ยืนยันยกเลิกออเดอร์ #${o.id.slice(-6)} ?\nระบุเหตุผล (ไม่บังคับ)`,
      ""
    );
    if (reason === null) return;
    patchStatus(o.id, "CANCELED", reason || undefined).catch((e) =>
      alert(e.message)
    );
  }

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
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              ⌘K
            </span>
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
            <option value="CANCELED">Canceled</option>
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
              const itemsCount =
                o.items?.reduce((a, b) => a + (b.quantity || 0), 0) ?? 0;
              const u = userMap[o.userId];
              return (
                <tr key={o.id} className="align-top hover:bg-gray-50">
                  {/* ORDER (ซ่อน ObjectId ยาว) */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      #{o.id.slice(-6)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {created ? created.toLocaleDateString("th-TH") : "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {created ? created.toLocaleTimeString("th-TH") : ""}
                    </div>
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
                        <div className="font-medium text-gray-900">
                          {u.fullName || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.email || "\u2014"}
                        </div>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium">{itemsCount} ชิ้น</div>
                    <div className="text-xs text-gray-500">
                      {o.items?.slice(0, 2).map((it, i) => (
                        <span key={i}>
                          {it.name ?? it.productId} × {it.quantity ?? 0}
                          {i < Math.min(1, o.items.length - 1) ? ", " : ""}
                        </span>
                      ))}
                      {(o.items?.length ?? 0) > 2 ? " ..." : ""}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {THB.format(o.total)}
                    </div>
                    <div className="text-xs text-gray-500">
                      สินค้า {THB.format(o.subTotal)} • ส่ง {THB.format(o.shippingFee)}
                    </div>
                  </td>

                  <td className="px-4 py-3 uppercase text-gray-700">
                    {o.paymentMethod}
                    {o.expiresAt && (
                      <div className="text-xs text-gray-500">
                        หมดอายุ: {new Date(o.expiresAt).toLocaleString("th-TH")}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {o.paymentSlipUrl ? (
                      <a
                        href={o.paymentSlipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-100 transition cursor-pointer"
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
                      <div className="mt-1 text-xs text-rose-600">
                        เหตุผล: {o.rejectReason}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {o.status === "SLIP_UPLOADED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => approve(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 shadow-sm hover:bg-green-100 transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-100 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {o.status === "PAID" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onView(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-100 transition cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancel(o)}
                            className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {o.status !== "SLIP_UPLOADED" && o.status !== "PAID" && (
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
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {rows.length} of {data.totalElements ?? rows.length} orders • หน้า{" "}
          {data.number + 1}/{data.totalPages || 1}
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <button
            disabled={page + 1 >= (data.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* ===== View Modal ===== */}
      {viewOpen && viewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4"
          onClick={() => setViewOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">
                Order #{viewOrder.id.slice(-6)}
              </h3>
              <button
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                onClick={() => setViewOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <div className="text-sm text-gray-500">Customer</div>
                <div className="font-medium">
                  {userMap[viewOrder.userId]?.fullName ?? viewOrder.userId}
                </div>
                <div className="text-xs text-gray-500">
                  {userMap[viewOrder.userId]?.email || ""}
                </div>
                
              </div>

              <div>
                <div className="text-sm text-gray-500">Payment</div>
                <div className="font-medium uppercase">
                  {viewOrder.paymentMethod}
                </div>
                {viewOrder.paymentSlipUrl && (
                  <a
                    href={viewOrder.paymentSlipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-xs text-blue-600 hover:underline"
                  >
                    เปิดสลิป
                  </a>
                )}
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-sm text-gray-500">Items</div>
                <div className="divide-y rounded-xl border">
                  {viewOrder.items.map((it, i) => {
                    const qty = it.quantity ?? 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="text-sm">
                          <div className="font-medium">
                            {it.name ?? it.productId}
                          </div>
                          <div className="text-xs text-gray-500">× {qty}</div>
                        </div>
                        <div className="text-sm text-gray-700">
                          {it.price
                            ? it.price.toLocaleString("th-TH")
                            : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-end gap-6 text-sm">
                  <div>
                    สินค้า{" "}
                    <span className="font-semibold">
                      {viewOrder.subTotal.toLocaleString("th-TH")}
                    </span>
                  </div>
                  <div>
                    ส่ง{" "}
                    <span className="font-semibold">
                      {viewOrder.shippingFee.toLocaleString("th-TH")}
                    </span>
                  </div>
                  <div>
                    รวม{" "}
                    <span className="font-semibold">
                      {viewOrder.total.toLocaleString("th-TH")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ===== End View Modal ===== */}
    </div>
  );
}

/* ---------------- Small UI bits ---------------- */

function formatAddress(a?: Address | null) {
  if (!a) return "";
  const parts = [
    a.line1,
    a.line2,
    a.subDistrict && `ต.${a.subDistrict}`,
    a.district && `อ.${a.district}`,
    a.province && `จ.${a.province}`,
    a.postcode,
  ]
    .filter(Boolean)
    .join(" ");
  return parts;
}


function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Check the Order</h1>
      <p className="text-sm text-gray-500">
        Review payment slips and confirm orders
      </p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
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
        <div
          key={i}
          className="h-14 animate-pulse border-b border-gray-100 bg-gray-50 last:border-0"
        />
      ))}
    </div>
  );
}
