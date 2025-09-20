"use client";

import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, subTotal, updateItem, removeItem, clearCart } = useCart();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>

      {items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          <ul className="divide-y">
            {items.map((i) => (
              <li key={`${i.productId}-${i.color}-${i.size}`} className="py-4 flex items-center gap-4">
                <img src={i.image} alt={i.name} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-sm text-gray-500">{i.color} / {i.size}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => updateItem({productId:i.productId,color:i.color,size:i.size,quantity:Math.max(1,i.quantity-1)})} className="px-2 border rounded">-</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => updateItem({productId:i.productId,color:i.color,size:i.size,quantity:i.quantity+1})} className="px-2 border rounded">+</button>
                    <button onClick={() => removeItem(i.productId, i.color, i.size)} className="ml-4 text-red-600">Remove</button>
                  </div>
                </div>
                <div className="text-right font-medium">{(i.price * i.quantity).toLocaleString("th-TH")} ฿</div>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-right">
            <p className="text-lg font-bold">Total: {subTotal.toLocaleString("th-TH")} ฿</p>
            <button onClick={clearCart} className="mt-3 bg-gray-200 px-4 py-2 rounded">Clear Cart</button>
            <a href="/checkout" className="ml-3 bg-black text-white px-5 py-2 rounded inline-block">Checkout</a>
          </div>
        </>
      )}
    </div>
  );
}
