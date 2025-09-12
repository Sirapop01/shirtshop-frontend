// lib/data.ts
import { Product } from "@/types";

// ฟังก์ชันสำหรับดึงข้อมูลสินค้าทั้งหมดจาก Spring Boot API
export async function getProducts(): Promise<Product[]> {
  try {
    // อย่าลืมเปลี่ยน URL เป็นของ production เมื่อ deploy
    const res = await fetch('http://localhost:8080/api/products', {
      // revalidate ทุกๆ 1 ชั่วโมง หรือตามความเหมาะสม
      next: { revalidate: 3600 }, 
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }

    const products: Product[] = await res.json();
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    // คืนค่าเป็น array ว่าง เพื่อไม่ให้หน้าเว็บพัง
    return []; 
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`http://localhost:8080/api/products/${id}`, {
      // ไม่ cache ข้อมูล หรือตั้ง revalidate ตามความเหมาะสม
      cache: 'no-store', 
    });

    if (!res.ok) {
      // ถ้า API คืนค่า 404 (ไม่เจอสินค้า) ให้คืนค่า null
      if (res.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch product with id: ${id}`);
    }

    const product: Product = await res.json();
    return product;
  } catch (error) {
    console.error(error);
    return null;
  }
}