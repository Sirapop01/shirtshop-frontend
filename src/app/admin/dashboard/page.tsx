// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";

type RevenueResp = { revenue: number; currency?: string };
type SalesResp = { totalSales: number };
type Customer = { id: string };

const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
});

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<number>(0);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [customersTotal, setCustomersTotal] = useState<number>(0);
  const [error, setError] = useState<string>("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      try {
        // ---- Revenue (ปรับ endpoint ให้ตรงกับ BE ของคุณได้) ----
        // คาดหวังผลลัพธ์ { revenue: number, currency?: string }
        const revRes = await fetch(
          "http://localhost:8080/api/reports/revenue?range=today",
          { headers, cache: "no-store" }
        ).catch(() => undefined);

        if (revRes?.ok) {
          const r: RevenueResp = await revRes.json();
          if (mounted) setRevenue(r?.revenue ?? 0);
        } else {
          if (mounted) setRevenue(0);
        }

        // ---- Total sales (จำนวนออเดอร์ขายรวมวันนี้/ช่วงที่กำหนด) ----
        // คาดหวังผลลัพธ์ { totalSales: number }
        const salesRes = await fetch(
          "http://localhost:8080/api/reports/total-sales?range=today",
          { headers, cache: "no-store" }
        ).catch(() => undefined);

        if (salesRes?.ok) {
          const s: SalesResp = await salesRes.json();
          if (mounted) setTotalSales(s?.totalSales ?? 0);
        } else {
          if (mounted) setTotalSales(0);
        }

        // ---- Customers (นับจาก /api/customers) ----
        const cusRes = await fetch("http://localhost:8080/api/customers", {
          headers,
          cache: "no-store",
        }).catch(() => undefined);

        if (cusRes?.ok) {
          const list: Customer[] = await cusRes.json();
          if (mounted) setCustomersTotal(list?.length ?? 0);
        } else {
          if (mounted) setCustomersTotal(0);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const revenueText = useMemo(() => THB.format(revenue || 0), [revenue]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Revenue"
          value={loading ? "…" : revenueText}
          subtitle="Today"
        />
        <StatCard
          title="Total Sales"
          value={loading ? "…" : totalSales.toLocaleString()}
          subtitle="Today"
        />
        <StatCard
          title="Customers Total"
          value={loading ? "…" : customersTotal.toLocaleString()}
          subtitle="All time"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-xs text-gray-400">{subtitle}</div>
      ) : null}
    </div>
  );
}
