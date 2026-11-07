import { describe, expect, it } from "vitest";
import type { ProductDetail } from "./product-server";
import { DEFAULT_OG_IMAGE, buildProductMetadata, productDescription } from "./product-seo";

const product = (over: Partial<ProductDetail> = {}): ProductDetail => ({
  id: 9128,
  category: { id: 1, name: "아동" },
  name: "색깔을 잃은 마을",
  description: "그림책입니다.",
  price: 21900,
  stockQuantity: 3,
  images: [
    { id: 2, imageUrl: "https://img/2.png", sortOrder: 1 },
    { id: 1, imageUrl: "https://img/1.png", sortOrder: 0 },
  ],
  options: [],
  variants: [],
  ...over,
});

describe("buildProductMetadata", () => {
  it("상품명·대표 이미지·canonical 을 낸다", () => {
    const m = buildProductMetadata(product());
    expect(m.title).toBe("색깔을 잃은 마을 | PosSelect");
    expect(m.alternates?.canonical).toBe("https://product.posselect.com/products/9128");
    expect(m.openGraph?.url).toBe("https://product.posselect.com/products/9128");
    expect(m.openGraph?.images).toEqual([{ url: "https://img/1.png", alt: "색깔을 잃은 마을" }]);
  });

  it("이미지가 없으면 대표 공유 이미지를 쓴다", () => {
    const m = buildProductMetadata(product({ images: [] }));
    expect(m.openGraph?.images).toEqual([{ url: DEFAULT_OG_IMAGE, alt: "색깔을 잃은 마을" }]);
  });
});

describe("productDescription", () => {
  it("상품명·가격을 앞에 둔다", () => {
    expect(productDescription(product())).toBe("색깔을 잃은 마을 21,900원 - 그림책입니다.");
  });

  it("설명이 없으면 카테고리로 끝낸다", () => {
    expect(productDescription(product({ description: null }))).toBe("색깔을 잃은 마을 21,900원 | 아동");
  });

  it("150자로 자른다", () => {
    expect(productDescription(product({ description: "가".repeat(400) }))).toHaveLength(150);
  });
});
