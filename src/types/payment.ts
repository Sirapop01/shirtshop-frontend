export type CreateQrPaymentRequest = {
  orderId: string;
  amount?: number; // ถ้าไม่ส่งหรือ <=0 BE จะใช้ order.total
};

export type CreateQrPaymentResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: "THB";
  method: "PROMPTPAY";
  status: "REQUIRES_PAYMENT" | "SUCCEEDED" | "FAILED" | "CANCELED";
  providerRef?: string | null;
  hostedQrUrl?: string | null;
  qrPayload?: string | null;
  expiresAt?: string | null;
};

export type PaymentResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: "THB";
  method: "PROMPTPAY";
  status: "REQUIRES_PAYMENT" | "SUCCEEDED" | "FAILED" | "CANCELED";
  providerRef?: string | null;
  hostedQrUrl?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
};
