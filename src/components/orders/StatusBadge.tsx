"use client";

export type OrderStatus = "PENDING_PAYMENT" | "SLIP_UPLOADED" | "PAID" | "REJECTED" | "EXPIRED";

export default function StatusBadge({ s }: { s: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "bg-yellow-50 text-yellow-800 border-yellow-200",
    SLIP_UPLOADED:  "bg-blue-50 text-blue-700 border-blue-200",
    PAID:           "bg-green-50 text-green-700 border-green-200",
    REJECTED:       "bg-red-50 text-red-700 border-red-200",
    EXPIRED:        "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <span className={`text-xs border rounded px-2 py-1 ${map[s]}`}>{s}</span>;
}
