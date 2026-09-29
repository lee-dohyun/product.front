import { describe, expect, it } from "vitest";
import { EMPTY, buildNoticeRows, buildPolicyRows, buildSellerRows, type PublicPolicy } from "./product-notice";

describe("buildNoticeRows", () => {
  const required = [
    { code: "origin", label: "원산지", required: true },
    { code: "manufacturer", label: "제조사", required: true },
  ];

  it("요건 순서대로, 값이 없으면 '-' — 지어내지 않는다", () => {
    expect(buildNoticeRows(required, [{ code: "manufacturer", value: "포스셀렉트" }])).toEqual([
      { label: "원산지", value: EMPTY },
      { label: "제조사", value: "포스셀렉트" },
    ]);
  });

  it("공백만 있는 값도 빈 값으로 본다", () => {
    expect(buildNoticeRows(required, [{ code: "origin", value: "  " }])[0].value).toBe(EMPTY);
  });

  it("요건에 없는 코드는 표시하지 않는다", () => {
    expect(buildNoticeRows(required, [{ code: "unknown", value: "x" }]).map((r) => r.label)).toEqual([
      "원산지",
      "제조사",
    ]);
  });

  it("요건이 없는 카테고리는 빈 배열", () => {
    expect(buildNoticeRows([], [{ code: "origin", value: "국산" }])).toEqual([]);
  });
});

describe("buildSellerRows", () => {
  it("통신판매업 신고번호가 없으면 '-', CS 연락처가 있으면 전화번호보다 우선", () => {
    const rows = buildSellerRows({
      name: "포스셀렉트",
      representativeName: "홍길동",
      businessRegistrationNo: "123-45-67890",
      mailOrderSalesNo: null,
      address: "서울",
      phone: "02-000-0000",
      email: "cs@example.com",
      csContact: "1588-0000",
    });
    expect(rows.find((r) => r.label === "통신판매업 신고번호")?.value).toBe(EMPTY);
    expect(rows.find((r) => r.label === "전화번호")?.value).toBe("1588-0000");
  });
});

describe("buildPolicyRows", () => {
  const none: PublicPolicy = {
    kcCertType: null, kcCertNumber: null, shippingFeeType: null, shippingFee: null, freeShippingThreshold: null,
    shippingLeadDays: null, jejuExtraFee: null, islandExtraFee: null, returnShippingFee: null,
    exchangeShippingFee: null, returnAddress: null, saleStartAt: null, saleEndAt: null, maxPurchaseQuantity: null,
  };
  const value = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === label)?.value;

  it("정책이 하나도 없으면 빈 배열(섹션 숨김) — #79 이전 상품", () => {
    expect(buildPolicyRows(none)).toEqual([]);
    expect(buildPolicyRows(null)).toEqual([]);
  });

  it("조건부 무료배송 문구, 출고일, 반품비, 빈 교환비는 '-'", () => {
    const rows = buildPolicyRows({
      ...none, shippingFeeType: "CONDITIONAL", shippingFee: 3000, freeShippingThreshold: 50000,
      shippingLeadDays: 2, returnShippingFee: 3000, returnAddress: "서울",
    });
    expect(value(rows, "배송비")).toBe("3,000원 (50,000원 이상 구매 시 무료)");
    expect(value(rows, "출고 소요일")).toBe("결제 후 2영업일 이내 출고");
    expect(value(rows, "반품 배송비(편도)")).toBe("3,000원");
    expect(value(rows, "교환 배송비(왕복)")).toBe(EMPTY);
  });

  it("판매 기간·최대 수량·KC 는 값이 있을 때만 행이 생긴다", () => {
    const base = { ...none, shippingFeeType: "FREE" };
    expect(buildPolicyRows(base).map((r) => r.label)).not.toContain("KC 인증");
    const rows = buildPolicyRows({
      ...base, kcCertType: "SAFETY_CERT", kcCertNumber: "HU071234-1001", maxPurchaseQuantity: 5,
      saleStartAt: "2026-10-01T09:00:00", saleEndAt: null,
    });
    expect(value(rows, "배송비")).toBe("무료배송");
    expect(value(rows, "KC 인증")).toBe("안전인증 HU071234-1001");
    expect(value(rows, "1회 최대 구매 수량")).toBe("5개");
    expect(value(rows, "판매 기간")).toBe("2026-10-01 09:00 ~");
  });

  it("KC 대상 아님(NONE)은 표시하지 않는다", () => {
    expect(buildPolicyRows({ ...none, shippingFeeType: "FREE", kcCertType: "NONE" }).map((r) => r.label)).not.toContain("KC 인증");
  });
});
