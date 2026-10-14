import { describe, expect, it } from "vitest";
import { available, claimMode, claimRequestBody } from "./claim";

const items = [
  { orderItemId: 1, quantity: 2, claimedQuantity: 0 },
  { orderItemId: 2, quantity: 1, claimedQuantity: 1 },
];
const now = new Date(Date.UTC(2026, 9, 14, 3, 0, 0));

describe("claimMode", () => {
  it("결제 전이면 전체 취소만", () => {
    expect(claimMode({ status: "CREATED", shipment: null, items }, now)).toBe("UNPAID_CANCEL");
  });

  it("결제 완료·운송장 전이면 취소", () => {
    expect(claimMode({ status: "PAID", shipment: null, items }, now)).toBe("CANCEL");
  });

  it("운송장이 등록되면(배송 중) 아무 신청도 받지 않는다", () => {
    expect(claimMode({ status: "SHIPPED", shipment: { deliveredAt: null }, items }, now)).toBeNull();
  });

  it("배송 완료 후 7일 안이면 반품 — 서버 시각(UTC, 오프셋 없음)으로 계산한다", () => {
    expect(claimMode({ status: "DELIVERED", shipment: { deliveredAt: "2026-10-07T03:00:00" }, items }, now)).toBe("RETURN");
    expect(claimMode({ status: "DELIVERED", shipment: { deliveredAt: "2026-10-07T02:59:00" }, items }, now)).toBeNull();
  });

  it("남은 수량이 없으면 아무 신청도 받지 않는다", () => {
    expect(claimMode({ status: "PAID", shipment: null, items: [{ orderItemId: 1, quantity: 1, claimedQuantity: 1 }] }, now)).toBeNull();
  });
});

describe("available / claimRequestBody", () => {
  it("아직 신청하지 않은 수량", () => {
    expect(available(items[0])).toBe(2);
    expect(available(items[1])).toBe(0);
  });

  it("0개 품목은 빼고, 취소에는 사유를 싣지 않는다", () => {
    expect(claimRequestBody("CANCEL", { 1: 1, 2: 0 }, "DEFECTIVE", "  ")).toEqual({
      type: "CANCEL", reasonType: null, reasonDetail: null, items: [{ orderItemId: 1, quantity: 1 }],
    });
  });

  it("반품은 사유를 싣는다", () => {
    expect(claimRequestBody("RETURN", { 1: 2 }, "CHANGE_OF_MIND", "사이즈")).toEqual({
      type: "RETURN", reasonType: "CHANGE_OF_MIND", reasonDetail: "사이즈", items: [{ orderItemId: 1, quantity: 2 }],
    });
  });

  it("아무것도 고르지 않으면 null", () => {
    expect(claimRequestBody("CANCEL", { 1: 0 }, null, "")).toBeNull();
  });

  it("교환은 품목마다 교환 옵션을 싣고, 하나라도 비면 null", () => {
    expect(claimRequestBody("EXCHANGE", { 1: 1 }, "DEFECTIVE", "", { 1: 202 })).toEqual({
      type: "EXCHANGE", reasonType: "DEFECTIVE", reasonDetail: null, items: [{ orderItemId: 1, quantity: 1, exchangeVariantId: 202 }],
    });
    expect(claimRequestBody("EXCHANGE", { 1: 1 }, "DEFECTIVE", "", {})).toBeNull();
  });
});
