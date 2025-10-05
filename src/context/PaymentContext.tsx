"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import api from "@/lib/api";
import type {
    CreateQrPaymentRequest,
    CreateQrPaymentResponse,
    PaymentResponse,
} from "@/types/payment";

type PaymentContextType = {
    current: PaymentResponse | null;
    createQr: (payload: CreateQrPaymentRequest) => Promise<CreateQrPaymentResponse>;
    get: (paymentId: string) => Promise<PaymentResponse>;
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
    const [current, setCurrent] = useState<PaymentResponse | null>(null);

    const createQr = async (payload: CreateQrPaymentRequest) => {
        const { data } = await api.post<CreateQrPaymentResponse>("/api/payments/qr", payload);
        return data;
    };

    const get = async (paymentId: string) => {
        const { data } = await api.get<PaymentResponse>(`/api/payments/${paymentId}`);
        setCurrent(data);
        return data;
    };

    return (
        <PaymentContext.Provider value={{ current, createQr, get }}>
            {children}
        </PaymentContext.Provider>
    );
}

export function usePayment() {
    const ctx = useContext(PaymentContext);
    if (!ctx) throw new Error("usePayment must be used within PaymentProvider");
    return ctx;
}
