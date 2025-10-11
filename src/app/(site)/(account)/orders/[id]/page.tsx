import OrderDetailClient from "./OrderDetailClient";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailClient orderId={params.id} />;
}
