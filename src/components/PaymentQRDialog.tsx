"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  /** ยอดชำระ (บาท) */
  amount: number;

  /** ถ้ามี (จาก BE/PG) จะใช้ URL นี้แทนการสร้างด้วย promptpay.io */
  hostedQrUrl?: string | null;

  /** ถ้ามี payload QR (จาก BE/PG) — ปัจจุบันยังไม่ render รูปจาก payload ในไฟล์นี้ */
  qrPayload?: string | null;

  /** เวลา QR หมดอายุ (ISO string) ถ้ามี */
  expiresAt?: string | null;

  /** ใช้สำหรับไป success page */
  orderId?: string | null;

  /** เมื่อผู้ใช้กด “ฉันชำระแล้ว” */
  onPaid?: () => Promise<void> | void;

  /** เมื่อผู้ใช้กด “อัปโหลดสลิป” */
  onUploadSlip?: () => void;
};

export default function PaymentQRDialog({
  open,
  onClose,

  amount,
  hostedQrUrl = null,
  qrPayload = null,
  expiresAt = null,

  orderId = null,
  onPaid,
  onUploadSlip,
}: Props) {
  const promptPayId =
    (process.env.NEXT_PUBLIC_PROMPTPAY_ID || "").trim();

  const shopName =
    process.env.NEXT_PUBLIC_SHOP_NAME || "Shop";

  const [error, setError] = useState<string | null>(null);
  const [remainSec, setRemainSec] = useState<number | null>(null);

  // นับเวลาถอยหลัง (ถ้ามี expiresAt)
  useEffect(() => {
    if (!open) return;
    if (!expiresAt) {
      setRemainSec(null);
      return;
    }
    const end = new Date(expiresAt).getTime();
    const t = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((end - now) / 1000));
      setRemainSec(left);
      if (left <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [open, expiresAt]);

  const amountStr = useMemo(() => {
    const n = Number(amount);
    if (Number.isNaN(n)) return "";
    return Math.max(0, n).toFixed(2);
  }, [amount]);

  // ถ้าไม่มี hostedQrUrl/qrPayload → ใช้ promptpay.io
  const promptPayQrUrl = useMemo(() => {
    if (!promptPayId) return null;
    return `https://promptpay.io/${encodeURIComponent(
      promptPayId
    )}/${amountStr}.png?size=320`;
  }, [promptPayId, amountStr]);

  // ตัดสินใจว่าจะใช้รูปไหน
  const qrImageUrl = hostedQrUrl || promptPayQrUrl || null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            ชำระเงินด้วย QR
          </h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ปิด
          </button>
        </div>

        <div className="text-sm text-gray-700">
          <div className="mb-1">
            ร้านค้า: <span className="font-medium">{shopName}</span>
          </div>
          <div className="mb-2">
            ยอดชำระ:{" "}
            <span className="font-semibold">{Number(amount).toLocaleString()} บาท</span>
          </div>
          {orderId && (
            <div className="mb-2">
              เลขคำสั่งซื้อ: <span className="font-medium">{orderId}</span>
            </div>
          )}
          {promptPayId && !hostedQrUrl && (
            <div className="mb-2">
              PromptPay ID: <span className="font-mono">{promptPayId}</span>
            </div>
          )}
          {expiresAt && (
            <div className="mb-2 text-xs text-gray-500">
              หมดอายุ: {new Date(expiresAt).toLocaleString()}{" "}
              {remainSec !== null && (
                <span className="ml-1">
                  (เหลือ {remainSec}s)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-3">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Payment QR"
              className="mx-auto rounded-lg"
              width={320}
              height={320}
              onError={() =>
                setError("โหลดรูป QR ไม่ได้ กรุณารีเฟรชหรือเช็คอินเทอร์เน็ต")
              }
            />
          ) : qrPayload ? (
            <div className="rounded-lg border p-3 text-center">
              <div className="text-xs text-gray-500">
                QR Payload:
              </div>
              <div className="break-all font-mono text-xs">
                {qrPayload}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                (ยังไม่ได้เรนเดอร์เป็นรูปใน Dialog นี้ คุณสามารถเพิ่ม
                QR renderer ภายหลังได้)
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-3 text-center text-sm text-red-600">
              ไม่พบข้อมูล QR (ไม่มี hostedQrUrl/qrPayload และไม่ได้ตั้งค่า NEXT_PUBLIC_PROMPTPAY_ID)
            </div>
          )}
          {error && (
            <div className="mt-2 text-center text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-center text-xs text-gray-500">
          <p>1) เปิดแอปธนาคาร → สแกน QR</p>
          <p>2) ตรวจชื่อผู้รับและจำนวนเงิน → ยืนยัน</p>
          <p>3) บันทึกสลิปไว้เป็นหลักฐาน</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              try {
                await onPaid?.();
              } catch (e) {
                console.error(e);
              }
            }}
            className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            ฉันชำระแล้ว
          </button>

          <button
            onClick={() => onUploadSlip?.()}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            อัปโหลดสลิป
          </button>
        </div>

        <div className="mt-2 text-center">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
