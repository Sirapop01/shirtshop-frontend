// src/app/admin/customers/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import axios, { AxiosError } from "axios";

// SweetAlert2
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

/* ---- Toast & Confirm helpers ---- */
function toastSuccess(text: string) {
  MySwal.fire({
    icon: "success",
    title: text,
    timer: 1400,
    showConfirmButton: false,
    position: "top-end",
    toast: true,
  });
}
function toastError(text: string) {
  MySwal.fire({
    icon: "error",
    title: text,
    timer: 2000,
    showConfirmButton: false,
    position: "top-end",
    toast: true,
  });
}
async function confirmAction({
  title,
  text,
  confirmText = "ลบเลย",
  confirmColor = "#dc2626",
  icon = "warning",
}: {
  title: string;
  text?: string;
  confirmText?: string;
  confirmColor?: string;
  icon?: "warning" | "question" | "info" | "success" | "error";
}) {
  const res = await MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "ยกเลิก",
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: confirmColor,
  });
  return res.isConfirmed;
}

type CustomerItem = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  lastActive?: string | null;
};

export default function CustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get<CustomerItem[]>("/api/customers", {
        headers: { "Cache-Control": "no-cache" },
      });
      setItems(res.data ?? []);
    } catch (e: unknown) {
      let msg = "Failed to load customers";
      if (axios.isAxiosError(e)) {
        const ax = e as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      setErr(String(msg));
      toastError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (x) =>
        x.name?.toLowerCase().includes(s) ||
        x.email?.toLowerCase().includes(s) ||
        x.roles?.some((r) => r.toLowerCase().includes(s))
    );
  }, [items, q]);

  // --- Action menu ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableSectionElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onDelete = async (user: CustomerItem) => {
    const ok = await confirmAction({
      title: `ลบผู้ใช้ "${user.name || user.email}" ?`,
      text: "การลบไม่สามารถย้อนกลับได้",
      confirmText: "ลบผู้ใช้",
      confirmColor: "#dc2626",
      icon: "warning",
    });
    if (!ok) return;

    try {
      // ❌ ห้าม await ตรงนี้
      MySwal.fire({
        title: "กำลังลบ...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading(); // หรือ MySwal.showLoading() ก็ได้
        },
        showConfirmButton: false,
      });

      // ยิง API ได้ทันที
      const res = await api.delete(`/api/customers/${user.id}`);
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Delete failed (${res.status})`);
      }

      setItems((prev) => prev.filter((x) => x.id !== user.id));
      setOpenMenuId(null);

      toastSuccess("ลบผู้ใช้เรียบร้อย");
    } catch (e: unknown) {
      let msg = "Delete failed";
      if (axios.isAxiosError(e)) {
        const ax = e as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      toastError(msg);
    } finally {
      Swal.close(); // ปิดโหลดไม่ว่าผลจะสำเร็จหรือพลาด
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">All registered users</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, role…"
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

          {/* ใช้ ref เพื่อจับคลิกนอกเมนู */}
          <tbody ref={menuRef}>
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
                  No customers found
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
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {u.lastActive ? new Date(u.lastActive).toLocaleString() : "-"}
                  </td>

                  {/* ✅ คอลัมน์ Action: จัดชิดขวา + ปุ่มกึ่งกลางแนวตั้ง */}
                  <td className="relative px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === u.id ? null : u.id))
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === u.id}
                      >
                        ⋮
                      </button>
                    </div>

                    {/* ✅ เมนูชิดขวาตรงปุ่ม */}
                    {openMenuId === u.id && (
                      <div className="absolute right-4 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                        <Link
                          href={`/admin/customers/${u.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <span className="whitespace-nowrap">View profile</span>
                        </Link>
                        <button
                          onClick={() => onDelete(u)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <span className="whitespace-nowrap">Delete user</span>
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
          <span className="font-medium">{items.length}</span> customers
        </div>
      )}
    </div>
  );
}

/* -------- UI helpers -------- */

function RoleBadge({ roles }: { roles: string[] }) {
  const isAdmin = roles?.includes("ADMIN");
  const cls = isAdmin
    ? "bg-red-50 text-red-700 border-red-300"
    : "bg-blue-50 text-blue-700 border-blue-300";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {isAdmin ? "ADMIN" : "USER"}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  const cls = active
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
