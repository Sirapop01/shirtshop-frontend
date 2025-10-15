// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- Types ---------- */
type SummaryDTO = {
  revenueToday?: number | null;
  totalSalesToday?: number | null; // orders today
  customersTotal?: number | null;
  revenueRangeTotal?: number | null; // total revenue in selected range
  ordersRangeTotal?: number | null;  // total orders in selected range
};

type DailyPoint = { date: string; value: number };
type CategoryBreakdown = { category: string; value: number };
type OrderItem = {
  id: string;
  code?: string;
  customerName?: string;
  total: number;
  status: "PAID" | "PENDING" | "CANCELLED" | "REFUND";
  createdAt: string;
};
type TopProduct = { id: string; name: string; units: number; revenue: number };
type LowStockItem = { id: string; name: string; sku?: string; stock: number };

/* ---------- Date range helpers ---------- */
type RangeKey = "today" | "7d" | "30d" | "ytd";
function getRange(key: RangeKey) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
  let start = new Date(end);
  if (key === "today") start = new Date(end);
  if (key === "7d") start.setUTCDate(end.getUTCDate() - 6);
  if (key === "30d") start.setUTCDate(end.getUTCDate() - 29);
  if (key === "ytd") start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label:
      key === "today" ? "Today" : key === "7d" ? "Last 7 days" : key === "30d" ? "Last 30 days" : "Year to date",
  };
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

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const withAuth = (headers: HeadersInit = {}) => ({
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
  let mounted = true;
  const withAuth = (headers: HeadersInit = {}) => ({
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function load() {
    setLoading(true);
    setErr("");
    const qs = `?from=${range.from}&to=${range.to}`;

    try {
      // ✅ เพิ่ม /api/customers/count
      const [
        sumRes,
        countRes,
        trendRes,
        catRes,
        ordRes,
        topRes,
        lowRes,
      ] = await Promise.all([
        fetch(`http://localhost:8080/api/dashboard${qs}`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/customers/count`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/sales/daily${qs}`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/sales/by-category${qs}`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/orders/recent?limit=8`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/products/top${qs}`, { headers: withAuth(), cache: "no-store" }),
        fetch(`http://localhost:8080/api/inventory/low-stock?limit=6`, { headers: withAuth(), cache: "no-store" }),
      ]);

      // base summary
      let _summary: SummaryDTO = {
        revenueToday: null,
        totalSalesToday: null,
        customersTotal: null,
        revenueRangeTotal: null,
        ordersRangeTotal: null,
      };

      if (sumRes.ok) {
        const s = (await sumRes.json()) as SummaryDTO;
        _summary = { ..._summary, ...s };
      }

      // ✅ set customersTotal จาก /count
      if (countRes.ok) {
        const obj = (await countRes.json()) as { customersTotal?: number };
        if (typeof obj?.customersTotal === "number") {
          _summary.customersTotal = obj.customersTotal; // รับค่า 0 ด้วย
        }
      }

      // ✅ fallback: ถ้ายัง null → ไปนับจาก /api/customers
      if (_summary.customersTotal == null) {
        try {
          const rc = await fetch(`http://localhost:8080/api/customers`, {
            headers: withAuth(),
            cache: "no-store",
          });
          if (rc.ok) {
            const arr: unknown[] = await rc.json();
            _summary.customersTotal = Array.isArray(arr) ? arr.length : 0;
          }
        } catch {}
      }

      // ส่วนอื่นคงเดิม
      const _trend = trendRes.ok ? ((await trendRes.json()) as DailyPoint[]) : null;
      const _cats  = catRes.ok ? ((await catRes.json()) as CategoryBreakdown[]) : null;
      const _orders= ordRes.ok ? ((await ordRes.json()) as OrderItem[]) : null;
      const _tops  = topRes.ok ? ((await topRes.json()) as TopProduct[]) : null;
      const _low   = lowRes.ok ? ((await lowRes.json()) as LowStockItem[]) : [];

      if (!mounted) return;
      setSummary(_summary);
      setTrend(_trend ?? genFakeTrend(rangeKey));
      setByCategory(_cats ?? [
        { category: "T-Shirts", value: 42 },
        { category: "Hoodies", value: 28 },
        { category: "Pants", value: 16 },
        { category: "Accessories", value: 14 },
      ]);
      setRecentOrders(_orders ?? []);
      setTopProducts(_tops ?? []);
      setLowStock(_low ?? []);
    } catch (e: any) {
      if (!mounted) return;
      setErr(e?.message || "Load dashboard failed.");
    } finally {
      if (mounted) setLoading(false);
    }
  }

  load();
  return () => { mounted = false; };
}, [rangeKey, token]);

  const aov = useMemo(() => {
    if (!summary?.revenueRangeTotal || !summary?.ordersRangeTotal || summary.ordersRangeTotal === 0) return null;
    return summary.revenueRangeTotal / summary.ordersRangeTotal;
  }, [summary]);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Business overview & quick insights</p>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">⚠ {err}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          note={range.label}
          value={
            loading
              ? "…"
              : summary?.revenueRangeTotal != null
              ? formatBaht(summary.revenueRangeTotal)
              : "None"
          }
        />
        <KpiCard
          label="Orders"
          note={range.label}
          value={loading ? "…" : summary?.ordersRangeTotal != null ? String(summary.ordersRangeTotal) : "None"}
        />
        <KpiCard
          label="Average Order Value"
          note={range.label}
          value={loading ? "…" : aov != null ? formatBaht(aov) : "None"}
        />
        <KpiCard
          label="Customers"
          note="All time"
          value={loading ? "…" : summary?.customersTotal != null ? String(summary.customersTotal) : "None"}
        />
      </div>

      {/* Trend + Category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <SectionHead title="Revenue Trend" subtitle={range.label} />
          <div className="mt-2 h-44">
            <Sparkline data={trend ?? []} />
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
                    style={{ width: `${barWidthPercent(c.value, byCategory)}%` }}
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
          <OrdersTable items={recentOrders ?? []} loading={loading} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <SectionHead title="Top Products" subtitle={range.label} />
            <div className="mt-2 space-y-2">
              {(topProducts ?? []).slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{(p.units ?? 0)} units</div>
                  </div>
                  <div className="text-sm font-medium">
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

            {/* empty state */}
            {(!lowStock || lowStock.length === 0) ? (
            <EmptyHint text="All stocks are healthy" />
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {lowStock.map(i => (
                  <li key={i.id} className="flex items-center justify-between py-2">
                    <span className="truncate text-sm">{i.name}{i.sku ? ` • ${i.sku}` : ""}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1
                      ${i.stock <= 0 ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
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

function KpiCard({ label, value, note }: { label: string; value: string; note?: string }) {
  const isNone = value === "None";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${isNone ? "text-gray-400" : "text-gray-900"}`}>{value}</div>
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
  return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">{text}</div>;
}

/** mini sparkline chart (pure SVG, no libs) */
function Sparkline({ data }: { data: DailyPoint[] }) {
  if (!data.length) return <EmptyHint text="No data" />;

  const width = 700;
  const height = 160;
  const pad = 6;

  const xs = data.map((d, i) => i);
  const ys = data.map((d) => d.value);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const toX = (i: number) => pad + (i / Math.max(xs.length - 1, 1)) * (width - pad * 2);
  const toY = (v: number) => pad + (1 - (v - minY) / Math.max(maxY - minY, 1)) * (height - pad * 2);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(d.value).toFixed(2)}`)
    .join(" ");

  const last = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <rect x="0" y="0" width={width} height={height} className="fill-white" />
      {/* grid */}
      <line x1="0" y1={toY(minY)} x2={width} y2={toY(minY)} className="stroke-gray-100" />
      <line x1="0" y1={toY(maxY)} x2={width} y2={toY(maxY)} className="stroke-gray-100" />
      {/* area (light) */}
      <path
        d={`${path} L ${toX(xs.length - 1)} ${toY(minY)} L ${toX(0)} ${toY(minY)} Z`}
        className="fill-gray-100"
        opacity={0.6}
      />
      {/* line */}
      <path d={path} className="stroke-gray-900" fill="none" strokeWidth={2} />
      {/* last point */}
      <circle cx={toX(xs.length - 1)} cy={toY(last.value)} r={3.5} className="fill-gray-900" />
    </svg>
  );
}

function OrdersTable({ items, loading }: { items: OrderItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }
  if (!items.length) return <EmptyHint text="No recent orders" />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="px-3">Order</th>
            <th className="px-3">Customer</th>
            <th className="px-3">Total</th>
            <th className="px-3">Status</th>
            <th className="px-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="rounded-lg bg-white">
              <td className="px-3 py-2 font-medium text-gray-900">{o.code ?? `#${o.id.slice(-6)}`}</td>
              <td className="px-3 py-2 text-gray-700">{o.customerName ?? "-"}</td>
              <td className="px-3 py-2 font-medium">{formatBaht(o.total)}</td>
              <td className="px-3 py-2">
                <StatusPill status={o.status} />
              </td>
              <td className="px-3 py-2 text-gray-600">{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: OrderItem["status"] }) {
  const map = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    CANCELLED: "bg-gray-100 text-gray-700 ring-gray-200",
    REFUND: "bg-red-50 text-red-700 ring-red-200",
  } as const;
  // @ts-ignore
  const cls = map[status] || map.PENDING;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {status}
    </span>
  );
}

/* ---------- Utils ---------- */
function formatBaht(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" })
    .format(Number.isFinite(n) ? n : 0);
}

function barWidthPercent(value: number, arr?: CategoryBreakdown[] | null) {
  if (!arr?.length) return 0;
  const max = Math.max(...arr.map((a) => a.value), 1);
  return Math.round((value / max) * 100);
}

/** สร้างข้อมูลปลอมสำหรับกราฟ เมื่อ BE ยังไม่พร้อม */
function genFakeTrend(key: RangeKey): DailyPoint[] {
  const len = key === "today" ? 1 : key === "7d" ? 7 : key === "30d" ? 30 : daysSinceJan1();
  const out: DailyPoint[] = [];
  const today = new Date();
  let base = 10000 + Math.random() * 15000;
  for (let i = len - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = (Math.sin((i / 3) * Math.PI) + Math.random() - 0.4) * 2500;
    base = Math.max(2000, base + noise);
    out.push({ date: d.toISOString().slice(0, 10), value: Math.round(base) });
  }
  return out;
}
function daysSinceJan1() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((+now - +start) / (1000 * 60 * 60 * 24)) + 1;
}
