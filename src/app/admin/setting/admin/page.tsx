"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/* ===== Types (เหมือนหน้า Customers) ===== */
type AdminItem = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  lastActive?: string | null;
};

/* ===== Page ===== */
export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [q, setQ] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const withAuth = (headers: HeadersInit = {}) => ({
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        // ✅ ดึงเฉพาะ ADMIN จาก BE
        const res = await fetch(
          "http://localhost:8080/api/customers?role=ADMIN",
          { headers: withAuth(), cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Failed to load admins (${res.status})`);
        const json: AdminItem[] = await res.json();

        // กันพลาด: ถ้า BE ยังไม่กรองให้
        const adminsOnly = (json ?? []).filter(
          (u) => Array.isArray(u.roles) && u.roles.includes("ADMIN")
        );
        setItems(adminsOnly);
      } catch (e: any) {
        setErr(e?.message || "Failed to load admins");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (x) =>
        x.name?.toLowerCase().includes(s) ||
        x.email?.toLowerCase().includes(s) ||
        "admin".includes(s) // เผื่อค้นหาคำว่า admin
    );
  }, [items, q]);

  /* ===== Kebab menu (เหมือนหน้า Customers) ===== */
  const [openId, setOpenId] = useState<string | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (tbodyRef.current && !tbodyRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onDelete = async (user: AdminItem) => {
    const ok = window.confirm(`Delete "${user.name || user.email}" ?`);
    if (!ok) return;
    try {
      const res = await fetch(`http://localhost:8080/api/customers/${user.id}`, {
        method: "DELETE",
        headers: withAuth(),
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setItems((prev) => prev.filter((x) => x.id !== user.id));
      setOpenId(null);
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header เหมือน Customers */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin users</h1>
        <p className="text-sm text-gray-500">Only accounts with admin role</p>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            ⌘K
          </span>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {/* Table เหมือนหน้า Customers */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody ref={tbodyRef}>
            {/* skeleton */}
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-4" colSpan={6}>
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No admins found
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge roles={u.roles} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={u.active} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {u.lastActive ? new Date(u.lastActive).toLocaleString() : "-"}
                  </td>

                  {/* Action: ปุ่ม 3 จุด + เมนู เหมือน Customers และ “ชิดขอบขวา” */}
                  <td className="relative px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setOpenId((prev) => (prev === u.id ? null : u.id))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none"
                        aria-haspopup="menu"
                        aria-expanded={openId === u.id}
                      >
                        ⋮
                      </button>
                    </div>

                    {openId === u.id && (
                      <div className="absolute right-4 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                        <Link
                          href={`/admin/customers/${u.id}`}
                          className="block px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setOpenId(null)}
                        >
                          View profile
                        </Link>
                        <button
                          onClick={() => onDelete(u)}
                          className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete user
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="text-xs text-gray-500">
          Showing <span className="font-medium">{filtered.length}</span> of{" "}
          <span className="font-medium">{items.length}</span> admins
        </div>
      )}
    </div>
  );
}

/* ===== UI helpers (เหมือนหน้า Customers) ===== */

function RoleBadge({ roles }: { roles: string[] }) {
  const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");
  const base =
    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold";
  return isAdmin ? (
    <span className={`${base} border-red-200 bg-red-50 text-red-700`}>ADMIN</span>
  ) : (
    <span className={`${base} border-blue-200 bg-blue-50 text-blue-700`}>USER</span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  const cls = active
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
