import { describe, expect, it } from "vitest";
import { isProductWishlisted } from "./wishlist";

describe("isProductWishlisted", () => {
  it("Spring Page 응답(content 배열)에서 찜한 상품을 찾는다", () => {
    const page = { content: [{ id: 1, productId: 7, productName: "A" }], last: true };
    expect(isProductWishlisted(page, "7")).toBe(true);
    expect(isProductWishlisted(page, 7)).toBe(true);
    expect(isProductWishlisted(page, "8")).toBe(false);
  });
  it("배열 응답도 받는다", () => {
    expect(isProductWishlisted([{ productId: 3 }], "3")).toBe(true);
  });
  it("비로그인·오류 본문 등 예상 밖 모양은 예외 없이 false", () => {
    expect(isProductWishlisted(null, "1")).toBe(false);
    expect(isProductWishlisted(undefined, "1")).toBe(false);
    expect(isProductWishlisted({ error: "x" }, "1")).toBe(false);
    expect(isProductWishlisted({ content: null }, "1")).toBe(false);
    expect(isProductWishlisted({ content: [null] }, "1")).toBe(false);
  });
});
