"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BlueprintCorners, Button, Field, Input, Table } from "@posselect/ui";

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

type SavedAddress = {
  id: number;
  label: string | null;
  recipientName: string;
  phoneNumber: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [ordererName, setOrdererName] = useState("");
  const [ordererPhone, setOrdererPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [structuredAddress, setStructuredAddress] = useState<{
    zipCode: string;
    address1: string;
    address2: string;
  } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "manual">("manual");
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
    // 로그인 상태면(도메인 공유 쿠키) 저장된 배송지 목록을 불러온다. 비로그인이면 401 -> 조용히 무시,
    // 기존처럼 직접 입력하는 폼만 보인다.
    fetch("/api/auth/addresses", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((addresses: SavedAddress[]) => {
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((a) => a.isDefault);
        if (defaultAddress) {
          applySavedAddress(defaultAddress);
        }
      })
      .catch(() => setSavedAddresses([]));
  }, []);

  const applySavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setOrdererName(address.recipientName);
    setOrdererPhone(address.phoneNumber);
    setShippingAddress(`(${address.zipCode}) ${address.address1} ${address.address2 ?? ""}`.trim());
    setStructuredAddress({
      zipCode: address.zipCode,
      address1: address.address1,
      address2: address.address2 ?? "",
    });
  };

  const handleAddressSelect = (value: string) => {
    if (value === "manual") {
      setSelectedAddressId("manual");
      setStructuredAddress(null);
      return;
    }
    const address = savedAddresses.find((a) => a.id === Number(value));
    if (address) {
      applySavedAddress(address);
    }
  };

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
          ...(structuredAddress && {
            recipientName: ordererName,
            recipientPhone: ordererPhone,
            zipCode: structuredAddress.zipCode,
            address1: structuredAddress.address1,
            address2: structuredAddress.address2,
          }),
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

      // 결제(mock) - 실제 PG 연동 전까지는 항상 성공 처리
      const payRes = await fetch(`/api/orders/${order.id}/pay`, { method: "POST" });
      if (!payRes.ok) {
        setError("결제에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      const paidOrder = await payRes.json();

      await fetch("/api/cart", { method: "DELETE" });
      setOrderResult({ id: paidOrder.id, totalPrice: paidOrder.totalPrice });
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
        <h1 className="mb-4">결제가 완료되었습니다</h1>
        <p className="text-muted">
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
      <h1 className="mb-6">장바구니</h1>
      {cart.items.length === 0 ? (
        <p className="text-muted">
          장바구니가 비어 있습니다.{" "}
          <Link href="/" className="underline">
            상품 보러 가기
          </Link>
        </p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>상품</th>
                <th>수량</th>
                <th>가격</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 duotone blueprint overflow-hidden flex-shrink-0">
                        <BlueprintCorners />
                        {item.thumbnailUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>{item.name}</div>
                    </div>
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, Number(e.target.value))
                      }
                      className="w-16 text-center"
                    />
                  </td>
                  <td>{item.price.toLocaleString()}원</td>
                  <td>
                    <Button variant="ghost" onClick={() => removeItem(item.productId)}>
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-6 text-right">
            <h3>합계: {cart.totalPrice.toLocaleString()}원</h3>
          </div>

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--color-divider)" }}>
            <h4 className="mb-3">주문 정보</h4>
            {savedAddresses.length > 0 && (
              <Field label="배송지">
                <select
                  className="input"
                  value={selectedAddressId}
                  onChange={(e) => handleAddressSelect(e.target.value)}
                >
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label || "배송지"} · {address.recipientName} ({address.zipCode})
                    </option>
                  ))}
                  <option value="manual">직접 입력</option>
                </select>
              </Field>
            )}
            <div className="flex flex-col gap-3 mb-4">
              <Field label="받는 분 이름">
                <Input
                  placeholder="받는 분 이름"
                  value={ordererName}
                  onChange={(e) => {
                    setSelectedAddressId("manual");
                    setStructuredAddress(null);
                    setOrdererName(e.target.value);
                  }}
                />
              </Field>
              <Field label="연락처">
                <Input
                  placeholder="연락처"
                  value={ordererPhone}
                  onChange={(e) => {
                    setSelectedAddressId("manual");
                    setStructuredAddress(null);
                    setOrdererPhone(e.target.value);
                  }}
                />
              </Field>
              <Field label="배송 주소">
                <Input
                  placeholder="배송 주소"
                  value={shippingAddress}
                  onChange={(e) => {
                    setSelectedAddressId("manual");
                    setStructuredAddress(null);
                    setShippingAddress(e.target.value);
                  }}
                />
              </Field>
            </div>
            {error && <p className="text-sm mb-2" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <Button
              variant="primary"
              block
              onClick={placeOrder}
              disabled={
                placing || !ordererName || !ordererPhone || !shippingAddress
              }
            >
              {placing ? "주문 처리 중..." : "주문하기"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
