"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import api from "@/lib/api";
import type { CreateOrderRequest, CreateOrderResponse } from "@/types/order";

type OrderContextType = {
    lastOrder: CreateOrderResponse | null;
    createOrder: (payload: CreateOrderRequest) => Promise<CreateOrderResponse>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
    const [lastOrder, setLastOrder] = useState<CreateOrderResponse | null>(null);

    const createOrder = async (payload: CreateOrderRequest) => {
        const { data } = await api.post<CreateOrderResponse>("/api/orders", payload);
        setLastOrder(data);
        return data;
        // หมายเหตุ: หาก BE ใช้ path อื่น ให้ปรับตรงนี้
    };

    return (
        <OrderContext.Provider value={{ lastOrder, createOrder }}>
            {children}
        </OrderContext.Provider>
    );
}

export function useOrder() {
    const ctx = useContext(OrderContext);
    if (!ctx) throw new Error("useOrder must be used within OrderProvider");
    return ctx;
}
