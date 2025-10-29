// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

/* ===== Chart.js ===== */
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

/* ---------- Types ---------- */
type SummaryDTO = {
  revenueToday?: number | null;
  totalSalesToday?: number | null;
  customersTotal?: number | null;
  revenueRangeTotal?: number | null;
  ordersRangeTotal?: number | null;
};

type DailyPoint = { date: string; value: number };
type CategoryBreakdown = { category: string; value: number };
type OrderStatus =
  | "PENDING_PAYMENT"
  | "SLIP_UPLOADED"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED"
  | string;

type OrderItem = {
  id: string;
  userId?: string;
  code?: string;
  customerName?: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
};

type TopProduct = { id: string; name: string; units: number; revenue: number };
type LowStockItem = { id: string; name: string; sku?: string; stock: number };

/* ---------- Date range helpers ---------- */
type RangeKey = "today" | "7d" | "30d" | "ytd";
function getRange(key: RangeKey) {
  const now = new Date();

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (key === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (key === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (key === "ytd") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    from: start.toISOString(), // ใช้ ISO สำหรับเรียก API/เปรียบเทียบแบบ ms
    to: end.toISOString(),
    fromMs: +start,
    toMs: +end,
    label:
      key === "today"
        ? "Today"
        : key === "7d"
        ? "Last 7 days"
        : key === "30d"
        ? "Last 30 days"
        : "Year to date",
  };
}

/* ---------- Recent orders ---------- */
async function fetchRecentOrdersAdmin(
  range?: { from: string; to: string; fromMs?: number; toMs?: number }
) {
  const cands = [
    "/api/admin/orders?size=64&page=0&sort=createdAt,DESC",
    "/admin/orders?size=64&page=0&sort=createdAt,DESC",
    "/api/admin/orders?size=64&page=0&sort=updatedAt,DESC",
    "/api/admin/orders?size=64&page=0&sort=updatedAt,DESC",
  ];

  for (const path of cands) {
    try {
      const r = await api.get(path, { headers: { "Cache-Control": "no-cache" } });
      const mapped = normalizeRecentOrders(r.data);
      if (!mapped.length) continue;

      let rows = mapped;

      if (range?.fromMs != null && range?.toMs != null) {
        const start = range.fromMs;
        const end = range.toMs;
        rows = mapped.filter((o) => {
          const t = Date.parse(o.createdAt);
          return Number.isFinite(t) && t >= start && t <= end;
        });
      }

      rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return rows.slice(0, 8);
    } catch {
      /* try next candidate */
    }
  }
  return [] as OrderItem[];
}

/** เติมชื่อ customer จาก /api/customers/{id} ให้รายการที่ยังไม่มีชื่อ */
async function enrichCustomerNames(orders: OrderItem[]): Promise<OrderItem[]> {
  const ids = Array.from(
    new Set(
      orders
        .filter((o) => !o.customerName && o.userId)
        .map((o) => o.userId!.trim())
        .filter(Boolean)
    )
  );
  if (!ids.length) return orders;

  const nameMap: Record<string, string> = {};

  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await api.get(`/api/customers/${id}`, {
          headers: { "Cache-Control": "no-cache" },
        });
        const u = res.data;

        const fullName =
          (u.displayName as string | undefined)?.trim() ??
          (u.fullName as string | undefined)?.trim() ??
          (u.firstName && u.lastName
            ? `${String(u.firstName).trim()} ${String(u.lastName).trim()}`
            : undefined) ??
          (u.name as string | undefined)?.trim() ??
          (u.username as string | undefined)?.trim() ??
          (u.email as string | undefined)?.trim() ??
          id;

        nameMap[id] = fullName;
      } catch {
        /* ignore */
      }
    })
  );

  return orders.map((o) => ({
    ...o,
    customerName:
      o.customerName ?? (o.userId ? nameMap[o.userId] : undefined) ?? "-",
  }));
}

/* ---------- Page ---------- */
export default function AdminDashboardPage() {
  // UI state
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");
  const range = useMemo(() => getRange(rangeKey), [rangeKey]);

  // Data state
  const [summary, setSummary] = useState<SummaryDTO | null>(null);
  const [trend, setTrend] = useState<DailyPoint[] | null>(null);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[] | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderItem[] | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[] | null>(null);

  // Loading / errors
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  /* ===== helper: ดึงออเดอร์ทั้งหมดในช่วงเวลา แล้วกรองเฉพาะ PAID ===== */
  async function fetchPaidOrdersForTrend(fromIso: string, toIso: string) {
    const cands = [
      `/api/admin/orders?size=500&page=0&sort=createdAt,ASC`,
      `/admin/orders?size=500&page=0&sort=createdAt,ASC`,
    ];
    for (const path of cands) {
      try {
        const r = await api.get(path, { headers: { "Cache-Control": "no-cache" } });
        const rows = normalizeRecentOrders(r.data);
        const fromMs = Date.parse(fromIso);
        const toMs = Date.parse(toIso);
        return rows.filter(
          (o) =>
            String(o.status).toUpperCase() === "PAID" &&
            Number.isFinite(Date.parse(o.createdAt)) &&
            Date.parse(o.createdAt) >= fromMs &&
            Date.parse(o.createdAt) <= toMs
        );
      } catch {
        /* try next */
      }
    }
    return [] as OrderItem[];
  }

  /** รวมยอดสำหรับกราฟ:
   * - 'today'  → รายชั่วโมง (00–23)
   * - '7d/30d/ytd' → รายวัน + เติม 0 ให้วันที่ไม่มียอด (ใช้ Local date ป้องกัน off-by-one)
   */
  function aggregateOrdersToDaily(
    orders: OrderItem[],
    rangeKey: "today" | "7d" | "30d" | "ytd",
    range?: { from: string; to: string }
  ): DailyPoint[] {
    if (rangeKey === "today") {
      // ---------- รายชั่วโมง (วันนี้, local) ----------
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const hourly: number[] = Array.from({ length: 24 }, () => 0);

      for (const o of orders) {
        const t = new Date(o.createdAt);
        if (isNaN(+t)) continue;
        if (t >= start && t <= end) {
          const h = t.getHours(); // local hour
          if (h >= 0 && h <= 23) hourly[h] += Number(o.total || 0);
        }
      }

      const points: DailyPoint[] = [];
      for (let h = 0; h < 24; h++) {
        points.push({ date: `${String(h).padStart(2, "0")}:00`, value: Math.round(hourly[h]) });
      }
      return points;
    }

    // ---------- รายวัน (7ด/30ด/YTD) แบบ local + zero-fill ----------
    const bucket = new Map<string, number>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      if (isNaN(+d)) continue;
      const key = ymdLocal(d); // ใช้ Local date
      bucket.set(key, (bucket.get(key) ?? 0) + Number(o.total || 0));
    }

    if (range?.from && range?.to) {
      const startIso = new Date(range.from);
      const endIso = new Date(range.to);
      const s = new Date(startIso.getFullYear(), startIso.getMonth(), startIso.getDate());
      const e = new Date(endIso.getFullYear(), endIso.getMonth(), endIso.getDate());

      const out: DailyPoint[] = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = ymdLocal(d);
        out.push({ date: key, value: Math.round(bucket.get(key) ?? 0) });
      }
      return out;
    }

    return Array.from(bucket.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ===== useEffect: load ===== */
  useEffect(() => {
    let mounted = true;

    const withParam = (qs: string, key: string, val: string) =>
      qs ? `${qs}&${key}=${encodeURIComponent(val)}` : `?${key}=${encodeURIComponent(val)}`;

    async function load() {
      setLoading(true);
      setErr("");

      const baseQs =
        rangeKey === "today" ? `?lastDays=0` : `?from=${range.from}&to=${range.to}`;
      const paidQs = withParam(baseQs, "statuses", "PAID");

      try {
        const [
          sumRes,
          countRes,
          trendRes,
          catRes,
          topRes,
          lowRes,
          recentRaw,
        ] = await Promise.all([
          api.get(`/admin/analytics/summary${baseQs}`, { headers: { "Cache-Control": "no-cache" } }),
          api.get(`/api/customers/count`, { headers: { "Cache-Control": "no-cache" } }).catch(() => null),
          api.get(`/admin/analytics/sales/daily${paidQs}`, { headers: { "Cache-Control": "no-cache" } })
             .catch(() => null),
          api.get(`/admin/analytics/sales/by-category${baseQs}`, { headers: { "Cache-Control": "no-cache" } }).catch(() => null),
          api.get(`/admin/analytics/top-products${baseQs}`, { headers: { "Cache-Control": "no-cache" } }).catch(() => null),
          api.get(`/api/inventory/low-stock`, { params: { limit: 6 }, headers: { "Cache-Control": "no-cache" } }).catch(() => null),
          fetchRecentOrdersAdmin({ from: range.from, to: range.to, fromMs: range.fromMs, toMs: range.toMs }),
        ]);

        // ---- summary ----
        const _summary: SummaryDTO = {
          revenueToday: 0,
          totalSalesToday: 0,
          customersTotal: null,
          revenueRangeTotal: 0,
          ordersRangeTotal: 0,
        };
        if (sumRes?.data) {
          const s = sumRes.data as any;
          _summary.revenueRangeTotal = Number(s.revenue ?? 0);
          _summary.ordersRangeTotal = Number(s.orders ?? 0);
        }
        if (countRes?.data && typeof countRes.data?.customersTotal === "number") {
          _summary.customersTotal = countRes.data.customersTotal;
        } else {
          try {
            const rc = await api.get(`/api/customers`, { headers: { "Cache-Control": "no-cache" } });
            _summary.customersTotal = Array.isArray(rc.data) ? rc.data.length : 0;
          } catch {}
        }

        // ---- trend ----
        let trendPoints: DailyPoint[] = [];
        if (trendRes?.data) {
          trendPoints = normalizeRevenueDaily(trendRes.data, rangeKey);
        }
        if (!trendRes?.data || trendPoints.length === 0) {
          const paidOrders = await fetchPaidOrdersForTrend(range.from, range.to);
          trendPoints = aggregateOrdersToDaily(paidOrders, rangeKey, { from: range.from, to: range.to });
        }

        const _cats = catRes?.data ? ((catRes.data as CategoryBreakdown[]) ?? []) : [];
        const _tops = topRes?.data ? ((topRes.data as TopProduct[]) ?? []) : [];
        const _low  = lowRes?.data ? ((lowRes.data as LowStockItem[]) ?? []) : [];
        const recentList = Array.isArray(recentRaw) ? await enrichCustomerNames(recentRaw) : [];

        if (!mounted) return;
        setSummary(_summary);
        setTrend(trendPoints);
        setByCategory(_cats);
        setRecentOrders(recentList);
        setTopProducts(_tops);
        setLowStock(_low);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Load dashboard failed.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [rangeKey]);

  const aov = useMemo(() => {
    if (
      summary?.revenueRangeTotal == null ||
      summary?.ordersRangeTotal == null ||
      summary.ordersRangeTotal === 0
    ) {
      return null;
    }
    return summary.revenueRangeTotal / summary.ordersRangeTotal;
  }, [summary]);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Business overview & quick insights
          </p>
        </div>

        {/* Range selector */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {(["today", "7d", "30d", "ytd"] as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRangeKey(k)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                rangeKey === k
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
              title={`From ${getRange(k).from} to ${getRange(k).to}`}
            >
              {getRange(k).label}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          ⚠ {err}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          note={range.label}
          value={
            loading
              ? "…"
              : summary?.revenueRangeTotal == null
              ? "None"
              : formatBaht(Number(summary.revenueRangeTotal))
          }
        />
        <KpiCard
          label="Orders"
          note={range.label}
          value={
            loading
              ? "…"
              : summary?.ordersRangeTotal == null
              ? "None"
              : String(Number(summary.ordersRangeTotal))
          }
        />
        <KpiCard
          label="Average Order Value"
          note={range.label}
          value={loading ? "…" : aov == null ? "None" : formatBaht(Number(aov))}
        />
        <KpiCard
          label="Customers"
          note="All time"
          value={
            loading
              ? "…"
              : summary?.customersTotal != null
              ? String(summary.customersTotal)
              : "None"
          }
        />
      </div>

      {/* Trend + Category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <SectionHead title="Revenue Trend" subtitle={`${range.label} · PAID only`} />
          <div className="mt-2 h-56">
            <RevenueChart data={trend ?? []} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <SectionHead title="Sales by Category" subtitle={range.label} />
          <div className="mt-3 space-y-2">
            {(byCategory ?? []).map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{c.category}</span>
                  <span className="font-medium">{c.value}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-gray-100">
                  <div
                    className="h-2 rounded bg-gray-900"
                    style={{
                      width: `${barWidthPercent(c.value, byCategory)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {!byCategory?.length && <EmptyHint text="No category data" />}
          </div>
        </div>
      </div>

      {/* Orders + Top products + Low stock */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
          <SectionHead title="Recent Orders" />
          <RecentOrdersPretty items={recentOrders ?? []} loading={loading} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <SectionHead title="Top Products" subtitle={range.label} />
            <div className="mt-2 space-y-2">
              {(topProducts ?? []).slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(p.units ?? 0)} units
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatBaht(Number(p.revenue ?? 0))}
                  </div>
                </div>
              ))}
              {!topProducts?.length && <EmptyHint text="No bestseller yet" />}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Low Stock</h3>
            </div>

            {!lowStock?.length ? (
              <EmptyHint text="All stocks are healthy" />
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {lowStock.map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2">
                    <span className="truncate text-sm">
                      {i.name}
                      {i.sku ? ` • ${i.sku}` : ""}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1
                      ${
                        i.stock <= 0
                          ? "bg-red-50 text-red-700 ring-red-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      {i.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */

function KpiCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  const isNone = value === "None";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          isNone ? "text-gray-400" : "text-gray-900"
        }`}
      >
        {value}
      </div>
      {note && <div className="text-xs text-gray-500">{note}</div>}
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

/* ====== Revenue Chart (Chart.js) ====== */
function RevenueChart({ data }: { data: DailyPoint[] }) {
  if (!data || data.length === 0) {
    return <EmptyHint text="No data" />;
  }

  const labels = data.map((d) => d.date);
  const values = data.map((d) => Number(d.value || 0));

  const dataset = {
    label: "Revenue (PAID)",
    data: values,
    tension: 0.3,
    fill: true,
    borderWidth: 2,
    pointRadius: values.length === 1 ? 4 : 2,
    pointHoverRadius: 5,
    borderColor: "rgba(17,24,39,1)",
    backgroundColor: "rgba(17,24,39,0.08)",
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => ` ${formatBaht(Number(ctx.parsed.y))}`,
        },
      },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 10, autoSkip: true } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          callback: (v) =>
            new Intl.NumberFormat("th-TH", {
              style: "currency",
              currency: "THB",
              maximumFractionDigits: 0,
            }).format(Number(v)),
        },
      },
    },
  };

  return <Line data={{ labels, datasets: [dataset] }} options={options} />;
}

/* ---------- Recent Orders table ---------- */
function RecentOrdersPretty({
  items,
  loading,
}: {
  items: OrderItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }
  if (!items.length) return <EmptyHint text="No recent orders" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-600">
            <th className="px-4 py-3">ORDER ID</th>
            <th className="px-4 py-3">CUSTOMER</th>
            <th className="px-4 py-3">AMOUNT</th>
            <th className="px-4 py-3">STATUS</th>
            <th className="px-4 py-3">DATE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((o) => {
            const { label, cls } = toBadge(o.status);
            return (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {o.code ?? `#${o.id.slice(-6)}`}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {o.customerName ?? "-"}
                </td>
                <td className="px-4 py-3 font-medium">{formatBaht(o.total)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}
                  >
                    {label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {new Date(o.createdAt).toLocaleDateString("en-US")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** map สถานะ → ป้ายภาษาไทย */
function toBadge(status: OrderItem["status"]): { label: string; cls: string } {
  const s = String(status ?? "").toUpperCase();
  const norm = s === "CANCELLED" ? "CANCELED" : s === "PENDING" ? "PENDING_PAYMENT" : s;

  switch (norm) {
    case "PAID":
      return { label: "ชำระแล้ว", cls: "bg-emerald-100 text-emerald-700" };
    case "PENDING_PAYMENT":
      return { label: "รอการชำระเงิน", cls: "bg-amber-100 text-amber-800" };
    case "SLIP_UPLOADED":
      return { label: "อัปโหลดสลิป", cls: "bg-blue-100 text-blue-700" };
    case "REJECTED":
      return { label: "ปฏิเสธ", cls: "bg-rose-100 text-rose-700" };
    case "CANCELED":
      return { label: "ยกเลิก", cls: "bg-rose-100 text-rose-700" };
    case "EXPIRED":
      return { label: "หมดอายุ", cls: "bg-slate-100 text-slate-700" };
    default:
      return { label: status as string, cls: "bg-gray-100 text-gray-700" };
  }
}

/* ---------- Utils ---------- */

/* ===== Local date helpers (แก้ off-by-one จาก UTC ISO) ===== */
function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }

/** คืนค่ารูปแบบ YYYY-MM-DD จาก Date (แบบ local time) */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** พยายามแปลง input → YYYY-MM-DD แบบ local ถ้าอ่านไม่ได้ คืน null */
function toYmdLocal(input: any): string | null {
  if (typeof input === "string") {
    const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = new Date(input);
  if (!isNaN(+d)) return ymdLocal(d);
  return null;
}

function formatBaht(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(Number.isFinite(n) ? n : 0);
}

function barWidthPercent(value: number, arr?: CategoryBreakdown[] | null) {
  if (!arr?.length) return 0;
  const max = Math.max(...arr.map((a) => a.value), 1);
  return Math.round((value / max) * 100);
}

/** แปลงผลลัพธ์ "ยอดขายรายวัน" ให้เป็น DailyPoint[] (ใช้ Local date) */
function normalizeRevenueDaily(
  raw: any,
  rangeKey: "today" | "7d" | "30d" | "ytd"
): DailyPoint[] {
  if (!raw) return [];

  // กรณี 1: เป็น aggregated แล้ว
  const arrAgg: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  const looksAggregated =
    arrAgg.length > 0 &&
    (("date" in arrAgg[0]) || ("_id" in arrAgg[0]) || ("day" in arrAgg[0]) || ("key" in arrAgg[0])) &&
    ("revenue" in arrAgg[0] || "total" in arrAgg[0] || "sum" in arrAgg[0] || "value" in arrAgg[0]);

  if (looksAggregated) {
    const pickDate = (o: any) =>
      o?.date ?? o?._id ?? o?.day ?? o?.key ?? (typeof o?.d === "string" ? o.d : undefined);
    const pickValue = (o: any) => o?.revenue ?? o?.total ?? o?.sum ?? o?.value ?? 0;

    const mapped: DailyPoint[] = arrAgg
      .map((o) => {
        const dRaw = pickDate(o);
        const vRaw = pickValue(o);
        if (dRaw == null) return null;

        const dLocal = toYmdLocal(dRaw);
        if (!dLocal) return null;

        const val = Number(vRaw ?? 0);
        return { date: dLocal, value: Number.isFinite(val) ? val : 0 };
      })
      .filter(Boolean) as DailyPoint[];

    mapped.sort((a, b) => a.date.localeCompare(b.date));
    if (rangeKey === "today" && mapped.length > 1) return [mapped[mapped.length - 1]];
    return mapped;
  }

  // กรณี 2: เป็นลิสต์ออเดอร์ → filter เฉพาะ PAID แล้ว group by day (local)
  const arrOrders: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : [];
  if (!arrOrders.length) return [];

  const normStatus = (s: any) => {
    const x = String(s ?? "").toUpperCase();
    if (x === "CANCELLED") return "CANCELED";
    if (x === "PENDING") return "PENDING_PAYMENT";
    return x;
  };

  const buckets = new Map<string, number>();
  for (const o of arrOrders) {
    const status = normStatus(o?.status ?? o?.orderStatus ?? o?.state);
    if (status !== "PAID") continue;
    const key = toYmdLocal(o?.createdAt ?? o?.created ?? o?.createdDate ?? Date.now());
    if (!key) continue;
    const amount = Number(o?.total ?? o?.grandTotal ?? o?.amount ?? 0) || 0;
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }

  const mapped = Array.from(buckets.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (rangeKey === "today" && mapped.length > 1) return [mapped[mapped.length - 1]];
  return mapped;
}

/** สร้างข้อมูลปลอมสำหรับกราฟ (ใช้ local) */
function genFakeTrend(key: RangeKey): DailyPoint[] {
  const len =
    key === "today" ? 1 : key === "7d" ? 7 : key === "30d" ? 30 : daysSinceJan1();
  const out: DailyPoint[] = [];
  const today = new Date();
  let base = 10000 + Math.random() * 15000;
  for (let i = len - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = (Math.sin((i / 3) * Math.PI) + Math.random() - 0.4) * 2500;
    base = Math.max(2000, base + noise);
    out.push({ date: ymdLocal(d), value: Math.round(base) });
  }
  return out;
}

function daysSinceJan1() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((+now - +start) / (1000 * 60 * 60 * 24)) + 1;
}

/** map payload → OrderItem[] (รองรับหลายรูปทรง response) */
function normalizeRecentOrders(raw: any): OrderItem[] {
  if (!raw) return [];

  const arr: any[] =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.content) ? raw.content :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.data?.content) ? raw.data.content :
    Array.isArray(raw?.page?.content) ? raw.page.content :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.results) ? raw.results :
    Array.isArray(raw?.rows) ? raw.rows :
    Array.isArray(raw?.list) ? raw.list :
    Array.isArray(raw?.orders) ? raw.orders :
    Array.isArray(raw?._embedded?.orders) ? raw._embedded.orders :
    [];

  return arr.map((o) => {
    const id = String(o.id ?? o._id ?? o.orderId ?? "");
    const code =
      o.code ?? o.orderCode ?? o.number ?? o.ref ?? (id ? `#${id.slice(-6)}` : undefined);

    const total = Number(o.total ?? o.totalPrice ?? o.grandTotal ?? o.amount ?? 0);

    let status: string = String(o.status ?? o.orderStatus ?? o.state ?? "PENDING_PAYMENT");
    if (status === "CANCELLED") status = "CANCELED";
    if (status === "PENDING") status = "PENDING_PAYMENT";

    const createdAt = String(
      o.createdAt ?? o.created ?? o.createdDate ?? o.created_time ?? new Date().toISOString()
    );

    const nameFromFirstLast = [o.customer?.firstName, o.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const userId =
      String(o.userId ?? o.customerId ?? o.customer?.id ?? o.user?.id ?? "") ||
      undefined;

    const customerName =
      o.customer?.displayName ??
      o.displayName ??
      o.user?.displayName ??
      o.customerName ??
      o.customer?.name ??
      (nameFromFirstLast || undefined) ??
      o.userName ??
      o.user?.fullName ??
      undefined;

    return {
      id,
      code,
      userId,
      customerName,
      total,
      status,
      createdAt,
    } as OrderItem;
  });
}
