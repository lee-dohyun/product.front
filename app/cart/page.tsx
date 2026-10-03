"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BlueprintCorners, Button, Field, Input, Table } from "@posselect/ui";
import { readPurchaseError } from "@/lib/api-error";
import { fetchMemberGrade, gradeDiscountAmount, type MemberGrade } from "@/lib/grade-discount";
import { createOrderAttempt, fetchWithRetry } from "@/lib/order-submit";

type CartItem = {
  variantId: number;
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
  discountAmount: number;
  gradeCode: string | null;
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
  // 같은 주문 내용의 재시도(자동·「주문하기」 다시 누름)를 같은 주문에 묶는 멱등 키(gateway#306).
  const orderAttempt = useRef(createOrderAttempt());
  // 로그인한 회원의 등급. 비로그인·조회 실패면 null 이고 할인 안내를 아예 보이지 않는다.
  const [memberGrade, setMemberGrade] = useState<MemberGrade | null>(null);

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
    fetchMemberGrade().then(setMemberGrade);
  }, []);

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

  const updateQuantity = async (variantId: number, quantity: number) => {
    setError(null);
    const res = await fetch(`/api/cart/items/${variantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    // 최대 구매 수량 초과·판매 기간 밖(409, product.api#97)이면 수량은 바뀌지 않는다 — 사유를 알린다.
    if (!res.ok) setError(await readPurchaseError(res, "수량을 바꾸지 못했습니다."));
    loadCart();
  };

  const removeItem = async (variantId: number) => {
    await fetch(`/api/cart/items/${variantId}`, { method: "DELETE" });
    loadCart();
  };

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) return;
    setPlacing(true);
    setError(null);
    try {
      const body = JSON.stringify({
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
          variantId: item.variantId,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      // 응답을 못 받으면(게이트웨이 타임아웃 등) 같은 키로 한 번 더 보낸다 — order.api 가 이미 만든
      // 주문이 있으면 새로 만들지 않고 그 주문을 돌려준다.
      const idempotencyKey = orderAttempt.current.keyFor(body);
      const res = await fetchWithRetry(() =>
        fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body,
        }),
      );
      if (!res.ok) {
        // 409 는 구매 규칙 거부(판매하지 않는 상품, 1회 최대 수량 초과 등) — order.api 사유를 그대로 보여 준다.
        setError(await readPurchaseError(res, "주문에 실패했습니다. 입력값을 확인해주세요."));
        return;
      }
      const order = await res.json();

      // 비로그인(게스트) 주문은 계정으로 소유자를 확인할 수 없어서, 생성 응답으로 받은 토큰을
      // 되돌려 보내야 결제가 허용된다. 로그인 주문은 게이트웨이가 넣어주는 신원 헤더로 확인되므로
      // 이 값이 없다(order.api가 발급하지 않음).
      const guestHeaders: Record<string, string> = order.guestToken
        ? { "X-Order-Guest-Token": order.guestToken }
        : {};
      let paidOrder = order;
      // 다시 보낸 주문 요청이 "이미 결제까지 끝난 주문"을 돌려받을 수 있다(지난번에 결제 응답만 못 받은
      // 경우). 그때는 다시 결제하지 않는다 — order.api 가 이미 결제된 주문이라고 거부한다.
      if (order.status !== "PAID") {
        // 결제는 order.api 가 주문 상태로 한 번만 받는다(두 번째는 409) — 다시 보내도 이중 결제가 아니다.
        const payRes = await fetchWithRetry(() =>
          fetch(`/api/orders/${order.id}/pay`, { method: "POST", headers: guestHeaders }),
        );
        if (payRes.ok) {
          paidOrder = await payRes.json();
        } else {
          // 실패 응답이어도 결제는 됐을 수 있다(응답만 못 받고 다시 보내 409 를 받은 경우). 주문을 다시
          // 읽어 결제 완료면 성공으로 본다.
          const confirmed = await fetch(`/api/orders/${order.id}`, { headers: guestHeaders })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (confirmed?.status !== "PAID") {
            setError("결제에 실패했습니다. 다시 시도해주세요.");
            return;
          }
          paidOrder = confirmed;
        }
      }
      orderAttempt.current.clear();

      // 결제까지 끝났다. 장바구니 비우기가 실패해도 주문은 성공이므로 완료 화면은 보여 준다.
      await fetch("/api/cart", { method: "DELETE" }).catch(() => {});
      setOrderResult({
        id: paidOrder.id,
        totalPrice: paidOrder.totalPrice,
        discountAmount: paidOrder.discountAmount ?? 0,
        gradeCode: paidOrder.gradeCode ?? null,
      });
      loadCart();
    } catch {
      // 요청이 서버에 닿지 못했다(네트워크 끊김 등). 예전에는 아무 메시지 없이 버튼만 되돌아왔다.
      setError("주문 요청을 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setPlacing(false);
    }
  };

  if (!cart) {
    return null;
  }

  const expectedDiscount = memberGrade
    ? gradeDiscountAmount(cart.totalPrice, memberGrade.discountRate)
    : 0;

  if (orderResult) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="mb-4">결제가 완료되었습니다</h1>
        <p className="text-muted">
          주문번호 #{orderResult.id} · 결제 금액{" "}
          {orderResult.totalPrice.toLocaleString()}원
          {orderResult.discountAmount > 0 &&
            ` (회원 등급 할인 ${orderResult.discountAmount.toLocaleString()}원 적용)`}
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
                <tr key={item.variantId}>
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
                        updateQuantity(item.variantId, Number(e.target.value))
                      }
                      className="w-16 text-center"
                    />
                  </td>
                  <td>{item.price.toLocaleString()}원</td>
                  <td>
                    <Button variant="ghost" onClick={() => removeItem(item.variantId)}>
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-6 text-right">
            {expectedDiscount > 0 && memberGrade ? (
              <>
                <p className="text-muted">상품 합계: {cart.totalPrice.toLocaleString()}원</p>
                <p className="text-muted">
                  {memberGrade.name} 등급 할인 ({memberGrade.discountRate}%): -
                  {expectedDiscount.toLocaleString()}원
                </p>
                <h3>결제 예정 금액: {(cart.totalPrice - expectedDiscount).toLocaleString()}원</h3>
              </>
            ) : (
              <h3>합계: {cart.totalPrice.toLocaleString()}원</h3>
            )}
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
