// src/app/(admin)/products/new/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

// รายการสีและไซส์ทั้งหมดที่มีในร้าน
const ALL_AVAILABLE_COLORS = [
  "Black",
  "White",
  "Grey",
  "Navy",
  "Olive Green",
  "Charcoal",
  "Cream",
  "Dusty Blue",
  "Maroon",
  "Beige",
  "Dark Grey",
] as const;
const ALL_AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL"] as const;

/** Types ให้ตรงกับสเปค BE ล่าสุด */
type VariantStock = {
  color: string;
  size: string;
  quantity: number;
};

type ProductRequest = {
  name: string;
  description: string;
  price: number;
  category: string;
  availableColors: string[];
  availableSizes: string[];
  stockQuantity: number; // จะคำนวณจาก variantStocks
  variantStocks: VariantStock[];
};

// helper: ป้องกัน res.json() พัง
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** สร้าง/อัปเดต matrix (Map สี -> Map ไซส์ -> จำนวน) */
function buildMatrix(colors: string[], sizes: string[]) {
  const map = new Map<string, Map<string, number>>();
  colors.forEach((c) => {
    const row = new Map<string, number>();
    sizes.forEach((s) => row.set(s, 0));
    map.set(c, row);
  });
  return map;
}
function matrixToVariants(matrix: Map<string, Map<string, number>>): VariantStock[] {
  const out: VariantStock[] = [];
  for (const [color, row] of matrix.entries()) {
    for (const [size, qty] of row.entries()) {
      out.push({ color, size, quantity: Math.max(0, Number(qty) || 0) });
    }
  }
  return out;
}

export default function NewProductPage() {
  const { isAdmin, token, user } = useAuth();
  const router = useRouter();

  // Loading / Guard
  const [isLoading, setIsLoading] = useState(true);

  // ฟอร์มข้อมูลสินค้า
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("T-Shirts");

  // ใช้ availableColors/Sizes + stockMatrix
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockMatrix, setStockMatrix] = useState<Map<string, Map<string, number>>>(
    () => buildMatrix([], [])
  );

  // ✅ เก็บรูปเป็น Array เพื่อ append ได้หลายรอบ
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // แสดงผลลัพธ์
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ป้องกันหน้า (Protected)
  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
      if (!isAdmin) {
        alert("Access Denied. You are not an administrator.");
        router.push("/admin/login");
      }
    }
  }, [isAdmin, user, router]);

  // สร้าง/ล้าง URL ของรูปภาพตัวอย่างจาก images[]
  useEffect(() => {
    if (!images || images.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = images.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  // sync matrix เมื่อเลือกสี/ไซส์ใหม่
  useEffect(() => {
    setStockMatrix((prev) => {
      const prevVariants = matrixToVariants(prev);
      const next = buildMatrix(selectedColors, selectedSizes);
      prevVariants.forEach(({ color, size, quantity }) => {
        if (next.has(color) && next.get(color)!.has(size)) {
          next.get(color)!.set(size, quantity);
        }
      });
      return next;
    });
  }, [selectedColors, selectedSizes]);

  const handleColorChange = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const handleSizeChange = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleQtyChange = (color: string, size: string, val: string) => {
    const n = Math.max(0, Number(val) || 0);
    setStockMatrix((prev) => {
      const next = new Map(prev);
      const row = new Map(next.get(color) ?? new Map<string, number>());
      row.set(size, n);
      next.set(color, row);
      return next;
    });
  };

  // ✅ เพิ่มรูปทีละหลาย ๆ ครั้ง + กันซ้ำ + จำกัด type/size/จำนวน
  const MAX_FILES = 10; // ปรับได้
  const MAX_SIZE_MB = 5; // จำกัดขนาดไฟล์ (MB) ต่อรูป
  const ALLOW_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    // กรองชนิด/ขนาด
    const valid = picked.filter((f) => {
      const okType = ALLOW_TYPES.includes(f.type);
      const okSize = f.size <= MAX_SIZE_MB * 1024 * 1024;
      return okType && okSize;
    });

    setImages((prev) => {
      const merged = [...prev, ...valid];
      // กันซ้ำด้วย key
      const seen = new Set<string>();
      const unique = merged.filter((f) => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return unique.slice(0, MAX_FILES);
    });

    // ล้างค่า input เพื่อให้เลือกไฟล์ชื่อเดิมซ้ำได้อีกในอนาคต
    e.target.value = "";
  };

  const removeImageAt = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // totals
  const totalByColor = useMemo(() => {
    const t: Record<string, number> = {};
    for (const [color, row] of stockMatrix.entries()) {
      t[color] = 0;
      for (const qty of row.values()) t[color] += Number(qty) || 0;
    }
    return t;
  }, [stockMatrix]);

  const totalBySize = useMemo(() => {
    const t: Record<string, number> = {};
    selectedSizes.forEach((s) => (t[s] = 0));
    for (const [, row] of stockMatrix.entries()) {
      for (const [size, qty] of row.entries()) {
        t[size] = (t[size] || 0) + (Number(qty) || 0);
      }
    }
    return t;
  }, [stockMatrix, selectedSizes]);

  const grandTotal = useMemo(
    () => Object.values(totalByColor).reduce((a, b) => a + b, 0),
    [totalByColor]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!token) {
      setError("Authentication error. Please login again.");
      return;
    }

    if (!name.trim()) {
      setError("Please provide product name.");
      return;
    }
    if (!price || Number.isNaN(parseFloat(price))) {
      setError("Please provide a valid price.");
      return;
    }
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      setError("Please select at least one color and one size.");
      return;
    }

    setIsSubmitting(true);

    // สร้าง variantStocks จาก matrix
    const variants = matrixToVariants(stockMatrix);
    const productData: ProductRequest = {
      name,
      description,
      price: parseFloat(price),
      category,
      availableColors: selectedColors,
      availableSizes: selectedSizes,
      stockQuantity: variants.reduce((a, v) => a + (Number(v.quantity) || 0), 0),
      variantStocks: variants,
    };

    const formData = new FormData();
    formData.append(
      "product",
      new Blob([JSON.stringify(productData)], { type: "application/json" })
    );

    // ✅ ใส่รูปทั้งหมด
    images.forEach((file) => formData.append("images", file));

    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await safeJson(res);
        throw new Error(errorData?.message || `Error: ${res.statusText}`);
      }

      setSuccessMessage("Product created successfully!");

      // เคลียร์ฟอร์ม
      setName("");
      setDescription("");
      setPrice("");
      setCategory("T-Shirts");
      setSelectedColors([]);
      setSelectedSizes([]);
      setStockMatrix(buildMatrix([], []));
      setImages([]);
      setImagePreviews([]);
    } catch (err: any) {
      setError(`Failed to create product: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Add New Product</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Shop
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 bg-white rounded-lg shadow-md space-y-8"
        >
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-gray-700 font-medium mb-1">
                Price (THB)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="10"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-medium mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded-md bg-white"
              >
                <option value="T-Shirts">T-Shirts</option>
                <option value="Graphic Tees">Graphic Tees</option>
                <option value="Polo">Polo</option>
                <option value="Long Sleeves">Long Sleeves</option>
                <option value="New Arrival">New Arrival</option>
              </select>
            </div>
          </div>

          {/* Available Colors / Sizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Available Colors
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {ALL_AVAILABLE_COLORS.map((color) => (
                  <label
                    key={color}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(color)}
                      onChange={() => handleColorChange(color)}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span>{color}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Available Sizes
              </label>
              <div className="grid grid-cols-5 gap-3 mt-2">
                {ALL_AVAILABLE_SIZES.map((size) => (
                  <label
                    key={size}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSizes.includes(size)}
                      onChange={() => handleSizeChange(size)}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ตารางคงคลัง: สี × ไซส์ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-700 font-bold">
                Stock by Color × Size
              </label>
              <div className="text-sm text-gray-600">
                Total:{" "}
                <span className="font-semibold">{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full overflow-auto">
              <table className="min-w-[600px] w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Color \\ Size</th>
                    {selectedSizes.map((s) => (
                      <th key={s} className="p-2 border text-center">
                        {s}
                      </th>
                    ))}
                    <th className="p-2 border text-center">Row Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedColors.map((c) => (
                    <tr key={c} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border font-medium">{c}</td>
                      {selectedSizes.map((s) => (
                        <td key={s} className="p-2 border">
                          <input
                            type="number"
                            min={0}
                            value={stockMatrix.get(c)?.get(s) ?? 0}
                            onChange={(e) => handleQtyChange(c, s, e.target.value)}
                            className="w-20 p-1 border rounded-md"
                          />
                        </td>
                      ))}
                      <td className="p-2 border text-center font-medium">
                        {totalByColor[c]?.toLocaleString() ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-right">Col Total</th>
                    {selectedSizes.map((s) => (
                      <th key={s} className="p-2 border text-center">
                        {totalBySize[s]?.toLocaleString() ?? 0}
                      </th>
                    ))}
                    <th className="p-2 border text-center">
                      {grandTotal.toLocaleString()}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* รูปสินค้า */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Product Images
            </label>
            <input
              type="file"
              onChange={handleImageChange}
              multiple
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
            />
            <p className="mt-1 text-xs text-gray-500">
              รองรับ: JPEG/PNG/WebP, สูงสุด {MAX_FILES} รูป, ไฟล์ละไม่เกิน {MAX_SIZE_MB}MB
            </p>
          </div>

          {imagePreviews.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Image Preview
              </label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {imagePreviews.map((previewUrl, index) => (
                  <div
                    key={index}
                    className="relative w-full aspect-square rounded-lg overflow-hidden border"
                  >
                    <Image
                      src={previewUrl}
                      alt={`Preview ${index + 1}`}
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded"
                      aria-label="Remove image"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            {successMessage && (
              <p className="mb-4 text-center text-green-600 bg-green-50 p-3 rounded-md">
                {successMessage}
              </p>
            )}
            {error && (
              <p className="mb-4 text-center text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
