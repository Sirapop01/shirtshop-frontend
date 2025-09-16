"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

type ImageInfo = { publicId: string; url: string };

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQuantity?: number;        // BE ใหม่จะมี sum รวม
  variantStocks?: { color: string; size: string; quantity: number }[]; // เผื่ออยากใช้ต่อ
  images?: ImageInfo[];          // BE ใหม่
  imageUrls?: string[];          // BE เก่า (ยัง fallback ได้)
  createdAt?: string;
}

type SortKey = "name" | "category" | "price" | "stock";

const THB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export default function AdminProductsPage() {
  const { user, isAdmin, authLoading, token } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // auth gate
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      router.replace("/admin/login");
      return;
    }
    setPageLoading(false);
  }, [authLoading, user, isAdmin, router]);

  // fetch products
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setFetchError("");
    try {
      const res = await fetch("http://localhost:8080/api/products", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setFetchError(`Failed to fetch products (${res.status})`);
        return;
      }
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to fetch products");
    }
  }, [token]);

  useEffect(() => {
    if (pageLoading || !isAdmin) return;
    void fetchProducts();
  }, [pageLoading, isAdmin, fetchProducts]);

  // image helper
  const coverImage = (p: Product) =>
    p.images?.[0]?.url ?? p.imageUrls?.[0] ?? "/placeholder.png";

  // unique categories
  const uniqueCategories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category || "Uncategorized")))],
    [products]
  );

  // filter
  const filtered = useMemo(() => {
    return products
      .filter((p) => selectedCategory === "All" || p.category === selectedCategory)
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, selectedCategory, searchTerm]);

  // sort
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

  // delete
  const handleDelete = async (id: string) => {
    if (!token) return;
    const confirmMsg = "แน่ใจหรือไม่ว่าต้องการลบสินค้า? การลบนี้ไม่สามารถย้อนกลับได้.";
    if (!window.confirm(confirmMsg)) return;
    try {
      setDeletingId(id);
      const res = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Failed to delete (${res.status})`);
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const stockBadge = (qty: number | undefined) => {
    const n = qty ?? 0;
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
    if (n <= 0) return <span className={`${base} bg-red-100 text-red-700`}>Out of stock</span>;
    if (n <= 5) return <span className={`${base} bg-yellow-100 text-yellow-800`}>Low: {n}</span>;
    return <span className={`${base} bg-green-100 text-green-800`}>{n}</span>;
  };

  if (authLoading || pageLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Product
        </Link>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full lg:w-1/3 p-2 border rounded-md"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full lg:w-60 p-2 border rounded-md bg-white"
        >
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory("All");
            setSortKey("name");
            setSortAsc(true);
          }}
          className="w-full lg:w-auto px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Reset
        </button>

        <div className="flex-1" />
        {fetchError && <p className="text-red-600 text-sm">{fetchError}</p>}
      </div>

      {/* ตารางสินค้า */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Image</Th>
              <Th sortable onClick={() => toggleSort("name")} active={sortKey === "name"} asc={sortAsc}>
                Name
              </Th>
              <Th
                sortable
                onClick={() => toggleSort("category")}
                active={sortKey === "category"}
                asc={sortAsc}
              >
                Category
              </Th>
              <Th sortable onClick={() => toggleSort("price")} active={sortKey === "price"} asc={sortAsc}>
                Price
              </Th>
              <Th sortable onClick={() => toggleSort("stock")} active={sortKey === "stock"} asc={sortAsc}>
                Stock
              </Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="h-12 w-12 relative rounded-md overflow-hidden bg-gray-100">
                    <Image
                      src={coverImage(product)}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                  {product.name}
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {product.category}
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {THB.format(product.price ?? 0)}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  {stockBadge(product.stockQuantity)}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/products/edit/${product.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-60"
                    >
                      {deletingId === product.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* หมายเหตุเล็ก ๆ */}
      <p className="text-xs text-gray-500 mt-3">
        * Stock คือยอดรวมทุกสี/ไซส์ ถ้าอยากดูรายสี/ไซส์ให้เข้าหน้า Edit
      </p>
    </div>
  );
}

/** Small TH component for sortable headers */
function Th({
  children,
  sortable = false,
  onClick,
  active,
  asc,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
  active?: boolean;
  asc?: boolean;
}) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
        sortable ? "text-gray-600 cursor-pointer select-none" : "text-gray-500"
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
