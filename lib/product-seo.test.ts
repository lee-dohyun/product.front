import { describe, expect, it } from "vitest";
import type { ProductDetail } from "./product-server";
import { DEFAULT_OG_IMAGE, buildProductJsonLd, buildProductMetadata, productDescription, serializeJsonLd } from "./product-seo";

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

describe("buildProductJsonLd", () => {
  const variant = (over: Partial<ProductDetail["variants"][number]> = {}) => ({
    id: 1, sku: null, price: 21900, active: true, stockQuantity: 5, optionValues: [], ...over,
  });

  it("Product + Offer(KRW·재고)를 낸다", () => {
    const ld = buildProductJsonLd(product({ variants: [variant()], brand: "리틀페이지" }), false);
    expect(ld).toMatchObject({
      "@type": "Product",
      name: "색깔을 잃은 마을",
      url: "https://product.posselect.com/products/9128",
      image: ["https://img/1.png", "https://img/2.png"],
      brand: { "@type": "Brand", name: "리틀페이지" },
      offers: { "@type": "Offer", priceCurrency: "KRW", price: 21900, availability: "https://schema.org/InStock" },
    });
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("살 수 있는 variant 가 없거나 판매 중단이면 OutOfStock", () => {
    const soldOut = buildProductJsonLd(product({ variants: [variant({ stockQuantity: 0 }), variant({ active: false })] }), false);
    expect(soldOut.offers).toMatchObject({ availability: "https://schema.org/OutOfStock" });
    const suspended = buildProductJsonLd(product({ variants: [variant()] }), true);
    expect(suspended.offers).toMatchObject({ availability: "https://schema.org/OutOfStock" });
  });
});

describe("serializeJsonLd", () => {
  it("</script> 주입을 막는다", () => {
    expect(serializeJsonLd({ name: "</script><script>x" })).not.toContain("</script>");
  });
});
