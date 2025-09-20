"use client";

import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items } = useCart();
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <p>Total: {total.toFixed(2)} ฿</p>

      <form className="mt-6 space-y-4">
        <input className="w-full border p-2" placeholder="Full Name" />
        <input className="w-full border p-2" placeholder="Address" />
        <input className="w-full border p-2" placeholder="City" />
        <input className="w-full border p-2" placeholder="Postal Code" />
        <button type="submit" className="w-full bg-green-600 text-white p-3 rounded">
          Pay Now
        </button>
      </form>
    </div>
  );
}
