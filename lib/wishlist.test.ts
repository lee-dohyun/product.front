import { describe, expect, it } from "vitest";
import { isProductWishlisted } from "./wishlist";

describe("isProductWishlisted", () => {
  it("찜 상품 ID 배열에서 해당 상품을 찾는다", () => {
    expect(isProductWishlisted([3, 7, 9128], "7")).toBe(true);
    expect(isProductWishlisted([3, 7, 9128], 9128)).toBe(true);
    expect(isProductWishlisted([3, 7, 9128], "8")).toBe(false);
    expect(isProductWishlisted([], "8")).toBe(false);
  });
  it("찜이 100개를 넘어도 뒤쪽 상품을 찾는다", () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    expect(isProductWishlisted(ids, "250")).toBe(true);
  });
  it("비로그인·오류 본문 등 예상 밖 모양은 예외 없이 false", () => {
    expect(isProductWishlisted(null, "1")).toBe(false);
    expect(isProductWishlisted(undefined, "1")).toBe(false);
    expect(isProductWishlisted({ error: "x" }, "1")).toBe(false);
    expect(isProductWishlisted({ content: [{ productId: 1 }] }, "1")).toBe(false);
    expect(isProductWishlisted([null], "1")).toBe(false);
  });
});
