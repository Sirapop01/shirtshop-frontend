"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
    const sp = useSearchParams();
    const orderId = sp.get("orderId");
    const paymentId = sp.get("paymentId");

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-2 text-2xl font-bold text-green-600">ชำระเงินสำเร็จ</h1>
            <p className="text-sm text-gray-600">ระบบได้บันทึกคำสั่งซื้อเรียบร้อยแล้ว</p>
            <div className="mt-4 rounded-xl border p-4 text-sm">
                <div>Order ID: <b>{orderId}</b></div>
                <div>Payment ID: <b>{paymentId}</b></div>
            </div>
            <div className="mt-6">
                <Link href="/orders" className="rounded-xl bg-black px-4 py-2 text-white">ไปหน้าคำสั่งซื้อของฉัน</Link>
            </div>
        </div>
    );
}
