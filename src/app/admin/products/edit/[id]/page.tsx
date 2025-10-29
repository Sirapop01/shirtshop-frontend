// src/app/admin/products/[id]/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import api from "@/lib/api";              // ✅ ใช้ axios instance (baseURL จาก NEXT_PUBLIC_API_BASE)
import axios, { AxiosError } from "axios";

/** --- ปรับตามร้านของคุณ --- */
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

/** --- Types (ให้ตรงกับ BE ใหม่) --- */
type ImageInfo = {
  publicId: string;
  url: string;
};

type VariantStock = {
  color: string;
  size: string;
  quantity: number;
};

type ProductResponse = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrls: string[]; // for backward display only
  images: ImageInfo[];
  availableColors: string[];
  availableSizes: string[];
  stockQuantity: number; // sum of variantStocks
  variantStocks: VariantStock[];
  createdAt: string;
};

type ProductRequest = {
  name: string;
  description: string;
  price: number;
  category: string;
  availableColors: string[];
  availableSizes: string[];
  stockQuantity: number; // server จะคำนวณใหม่จาก variantStocks
  variantStocks: VariantStock[];
};

/** ตาราง matrix สำหรับคงคลังสี×ไซส์ ใช้ Map 2 ชั้นเพื่อแก้ค่าง่าย */
function buildMatrix(
  colors: string[],
  sizes: string[],
  variants: VariantStock[] | undefined
) {
  const map = new Map<string, Map<string, number>>();
  colors.forEach((c) => {
    map.set(c, new Map<string, number>());
    sizes.forEach((s) => map.get(c)!.set(s, 0));
  });
  (variants ?? []).forEach(({ color, size, quantity }) => {
    if (!map.has(color)) map.set(color, new Map<string, number>());
    if (!map.get(color)!.has(size)) map.get(color)!.set(size, 0);
    map.get(color)!.set(size, quantity);
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

export default function EditProductPage() {
  const { isAdmin, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  /** state หลักแบบเดียวกับหน้า create */
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState("T-Shirts");

  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  /** matrix เก็บคงคลังต่อ color×size */
  const [stockMatrix, setStockMatrix] = useState<Map<string, Map<string, number>>>(
    () => buildMatrix([], [], [])
  );

  const [existingImages, setExistingImages] = useState<ImageInfo[]>([]);
  const [markedForRemoval, setMarkedForRemoval] = useState<Set<string>>(new Set());

  const [images, setImages] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /** ป้องกันหน้า + เริ่มโหลด */
  useEffect(() => {
    if (user !== undefined) {
      if (!isAdmin) {
        alert("Access Denied. You are not an administrator.");
        router.push("/admin/login");
        return;
      }
      void fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user]);

  /** โหลดสินค้า (axios + interceptor แนบ token ให้เอง) */
  const fetchProduct = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get<ProductResponse>(`/api/products/${productId}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = res.data;

      setName(data.name ?? "");
      setDescription(data.description ?? "");
      setPrice(
        data.price !== undefined && data.price !== null ? String(data.price) : ""
      );
      setCategory(data.category ?? "T-Shirts");

      const initColors = Array.isArray(data.availableColors)
        ? data.availableColors
        : [];
      const initSizes = Array.isArray(data.availableSizes)
        ? data.availableSizes
        : [];
      setAvailableColors(initColors);
      setAvailableSizes(initSizes);

      setStockMatrix(buildMatrix(initColors, initSizes, data.variantStocks));
      setExistingImages(Array.isArray(data.images) ? data.images : []);
    } catch (e: unknown) {
      let msg = "Unexpected error while loading product.";
      if (axios.isAxiosError(e)) {
        const ax = e as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /** previews ของภาพใหม่ */
  useEffect(() => {
    if (!images || images.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = Array.from(images).map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  /** เมื่อ toggles available colors/sizes ให้ sync matrix */
  useEffect(() => {
    setStockMatrix((prev) => {
      const next = buildMatrix(availableColors, availableSizes, matrixToVariants(prev));
      return next;
    });
  }, [availableColors, availableSizes]);

  /** totals */
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
    for (const size of availableSizes) t[size] = 0;
    for (const [, row] of stockMatrix.entries()) {
      for (const [size, qty] of row.entries()) {
        t[size] = (t[size] || 0) + (Number(qty) || 0);
      }
    }
    return t;
  }, [stockMatrix, availableSizes]);

  const grandTotal = useMemo(
    () => Object.values(totalByColor).reduce((a, b) => a + b, 0),
    [totalByColor]
  );

  /** handlers */
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImages(e.target.files);
  };

  const toggleRemoveExisting = (publicId: string) => {
    setMarkedForRemoval((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const toggleColor = (color: string) => {
    setAvailableColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleSize = (size: string) => {
    setAvailableSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const setQty = (color: string, size: string, value: string) => {
    const n = Math.max(0, Number(value) || 0);
    setStockMatrix((prev) => {
      const next = new Map(prev);
      const row = new Map(next.get(color) ?? new Map<string, number>());
      row.set(size, n);
      next.set(color, row);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!name.trim()) {
      setError("Please provide product name.");
      return;
    }
    if (!price || Number.isNaN(parseFloat(price))) {
      setError("Please provide a valid price.");
      return;
    }
    if (availableColors.length === 0 || availableSizes.length === 0) {
      setError("Please select at least one color and size.");
      return;
    }

    setIsSubmitting(true);
    try {
      const variants = matrixToVariants(stockMatrix);
      const payload: ProductRequest = {
        name,
        description,
        price: parseFloat(price),
        category,
        availableColors,
        availableSizes,
        stockQuantity: variants.reduce((a, v) => a + (Number(v.quantity) || 0), 0),
        variantStocks: variants,
      };

      const formData = new FormData();
      formData.append(
        "product",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          formData.append("images", images[i]);
        }
      }

      const removeIds = Array.from(markedForRemoval);
      if (removeIds.length > 0) {
        formData.append(
          "removeImagePublicIds",
          new Blob([JSON.stringify(removeIds)], { type: "application/json" })
        );
      }

      await api.put(`/api/products/${productId}`, formData); // ✅ axios instance

      setSuccessMessage("Product updated successfully!");
      // refresh เพื่อสะท้อนของจริงจาก BE
      await fetchProduct();
      // reset ไฟล์ใหม่
      setImages(null);
      setImagePreviews([]);
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      setMarkedForRemoval(new Set());
    } catch (e: unknown) {
      let msg = "Failed to update product.";
      if (axios.isAxiosError(e)) {
        const ax = e as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Edit Product</h1>
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
          {/* Basic fields */}
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
                      checked={availableColors.includes(color)}
                      onChange={() => toggleColor(color)}
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
                      checked={availableSizes.includes(size)}
                      onChange={() => toggleSize(size)}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Variant Stock Matrix */}
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
                    {availableSizes.map((s) => (
                      <th key={s} className="p-2 border text-center">
                        {s}
                      </th>
                    ))}
                    <th className="p-2 border text-center">Row Total</th>
                  </tr>
                </thead>
                <tbody>
                  {availableColors.map((c) => (
                    <tr key={c} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border font-medium">{c}</td>
                      {availableSizes.map((s) => (
                        <td key={s} className="p-2 border">
                          <input
                            type="number"
                            min={0}
                            value={stockMatrix.get(c)?.get(s) ?? 0}
                            onChange={(e) => setQty(c, s, e.target.value)}
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
                    {availableSizes.map((s) => (
                      <th key={s} className="p-2 border text-center">
                        {totalBySize[s]?.toLocaleString() ?? 0}
                      </th>
                    ))}
                    <th className="p-2 border text-center">{grandTotal.toLocaleString()}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ภาพเดิม */}
          {existingImages.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Existing Images (click to mark for removal)
              </label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {existingImages.map((img) => {
                  const isRemoved = markedForRemoval.has(img.publicId);
                  return (
                    <button
                      type="button"
                      key={img.publicId}
                      onClick={() => toggleRemoveExisting(img.publicId)}
                      className={`relative w-full aspect-square rounded-lg overflow-hidden border ${
                        isRemoved ? "ring-4 ring-red-500" : ""
                      }`}
                      title={
                        isRemoved ? "Will be removed" : "Click to remove this image"
                      }
                    >
                      <Image
                        src={img.url}
                        alt="Existing"
                        fill
                        sizes="100px"
                        className={`object-cover ${isRemoved ? "opacity-50" : ""}`}
                      />
                      {isRemoved && (
                        <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm bg-black/40">
                          Remove
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* เพิ่มภาพใหม่ */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Add New Images
            </label>
            <input
              type="file"
              onChange={handleImageChange}
              multiple
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
            />
          </div>

          {imagePreviews.length > 0 && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                New Image Preview
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
