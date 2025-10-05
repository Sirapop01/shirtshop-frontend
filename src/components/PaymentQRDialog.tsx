"use client";
import { useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Props = {
    open: boolean;
    onClose: () => void;
    amount: number;
    hostedQrUrl?: string | null;
    qrPayload?: string | null;
    expiresAt?: string | null;
    title?: string;
};

export default function PaymentQRDialog({
    open,
    onClose,
    amount,
    hostedQrUrl,
    qrPayload,
    expiresAt,
    title = "สแกนจ่ายด้วย PromptPay",
}: Props) {
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">ปิด</button>
                </div>

                <div className="mb-3 text-sm text-gray-600">
                    จำนวนเงิน: <b>{amount.toLocaleString()} บาท</b>
                    {expiresAt ? (
                        <div className="text-xs text-gray-500">หมดอายุ: {new Date(expiresAt).toLocaleString()}</div>
                    ) : null}
                </div>

                {hostedQrUrl ? (
                    <div className="space-y-3">
                        <iframe title="hosted-qr" src={hostedQrUrl} className="h-80 w-full rounded-xl border" />
                        <div className="text-xs text-gray-500">
                            ถ้าไม่แสดง ให้{" "}
                            <a className="text-blue-600 underline" href={hostedQrUrl} target="_blank">เปิดลิงก์ QR</a>
                        </div>
                    </div>
                ) : qrPayload ? (
                    <div className="flex flex-col items-center gap-3">
                        <QRCodeCanvas value={qrPayload} size={256} includeMargin />
                        <div className="text-xs text-gray-500">สแกนด้วยแอปธนาคาร</div>
                    </div>
                ) : (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">ไม่พบข้อมูล QR</div>
                )}
            </div>
        </div>
    );
}
