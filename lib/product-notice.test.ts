import { describe, expect, it } from "vitest";
import { EMPTY, buildNoticeRows, buildSellerRows } from "./product-notice";

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
