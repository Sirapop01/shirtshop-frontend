// src/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import "./dashboard.css";

type SummaryDTO = {
  revenueToday?: number | null;
  totalSalesToday?: number | null;
  customersTotal?: number | null;
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<SummaryDTO>({
    revenueToday: null,
    totalSalesToday: null,
    customersTotal: null,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");

      // helper
      const withAuth = (headers: HeadersInit = {}) => ({
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });

      try {
        // 1) พยายามเรียก /api/dashboard ก่อน
        const res = await fetch("http://localhost:8080/api/dashboard", {
          headers: withAuth(),
          cache: "no-store",
        });

        if (res.ok) {
          const data: SummaryDTO = await res.json();
          setSummary({
            revenueToday:
              typeof data.revenueToday === "number" ? data.revenueToday : null,
            totalSalesToday:
              typeof data.totalSalesToday === "number"
                ? data.totalSalesToday
                : null,
            customersTotal:
              typeof data.customersTotal === "number"
                ? data.customersTotal
                : null,
          });
        } else {
          // 2) ถ้า BE ยังไม่ทำ summary → ใส่ None ไว้ก่อน
          setSummary((s) => ({ ...s }));
        }

        // 3) Fallback สำหรับ customersTotal: ถ้าในข้อ 1) ไม่มีหรือเป็น null
        if (summary.customersTotal == null) {
          try {
            const rc = await fetch("http://localhost:8080/api/customers", {
              headers: withAuth(),
              cache: "no-store",
            });
            if (rc.ok) {
              const arr: any[] = await rc.json();
              setSummary((s) => ({ ...s, customersTotal: arr?.length ?? 0 }));
            }
          } catch {
            /* เงียบไว้ */
          }
        }
      } catch (e: any) {
        setErr(e?.message || "Load dashboard failed.");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="dash-wrap">
      <div className="dash-head">
        <h1>Dashboard</h1>
        <p className="dash-sub">Overview</p>
      </div>

      {err && <p className="dash-error">⚠ {err}</p>}

      <div className="dash-grid">
        <SummaryCard
          label="Revenue"
          note="Today"
          value={
            loading
              ? "…"
              : summary.revenueToday == null
              ? "None"
              : formatBaht(summary.revenueToday)
          }
          large
        />

        <SummaryCard
          label="Total Sales"
          note="Today"
          value={
            loading
              ? "…"
              : summary.totalSalesToday == null
              ? "None"
              : String(summary.totalSalesToday)
          }
        />

        <SummaryCard
          label="Customers Total"
          note="All time"
          value={
            loading
              ? "…"
              : summary.customersTotal == null
              ? "None"
              : String(summary.customersTotal)
          }
        />
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function SummaryCard({
  label,
  value,
  note,
  large = false,
}: {
  label: string;
  value: string;
  note?: string;
  large?: boolean;
}) {
  return (
    <div className={`kpi-card ${large ? "kpi-lg" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${value === "None" ? "kpi-none" : ""}`}>
        {value}
      </div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}

function formatBaht(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(n);
}
