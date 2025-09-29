// src/app/admin/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import "./customers.css";
import ActionsMenu from "./actionmenu";

type Customer = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  lastActive: string | null; // ISO string (จาก BE: Instant)
};

type SortKey = "name" | "email" | "roles" | "status" | "lastActive";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | "User" | "Admin">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // TODO: ดึง token แอดมินจาก context/ที่คุณมีอยู่
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://localhost:8080/api/customers", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch customers (${res.status})`);
        }
        const data: Customer[] = await res.json();
        setCustomers(data);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch customers");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [token]);

  const filtered = useMemo(() => {
    return customers
      .filter(c => {
        if (roleFilter === "Admin") return c.roles?.some(r => r.toUpperCase() === "ADMIN");
        if (roleFilter === "User") return !c.roles?.some(r => r.toUpperCase() === "ADMIN");
        return true;
      })
      .filter(c => {
        if (statusFilter === "Active") return c.active === true;
        if (statusFilter === "Inactive") return c.active === false;
        return true;
      })
      .filter(c =>
        (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [customers, search, roleFilter, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="cust-wrap">
      <div className="cust-header">
        <h1>Customers</h1>
        <div className="cust-filters">
          <input
            className="cust-search"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="cust-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
          >
            <option>All</option>
            <option>User</option>
            <option>Admin</option>
          </select>

          <select
            className="cust-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>

          <button
            className="cust-reset"
            onClick={() => {
              setSearch("");
              setRoleFilter("All");
              setStatusFilter("All");
              setSortKey("name");
              setSortAsc(true);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {error && <p className="cust-error">{error}</p>}
      {loading ? (
        <div className="cust-loading">Loading...</div>
      ) : (
        <div className="cust-table-wrap">
          <table className="cust-table">
            <thead>
              <tr>
                <Th sortable onClick={() => toggleSort("name")} active={sortKey === "name"} asc={sortAsc}>Name</Th>
                <Th sortable onClick={() => toggleSort("email")} active={sortKey === "email"} asc={sortAsc}>Email</Th>
                <Th sortable onClick={() => toggleSort("roles")} active={sortKey === "roles"} asc={sortAsc}>Roles</Th>
                <Th sortable onClick={() => toggleSort("status")} active={sortKey === "status"} asc={sortAsc}>Status</Th>
                <Th sortable onClick={() => toggleSort("lastActive")} active={sortKey === "lastActive"} asc={sortAsc}>Last Active</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td className="cust-empty" colSpan={6}>No customers found.</td></tr>
              )}
              {sorted.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>
                    {c.roles?.map((r, i) => (
                      <span key={i} className={`role-badge ${r.toUpperCase()==="ADMIN"?"admin":"user"}`}>
                        {r.toUpperCase()==="ADMIN" ? "Admin" : "User"}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`status-badge ${c.active ? "active" : "inactive"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{formatLastActive(c.lastActive)}</td>
                  <td>
                    <ActionsMenu
                      customerId={c.id}
                      token={token} // token ที่คุณดึงจาก localStorage/context
                      onDeleted={(id) => setCustomers(prev => prev.filter(x => x.id !== id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getSortValue(c: any, key: SortKey): string | number {
  switch (key) {
    case "name": return c.name || "";
    case "email": return c.email || "";
    case "roles": return (c.roles && c.roles.join(",")) || "";
    case "status": return c.active ? 1 : 0;
    case "lastActive": return c.lastActive ? new Date(c.lastActive).getTime() : 0;
    default: return "";
  }
}

function formatLastActive(iso: string | null) {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins>1?"s":""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours>1?"s":""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days>1?"s":""} ago`;
}

function Th({
  children, sortable=false, onClick, active, asc
}: {children:React.ReactNode; sortable?:boolean; onClick?:()=>void; active?:boolean; asc?:boolean}) {
  return (
    <th className={`th ${sortable?"sortable":""}`} onClick={onClick}>
      <span>{children}</span>
      {sortable && (
        <span className={`arrow ${active?"on":""}`}>{active ? (asc ? "▲" : "▼") : "▲"}</span>
      )}
    </th>
  );
}
