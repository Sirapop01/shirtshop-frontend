"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

/* ---------------- Types ---------------- */
type ImageInfo = { publicId: string; url: string };

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQuantity?: number; // BE รวมยอดสต็อกทั้งหมด
  variantStocks?: { color: string; size: string; quantity: number }[];
  images?: ImageInfo[];
  imageUrls?: string[]; // fallback
  createdAt?: string;
}

type SortKey = "name" | "category" | "price" | "stock";

/* ---------------- Utils ---------------- */
const THB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });
const coverImage = (p: Product) => p.images?.[0]?.url ?? p.imageUrls?.[0] ?? "/placeholder.png";

/* ============================================================ */

export default function AdminProductsPage() {
  const { user, isAdmin, authLoading, token } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string>("");

  // UI state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");

  /* ------------ Auth gate ------------ */
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      router.replace("/admin/login");
      return;
    }
    setPageLoading(false);
  }, [authLoading, user, isAdmin, router]);

  /* ------------ Fetch products ------------ */
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setFetchError("");
    try {
      const res = await fetch("http://localhost:8080/api/products", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) {
        setFetchError(`Failed to fetch products (${res.status})`);
        return;
      }
      const data: Product[] = await res.json();
      setProducts(data ?? []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to fetch products");
    }
  }, [token]);

  useEffect(() => {
    if (pageLoading || !isAdmin) return;
    void fetchProducts();
  }, [pageLoading, isAdmin, fetchProducts]);

  /* ------------ Derived states ------------ */
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category || "Uncategorized")))],
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (category === "All" ? true : p.category === category))
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)));
  }, [products, category, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") {
        av = a.name || "";
        bv = b.name || "";
      } else if (sortKey === "category") {
        av = a.category || "";
        bv = b.category || "";
      } else if (sortKey === "price") {
        av = a.price ?? 0;
        bv = b.price ?? 0;
      } else if (sortKey === "stock") {
        av = a.stockQuantity ?? 0;
        bv = b.stockQuantity ?? 0;
      }
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
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  /* ------------ Delete ------------ */
  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("แน่ใจหรือไม่ว่าต้องการลบสินค้า? การลบนี้ไม่สามารถย้อนกลับได้.")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------ UI bits ------------ */
  const stockBadge = (qty?: number) => {
    const n = qty ?? 0;
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1";
    if (n <= 0) return <span className={`${base} bg-red-50 text-red-700 ring-red-200`}>Out of stock</span>;
    if (n <= 5) return <span className={`${base} bg-amber-50 text-amber-700 ring-amber-200`}>Low: {n}</span>;
    return <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200`}>{n}</span>;
  };


  /* ------------ Loading / Empty ------------ */
  if (authLoading || pageLoading) {
    return (
      <div className="p-6 space-y-6">
        <ToolbarSkeleton />
        <CardsRowSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          + Add Product
        </Link>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total items" value={String(products.length)} />
        <KpiCard
          label="In stock"
          value={String(products.filter((p) => (p.stockQuantity ?? 0) > 0).length)}
        />
        <KpiCard
          label="Low stock (≤5)"
          value={String(products.filter((p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 5).length)}
        />
        <KpiCard
          label="Out of stock"
          value={String(products.filter((p) => (p.stockQuantity ?? 0) <= 0).length)}
        />
      </div>

      {/* Toolbar */}
      <div className="items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or category…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              ⌘K
            </span>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort("name")}
              className={btnSortCls(sortKey === "name")}
              title="Sort by name"
            >
              Name {sortKey === "name" ? (sortAsc ? "▲" : "▼") : ""}
            </button>
            <button
              onClick={() => toggleSort("price")}
              className={btnSortCls(sortKey === "price")}
              title="Sort by price"
            >
              Price {sortKey === "price" ? (sortAsc ? "▲" : "▼") : ""}
            </button>
            <button
              onClick={() => toggleSort("stock")}
              className={btnSortCls(sortKey === "stock")}
              title="Sort by stock"
            >
              Stock {sortKey === "stock" ? (sortAsc ? "▲" : "▼") : ""}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 md:mt-0">
          <button
            onClick={() => setView("table")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              view === "table" ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setView("grid")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              view === "grid" ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            Grid
          </button>

          <button
            onClick={() => {
              setQuery("");
              setCategory("All");
              setSortKey("name");
              setSortAsc(true);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Views */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((p) => (
            <div key={p.id} className="group rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gray-100">
                <Image src={coverImage(p)} alt={p.name} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="mt-3 space-y-1">
                <div className="truncate text-sm font-medium text-gray-900">{p.name}</div>
                <div className="truncate text-xs text-gray-500">{p.category}</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{THB.format(p.price ?? 0)}</div>
                  {stockBadge(p.stockQuantity)}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Link
                  href={`/admin/products/edit/${p.id}`}
                  className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  disabled={deletingId === p.id}
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <Empty />}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
                <Th>Image</Th>
                <Th sortable onClick={() => toggleSort("name")} active={sortKey === "name"} asc={sortAsc}>
                  Name
                </Th>
                <Th sortable onClick={() => toggleSort("category")} active={sortKey === "category"} asc={sortAsc}>
                  Category
                </Th>
                <Th sortable onClick={() => toggleSort("price")} active={sortKey === "price"} asc={sortAsc}>
                  Price
                </Th>
                <Th sortable onClick={() => toggleSort("stock")} active={sortKey === "stock"} asc={sortAsc}>
                  Stock
                </Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                      <Image src={coverImage(p)} alt={p.name} fill sizes="48px" className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3">{THB.format(p.price ?? 0)}</td>
                  <td className="px-4 py-3">{stockBadge(p.stockQuantity)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/edit/${p.id}`}
                        className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <Empty />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* Footnote */}
      <p className="text-xs text-gray-500">
        * Stock คือยอดรวมทุกสี/ไซส์ — รายละเอียดสต็อกย่อยดูในหน้า Edit
      </p>
    </div>
  );
}

/* ---------------- Small UI components ---------------- */

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-40 w-full items-center justify-center text-sm text-gray-500">
      No products found.
    </div>
  );
}

function Th({
  children,
  sortable = false,
  onClick,
  active,
  asc,
  className = "",
}: {
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
  active?: boolean;
  asc?: boolean;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${className} ${
        sortable ? "cursor-pointer text-gray-600" : "text-gray-500"
      }`}
      onClick={onClick}
    >
      <div className="inline-flex items-center gap-1">
        <span>{children}</span>
        {sortable && (
          <span className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>
            {active ? (asc ? "▲" : "▼") : "▲"}
          </span>
        )}
      </div>
    </th>
  );
}

function btnSortCls(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm ${
    active ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
  }`;
}

/* ---------------- Skeletons ---------------- */

function ToolbarSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-80 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-9 w-40 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-9 w-24 animate-pulse rounded-xl bg-gray-100 ml-auto" />
        <div className="h-9 w-24 animate-pulse rounded-xl bg-gray-100" />
      </div>
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

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse border-b border-gray-100 bg-gray-50 last:border-0" />
      ))}
    </div>
  );
}
