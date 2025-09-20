// src/components/product/QuantitySelector.tsx
"use client";

interface QuantitySelectorProps {
    quantity: number;
    setQuantity: (qty: number) => void;
    maxQuantity: number;
}

export default function QuantitySelector({ quantity, setQuantity, maxQuantity }: QuantitySelectorProps) {
    const increment = () => setQuantity(Math.min(quantity + 1, maxQuantity > 0 ? maxQuantity : 99));
    const decrement = () => setQuantity(Math.max(1, quantity - 1));

    return (
        <div className="flex items-center border rounded-lg w-fit mt-3">
            <button onClick={decrement} className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-l-lg">-</button>
            <span className="px-5 py-2 text-center w-16 tabular-nums">{quantity}</span>
            <button onClick={increment} disabled={quantity >= maxQuantity} className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed">+</button>
        </div>
    )
}