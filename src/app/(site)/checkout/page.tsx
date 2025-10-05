"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import { useCart } from "@/context/CartContext";
import { useAddress } from "@/context/AddressContext";
import { useOrder } from "@/context/OrderContext";
import { usePayment } from "@/context/PaymentContext";

import PaymentQRDialog from "@/components/PaymentQRDialog";
import type { CreateOrderRequest } from "@/types/order";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subTotal, shippingFee, total, clearCart } = useCart();
  const { addresses } = useAddress();
  const { createOrder } = useOrder();
  const { createQr, get } = usePayment();

  // ใช้ default address ของผู้ใช้
  const defaultAddr = useMemo(() => addresses.find(a => a.isDefault), [addresses]);

  const [qrOpen, setQrOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrInfo, setQrInfo] = useState<{
    amount: number;
    hostedQrUrl?: string | null;
    qrPayload?: string | null;
    expiresAt?: string | null;
  } | null>(null);

  // Poll payment status
  useEffect(() => {
    if (!paymentId) return;
    const id = setInterval(async () => {
      try {
        const p = await get(paymentId);
        if (p.status === "SUCCEEDED") {
          clearInterval(id);
          toast.success("ชำระเงินสำเร็จ");
          await clearCart();
          router.push(`/payment/success?orderId=${p.orderId}&paymentId=${paymentId}`);
        } else if (p.status === "FAILED" || p.status === "CANCELED") {
          clearInterval(id);
          toast.error("การชำระเงินล้มเหลว/ถูกยกเลิก");
          setQrOpen(false);
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [paymentId, get, router, clearCart]);

  const onCheckout = async () => {
    if (!defaultAddr?.id) {
      toast.error("กรุณาเพิ่มที่อยู่จัดส่งก่อน");
      return;
    }
    if (items.length === 0) {
      toast.error("ตะกร้าสินค้าว่าง");
      return;
    }

    try {
      // 1) Create Order
      const payload: CreateOrderRequest = {
        addressId: defaultAddr.id,
        items: items.map(i => ({
          productId: i.productId,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
          price: i.price, // int บาท
        })),
        shippingFee,
      };
      const order = await createOrder(payload);

      // 2) Create QR Payment
      const pay = await createQr({ orderId: order.orderId, amount: order.total });
      setPaymentId(pay.paymentId);
      setQrInfo({
        amount: pay.amount,
        hostedQrUrl: pay.hostedQrUrl ?? null,
        qrPayload: (pay as any)?.qrPayload ?? null,
        expiresAt: pay.expiresAt ?? null,
      });
      setQrOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Toaster />
      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>

      {/* แสดงที่อยู่ */}
      <div className="mb-6 rounded-xl border p-4">
        <h2 className="mb-2 font-medium">ที่อยู่จัดส่ง</h2>
        {defaultAddr ? (
          <div className="text-sm">
            <div className="font-semibold">{defaultAddr.fullName} ({defaultAddr.phone})</div>
            <div>
              {defaultAddr.addressLine1}, {defaultAddr.subdistrict}, {defaultAddr.district},{" "}
              {defaultAddr.province} {defaultAddr.postalCode}
            </div>
          </div>
        ) : (
          <div className="text-red-500">ยังไม่มีที่อยู่จัดส่ง</div>
        )}
      </div>

      {/* แสดงสินค้าในตะกร้า */}
      <div className="mb-6 rounded-xl border p-4">
        <h2 className="mb-2 font-medium">สินค้าในตะกร้า</h2>
        {items.length > 0 ? (
          items.map((i, idx) => (
            <div
              key={`${i.productId}-${i.color}-${i.size}-${idx}`}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <div className="font-medium">{i.name}</div>
                <div className="text-gray-500">
                  {i.color} / {i.size}
                </div>
              </div>
              <div>x{i.quantity}</div>
              <div>{i.price.toLocaleString()} บาท</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">ไม่มีสินค้า</div>
        )}

        <hr className="my-3" />
        <div className="flex justify-between text-sm">
          <span>รวม</span>
          <b>{subTotal.toLocaleString()} บาท</b>
        </div>
        <div className="flex justify-between text-sm">
          <span>ค่าส่ง</span>
          <b>{shippingFee.toLocaleString()} บาท</b>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-lg font-semibold">ยอดชำระ</span>
          <span className="text-lg font-bold">{total.toLocaleString()} บาท</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        className="w-full rounded-xl bg-black px-4 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
        disabled={items.length === 0}
      >
        ยืนยันและชำระด้วย QR
      </button>

      {/* QR Dialog */}
      <PaymentQRDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        amount={qrInfo?.amount ?? total}
        hostedQrUrl={qrInfo?.hostedQrUrl ?? null}
        qrPayload={qrInfo?.qrPayload ?? null}
        expiresAt={qrInfo?.expiresAt ?? null}
      />
    </div>
  );
}
