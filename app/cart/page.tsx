"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  thumbnailUrl: string | null;
};

type Cart = {
  items: CartItem[];
  totalPrice: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);

  const loadCart = () => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then(setCart)
      .catch(() => setCart({ items: [], totalPrice: 0 }));
  };

  useEffect(() => {
    loadCart();
  }, []);

  const updateQuantity = async (productId: number, quantity: number) => {
    await fetch(`/api/cart/items/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    loadCart();
  };

  const removeItem = async (productId: number) => {
    await fetch(`/api/cart/items/${productId}`, { method: "DELETE" });
    loadCart();
  };

  if (!cart) {
    return null;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">장바구니</h1>
      {cart.items.length === 0 ? (
        <p className="text-gray-500">
          장바구니가 비어 있습니다.{" "}
          <Link href="/" className="underline">
            상품 보러 가기
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {cart.items.map((item) => (
              <li key={item.productId} className="py-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {item.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">
                    {item.price.toLocaleString()}원
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(item.productId, Number(e.target.value))
                  }
                  className="w-16 border rounded px-2 py-1 text-center"
                />
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-right text-lg font-semibold">
            합계: {cart.totalPrice.toLocaleString()}원
          </div>
        </>
      )}
    </main>
  );
}
