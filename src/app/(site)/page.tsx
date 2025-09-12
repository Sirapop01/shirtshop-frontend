// app/(site)/page.tsx

import HeroBanner from "@/components/HeroBanner";
import SectionTitle from "@/components/SectionTitle";
import ProductGrid from "@/components/ProductGrid";
import BigCtaBanner from "@/components/BigCtaBanner";
import StyleGallery from "@/components/StyleGallery";

// ⭐️ 1. Import ฟังก์ชันดึงข้อมูลที่เราสร้างขึ้น
import { getProducts } from "@/lib/data"; 
import { styleGallery } from "@/lib/mock"; // ยังใช้ mock data สำหรับส่วนนี้ไปก่อน

// ⭐️ 2. เปลี่ยน component ให้เป็น async function
export default async function HomePage() {
  
  // ⭐️ 3. เรียกใช้ API เพื่อดึงข้อมูลสินค้าจาก Backend
  const allProducts = await getProducts();

  // (ตัวเลือก) สามารถแบ่งสินค้าตาม category ที่ได้จาก API
  const newArrivals = allProducts.filter(p => p.category === 'New Arrival').slice(0, 8);
  const tShirts = allProducts.filter(p => p.category === 'T-Shirts').slice(0, 4);
  
  // ถ้าไม่มีการแบ่งประเภท ก็ใช้ allProducts.slice(0, 8) ได้เลย
  const productsToShow = newArrivals.length > 0 ? newArrivals : allProducts.slice(0, 8);

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-12">
      <HeroBanner />

      <section>
        <SectionTitle>New Arrivals</SectionTitle>
        {/* ⭐️ 4. ส่งข้อมูลจริงที่ได้จาก API เข้าไปใน ProductGrid */}
        <ProductGrid items={productsToShow} />
      </section>

      {/* คุณผาสามารถเพิ่ม Section อื่นๆ โดยใช้ข้อมูลจาก tShirts หรือ category อื่นๆ ได้ */}
      {tShirts.length > 0 && (
         <section>
            <SectionTitle>T-Shirts</SectionTitle>
            <ProductGrid items={tShirts} />
         </section>
      )}

      <BigCtaBanner />

      <section>
        <SectionTitle>Style Inspo</SectionTitle>
        <StyleGallery items={styleGallery} />
      </section>
    </main>
  );
}