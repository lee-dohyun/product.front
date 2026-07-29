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

type OrderResult = {
  id: number;
  totalPrice: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [ordererName, setOrdererName] = useState("");
  const [ordererPhone, setOrdererPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordererName,
          ordererPhone,
          shippingAddress,
          items: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });
      if (!res.ok) {
        setError("주문에 실패했습니다. 입력값을 확인해주세요.");
        return;
      }
      const order = await res.json();
      await fetch("/api/cart", { method: "DELETE" });
      setOrderResult({ id: order.id, totalPrice: order.totalPrice });
      loadCart();
    } finally {
      setPlacing(false);
    }
  };

  if (!cart) {
    return null;
  }

  if (orderResult) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">주문이 완료되었습니다</h1>
        <p className="text-gray-600">
          주문번호 #{orderResult.id} · 결제 금액{" "}
          {orderResult.totalPrice.toLocaleString()}원
        </p>
        <Link href="/" className="underline mt-4 inline-block">
          상품 목록으로
        </Link>
      </main>
    );
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

          <div className="mt-8 border-t pt-6">
            <h2 className="font-semibold mb-3">주문 정보</h2>
            <div className="flex flex-col gap-2 mb-4">
              <input
                placeholder="받는 분 이름"
                value={ordererName}
                onChange={(e) => setOrdererName(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="연락처"
                value={ordererPhone}
                onChange={(e) => setOrdererPhone(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                placeholder="배송 주소"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button
              onClick={placeOrder}
              disabled={
                placing || !ordererName || !ordererPhone || !shippingAddress
              }
              className="w-full px-4 py-3 bg-black text-white rounded disabled:opacity-50"
            >
              {placing ? "주문 처리 중..." : "주문하기"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
