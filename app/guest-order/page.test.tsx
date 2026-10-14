import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import GuestOrderPage from "./page";

// useSearchParams 를 실제 주소(window.location)에서 읽게 한다.
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const order = {
  id: 42, status: "PAID", ordererName: "홍길동", recipientName: "홍길동", recipientPhone: "010-1234-5678",
  zipCode: null, address1: null, address2: null, shippingAddress: "서울시 테스트로 1",
  subtotalPrice: 20000, discountAmount: 0, shippingFee: 0, totalPrice: 20000, gradeCode: null,
  items: [{ orderItemId: 7, claimedQuantity: 0, productId: 1, productName: "테스트 상품", price: 20000, quantity: 1, sellerName: null }],
  createdAt: "2026-10-14T01:00:00", paidAt: "2026-10-14T01:01:00", shipment: null, claims: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("비회원 주문 조회 (gateway#323)", () => {
  it("주문번호와 연락처로 토큰을 받아 상세를 연다 — 상세 요청에 게스트 토큰을 싣는다", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url === "/api/orders/guest-lookup") return json({ orderId: 42, guestToken: "tok-1" });
      return json(order);
    }));
    render(<GuestOrderPage />);

    fireEvent.change(screen.getByLabelText("주문번호"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "010-1234-5678" } });
    screen.getByRole("button", { name: "주문 조회" }).click();

    expect(await screen.findByText("테스트 상품 × 1")).toBeInTheDocument();
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ orderId: 42, phone: "010-1234-5678" });
    const detail = calls.find((c) => c.url === "/api/orders/42");
    expect((detail?.init?.headers as Record<string, string>)["X-Order-Guest-Token"]).toBe("tok-1");
    expect(window.location.search).toBe("?id=42&token=tok-1");
    // 출고 전 비회원 주문도 취소할 수 있다
    expect(screen.getByRole("button", { name: "주문 취소" })).toBeInTheDocument();
  });

  it("메일 링크(?id=&token=)로 들어오면 묻지 않고 바로 연다", async () => {
    window.history.replaceState(null, "", "/guest-order?id=42&token=tok-1");
    vi.stubGlobal("fetch", vi.fn(async () => json(order)));
    render(<GuestOrderPage />);

    expect(await screen.findByText("테스트 상품 × 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("주문번호")).not.toBeInTheDocument();
  });

  it("주문번호·연락처가 맞지 않으면 어느 쪽이 틀렸는지 말하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    render(<GuestOrderPage />);

    fireEvent.change(screen.getByLabelText("주문번호"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "010-0000-0000" } });
    screen.getByRole("button", { name: "주문 조회" }).click();

    expect(await screen.findByText("주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요.")).toBeInTheDocument();
  });
});
