"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import ProductGallery from "@/components/ProductGallery";
import ColorSelector from "@/components/ColorSelector";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  useEffect(() => {
    // ตั้งค่าเริ่มต้นให้ Size
    if (product.availableSizes?.includes("M")) {
      setSelectedSize("M");
    } else if (product.availableSizes?.length > 0) {
      setSelectedSize(product.availableSizes[0]);
    }
    
    // ตั้งค่าเริ่มต้นให้ Color
    if (product.availableColors?.length > 0) {
      setSelectedColor(product.availableColors[0]);
    }
  }, [product]);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(price);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("กรุณาเลือกไซส์");
      return;
    }
    if (!selectedColor) {
      alert("กรุณาเลือกสี");
      return;
    }
    
    console.log(`Added to cart: ${product.name}, Size: ${selectedSize}, Color: ${selectedColor}`);
    alert(`เพิ่ม "${product.name}" ไซส์ ${selectedSize} (สี ${selectedColor}) ลงในตะกร้าแล้ว`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
      <ProductGallery images={product.imageUrls} alt={product.name} />

      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{product.category}</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 text-gray-900">{product.name}</h1>
        <p className="text-3xl font-semibold text-gray-800 mt-4">{formatPrice(product.price)}</p>

        <div className="mt-8">
          <h3 className="text-md font-semibold text-gray-700">
            เลือกสี: <span className="font-normal">{selectedColor}</span>
          </h3>
          <div className="mt-3">
            <ColorSelector
              colors={product.availableColors}
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-md font-semibold text-gray-700">เลือกไซส์</h3>
          <div className="flex flex-wrap gap-3 mt-3">
            {product.availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
                  selectedSize === size
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-8">
            <h3 className="text-md font-semibold text-gray-700">รายละเอียดสินค้า</h3>
            <p className="text-gray-600 mt-2 text-base leading-relaxed">{product.description}</p>
        </div>

        <div className="mt-auto pt-8">
          <button
            onClick={handleAddToCart}
            disabled={!selectedSize || !selectedColor || product.stockQuantity === 0}
            className="w-full py-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {product.stockQuantity > 0 ? 'เพิ่มลงในตะกร้า' : 'สินค้าหมด'}
          </button>
        </div>
      </div>
    </div>
  );
}