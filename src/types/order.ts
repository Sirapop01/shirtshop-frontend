export type OrderItemRequest = {
  productId: string;
  color?: string;
  size?: string;
  quantity: number;   // >=1
  price: number;      // integer (บาท)
};

export type CreateOrderRequest = {
  addressId: string;
  items: OrderItemRequest[];
  shippingFee: number; // integer (บาท)
};

export type CreateOrderResponse = {
  orderId: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string; // PENDING/...
};
