import { describe, expect, it } from "vitest";
import { cartSummary } from "./cart-summary";

describe("cartSummary", () => {
  it("할인도 배송비도 없으면 합계 한 줄만 — 기존 화면 그대로", () => {
    expect(cartSummary({ totalPrice: 20000 }, 0)).toEqual({
      itemTotal: 20000, discount: 0, shippingFee: 0, payable: 20000, breakdown: false,
    });
  });

  it("배송비가 있으면 결제 예정 금액에 더하고 내역을 펼친다", () => {
    expect(cartSummary({ totalPrice: 20000, shippingFee: 3000 }, 0)).toEqual({
      itemTotal: 20000, discount: 0, shippingFee: 3000, payable: 23000, breakdown: true,
    });
  });

  it("등급 할인은 상품 합계에서만 빼고 배송비는 그대로 더한다", () => {
    expect(cartSummary({ totalPrice: 20000, shippingFee: 3000 }, 1000)).toEqual({
      itemTotal: 20000, discount: 1000, shippingFee: 3000, payable: 22000, breakdown: true,
    });
  });

  it("배송비 필드가 없는 응답(배포 순서상 옛 product.api)은 0원으로 본다", () => {
    expect(cartSummary({ totalPrice: 20000, shippingFee: undefined }, 500).payable).toBe(19500);
  });
});
