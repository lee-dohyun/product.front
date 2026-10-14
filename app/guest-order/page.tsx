"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlueprintCorners, Tag } from "@posselect/ui";
import { ClaimSection, type Claim } from "./ClaimSection";
import {
  orderStatusLabel,
  orderStatusVariant,
  serverTime,
  shipmentStatusLabel,
  trackingSearchUrl,
} from "@/lib/order-display";

type OrderItem = {
  orderItemId: number;
  claimedQuantity: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  sellerName: string | null;
};

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
};

/** order.api `OrderResponse` 중 이 화면이 쓰는 필드. */
type OrderDetail = {
  id: number;
  status: string;
  ordererName: string;
  recipientName: string | null;
  recipientPhone: string | null;
  zipCode: string | null;
  address1: string | null;
  address2: string | null;
  shippingAddress: string;
  subtotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  totalPrice: number;
  gradeCode: string | null;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
  shipment: Shipment | null;
  claims: Claim[];
};

const won = (n: number) => `${n.toLocaleString()}원`;

/** 구조화된 배송지가 있으면 그것을, 없으면(예전 주문) 한 줄 주소를 보여 준다. */
function addressText(order: OrderDetail): string {
  if (!order.address1) return order.shippingAddress;
  const zip = order.zipCode ? `(${order.zipCode}) ` : "";
  return [zip + order.address1, order.address2].filter(Boolean).join(" ");
}
const dateTime = (s: string | null) => (s ? serverTime(s).toLocaleString() : "-");

/**
 * 비회원 주문 조회(gateway#323). 로그인이 없으므로 게스트 토큰이 주문의 열쇠다 — 결제 완료 메일의 링크
 * (`?id=&token=`)로 바로 열리거나, 주문번호 + 주문할 때 적은 연락처로 order.api 에서 토큰을 받는다.
 * 상세·취소·반품·교환 화면은 마이페이지(customer.front)와 같고, 요청마다 X-Order-Guest-Token 을 싣는다.
 */
export default function GuestOrderPage() {
  // useSearchParams 는 정적 생성 때 Suspense 경계가 있어야 한다.
  return (
    <Suspense fallback={null}>
      <GuestOrder />
    </Suspense>
  );
}

function GuestOrder() {
  const params = useSearchParams();
  const linkId = params.get("id");
  const linkToken = params.get("token");
  // 메일 링크(?id=&token=)로 들어오면 그 값으로 바로 연다. 조회 폼으로 찾으면 그 결과가 이 값을 대신한다.
  const [lookedUp, setLookedUp] = useState<{ id: string; token: string } | null>(null);
  const access = lookedUp ?? (linkId && linkToken ? { id: linkId, token: linkToken } : null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");

  const load = (a: { id: string; token: string }) =>
    fetch(`/api/orders/${encodeURIComponent(a.id)}`, { headers: { "X-Order-Guest-Token": a.token } })
      .then((res) => {
        if (res.status === 404) throw new Error("주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.");
        if (!res.ok) throw new Error("주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        return res.json();
      })
      .then(setOrder)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    if (access) load(access);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열쇠(주문번호·토큰)가 바뀔 때만 다시 부른다
  }, [access?.id, access?.token]);

  const lookup = async () => {
    setError("");
    const res = await fetch("/api/orders/guest-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: Number(lookupId), phone: lookupPhone }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setError("주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.");
      return;
    }
    const found: { orderId: number; guestToken: string } = await res.json();
    const a = { id: String(found.orderId), token: found.guestToken };
    // 새로 고쳐도 다시 묻지 않게 주소에 남긴다 — 메일 링크와 같은 모양이다.
    window.history.replaceState(null, "", `/guest-order?id=${a.id}&token=${a.token}`);
    setLookedUp(a);
  };

  if (!access) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 32 }}>
        <h2>비회원 주문 조회</h2>
        <p className="text-muted">주문 완료 화면이나 주문 확인 메일의 주문번호와, 주문할 때 적은 연락처를 입력하세요.</p>
        <label htmlFor="guest-order-id" style={{ display: "block" }}>주문번호</label>
        <input id="guest-order-id" className="input" inputMode="numeric" value={lookupId}
          onChange={(e) => setLookupId(e.target.value.replace(/\D/g, ""))} style={{ width: "100%", marginBottom: 8 }} />
        <label htmlFor="guest-order-phone" style={{ display: "block" }}>연락처</label>
        <input id="guest-order-phone" className="input" value={lookupPhone}
          onChange={(e) => setLookupPhone(e.target.value)} style={{ width: "100%", marginBottom: 12 }} />
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        <button className="btn btn-primary blueprint" disabled={!lookupId || !lookupPhone} onClick={lookup}>
          <BlueprintCorners />
          주문 조회
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 32 }}>
      <Link href="/" className="text-muted">
        ← 쇼핑 계속하기
      </Link>
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      {order && (
        <>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            주문 #{order.id}
            <Tag variant={orderStatusVariant[order.status] ?? "neutral"}>
              {orderStatusLabel[order.status] ?? order.status}
            </Tag>
          </h2>
          <p className="text-muted" style={{ marginTop: 0 }}>
            주문일시 {dateTime(order.createdAt)}
          </p>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>주문 상품</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {order.items.map((item, i) => (
                <li
                  key={`${item.productId}-${i}`}
                  style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
                >
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{won(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>결제 금액</h4>
            <p style={{ margin: 0 }}>상품 합계: {won(order.subtotalPrice)}</p>
            {order.discountAmount > 0 && (
              <p style={{ margin: 0 }}>회원 등급 할인: -{won(order.discountAmount)}</p>
            )}
            <p style={{ margin: 0 }}>배송비: {order.shippingFee > 0 ? `+${won(order.shippingFee)}` : "무료"}</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>결제 금액: {won(order.totalPrice)}</p>
            <p className="text-muted" style={{ margin: 0 }}>
              결제일시 {dateTime(order.paidAt)}
            </p>
          </section>

          <section className="card blueprint elev-sm" style={{ marginBottom: 16 }}>
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>배송지</h4>
            <p style={{ margin: 0 }}>
              {order.recipientName ?? order.ordererName}
              {order.recipientPhone && ` · ${order.recipientPhone}`}
            </p>
            <p style={{ margin: 0 }}>{addressText(order)}</p>
          </section>

          <section className="card blueprint elev-sm">
            <BlueprintCorners />
            <h4 style={{ marginTop: 0 }}>배송 정보</h4>
            {order.shipment ? (
              <>
                <p style={{ margin: 0 }}>
                  {shipmentStatusLabel[order.shipment.status] ?? order.shipment.status} · {order.shipment.carrier}{" "}
                  {order.shipment.trackingNumber}
                </p>
                <p className="text-muted" style={{ margin: 0 }}>
                  출고 {dateTime(order.shipment.shippedAt)}
                  {order.shipment.deliveredAt && ` · 배송 완료 ${dateTime(order.shipment.deliveredAt)}`}
                </p>
                <a
                  href={trackingSearchUrl(order.shipment.carrier, order.shipment.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary blueprint"
                  style={{ marginTop: 8 }}
                >
                  <BlueprintCorners />
                  배송 조회
                </a>
              </>
            ) : (
              <p className="text-muted" style={{ margin: 0 }}>
                아직 출고 전입니다. 운송장이 등록되면 여기에 표시됩니다.
              </p>
            )}
          </section>

          <ClaimSection
            orderId={order.id}
            guestToken={access.token}
            status={order.status}
            shipment={order.shipment}
            items={order.items}
            claims={order.claims ?? []}
            onChanged={() => load(access)}
          />
        </>
      )}
    </div>
  );
}
