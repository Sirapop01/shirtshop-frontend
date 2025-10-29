// src/app/(site)/(account)/orders/[id]/page.tsx
import OrderDetailClient from "./OrderDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;              // ✅ ทำให้เป็น Promise
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;                   // ✅ ต้อง await ก่อนใช้
  return <OrderDetailClient orderId={id} />;
}
