"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ⭐️ 1. กำหนดรายการสีและไซส์ทั้งหมดที่มีในร้านของเรา
const ALL_AVAILABLE_COLORS = ["Black", "White", "Grey", "Navy", "Olive Green", "Charcoal", "Cream", "Dusty Blue", "Maroon", "Beige", "Dark Grey"];
const ALL_AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL"];

export default function NewProductPage() {
  const { isAdmin, token, user } = useAuth();
  const router = useRouter();

  // ... (State อื่นๆ เหมือนเดิม) ...
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('T-Shirts');
  const [stockQuantity, setStockQuantity] = useState('');
  const [images, setImages] = useState<FileList | null>(null);

  // ⭐️ 2. เปลี่ยน State ของสีและไซส์มาเป็น Array ของ String
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // ... (State สำหรับ error, success message, isLoading เหมือนเดิม) ...
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // ... (useEffect สำหรับป้องกันหน้าเหมือนเดิม) ...
  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
      if (!isAdmin) {
        alert("Access Denied. You are not an administrator.");
        router.push('/admin/login');
      }
    }
  }, [isAdmin, user, router]);

  // ⭐️ 3. สร้างฟังก์ชันสำหรับจัดการ Checkbox
  const handleColorChange = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!token) {
      setError('Authentication error. Please login again.');
      return;
    }

    const formData = new FormData();

    // ⭐️ 4. ใช้ State ใหม่ (selectedColors, selectedSizes) ในการส่งข้อมูล
    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      availableColors: selectedColors,
      availableSizes: selectedSizes,
      stockQuantity: parseInt(stockQuantity),
    };
    formData.append('product', new Blob([JSON.stringify(productData)], { type: "application/json" }));

    // ... (ส่วนของการ append รูปภาพเหมือนเดิม) ...
    if (images) {
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }
    }

    try {
      // ... (โค้ด fetch และจัดการผลลัพธ์เหมือนเดิม) ...
      const res = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error: ${res.statusText}`);
      }

      setSuccessMessage('Product created successfully!');
      // เคลียร์ฟอร์ม
      setName('');
      setDescription('');
      setPrice('');
      setCategory('T-Shirts');
      setSelectedColors([]);
      setSelectedSizes([]);
      setStockQuantity('');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err: any) {
      setError(`Failed to create product: ${err.message}`);
    }
  };
  
  // ... (ส่วน Loading และป้องกันหน้าเหมือนเดิม) ...
  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            {/* ... (Header เหมือนเดิม) ... */}
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-gray-800">Add New Product</h1>
                 <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">← Back to Shop</button>
            </div>
          
            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md space-y-6">
                
                {/* ... (Input fields อื่นๆ เหมือนเดิม) ... */}
                <div>
                    <label className="block text-gray-700 font-medium mb-1">Product Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border rounded-md"/>
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-1">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="w-full p-2 border rounded-md"/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">Price (THB)</label>
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" step="10" className="w-full p-2 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option value="T-Shirts">T-Shirts</option>
                            <option value="Graphic Tees">Graphic Tees</option>
                            <option value="Polo">Polo</option>
                            <option value="Long Sleeves">Long Sleeves</option>
                            <option value="New Arrival">New Arrival</option>
                        </select>
                    </div>
                </div>

                {/* ⭐️ 5. เปลี่ยน UI ของ Colors และ Sizes เป็น Checkbox */}
                <div>
                    <label className="block text-gray-700 font-medium mb-1">Available Colors</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-2">
                        {ALL_AVAILABLE_COLORS.map(color => (
                            <label key={color} className="flex items-center space-x-2 cursor-pointer">
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
                    <label className="block text-gray-700 font-medium mb-1">Available Sizes</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-2">
                         {ALL_AVAILABLE_SIZES.map(size => (
                            <label key={size} className="flex items-center space-x-2 cursor-pointer">
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

                {/* ... (Stock, Image Upload, Buttons เหมือนเดิม) ... */}
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Stock Quantity</label>
                    <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required min="0" className="w-full p-2 border rounded-md"/>
                </div>
                 <div>
                    <label className="block text-gray-700 font-medium mb-1">Product Images</label>
                    <input type="file" onChange={e => setImages(e.target.files)} multiple accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"/>
                </div>
                <div className="pt-4">
                     {successMessage && <p className="mb-4 text-center text-green-600 bg-green-50 p-3 rounded-md">{successMessage}</p>}
                     {error && <p className="mb-4 text-center text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                    <button type="submit" className="w-full px-6 py-3 bg-black text-white rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors">
                        Create Product
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}