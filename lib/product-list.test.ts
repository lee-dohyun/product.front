import { describe, expect, it } from "vitest";
import { PAGE_SIZE, appendPage, fetchProductPage, productListUrl, type ProductSummary } from "./product-list";

const product = (id: number): ProductSummary => ({
  id,
  categoryId: 1,
  name: `상품 ${id}`,
  price: 1000,
  stockQuantity: 1,
  thumbnailUrl: null,
});

const respond = (items: ProductSummary[], total?: string, status = 200) =>
  (async () =>
    new Response(JSON.stringify(items), {
      status,
      headers: total === undefined ? {} : { "X-Total-Count": total },
    })) as unknown as typeof fetch;

describe("productListUrl", () => {
  it("page·size 를 항상 싣고 카테고리·검색어는 있을 때만", () => {
    expect(productListUrl({ category: null, q: null }, 0)).toBe(`/api/products?page=0&size=${PAGE_SIZE}`);
    expect(productListUrl({ category: "9003", q: "방울 토마토" }, 2)).toBe(
      `/api/products?categoryId=9003&q=%EB%B0%A9%EC%9A%B8+%ED%86%A0%EB%A7%88%ED%86%A0&page=2&size=${PAGE_SIZE}`,
    );
  });
});

describe("fetchProductPage", () => {
  it("전체 개수는 X-Total-Count 에서 읽는다", async () => {
    const page = await fetchProductPage({ category: null, q: null }, 0, respond([product(1)], "129"));
    expect(page).toEqual({ items: [product(1)], total: 129 });
  });
  it("헤더가 없거나 숫자가 아니면 받은 것이 전부다", async () => {
    const items = [product(1), product(2)];
    expect((await fetchProductPage({ category: null, q: null }, 0, respond(items))).total).toBe(2);
    expect((await fetchProductPage({ category: null, q: null }, 0, respond(items, "abc"))).total).toBe(2);
  });
  it("실패 응답은 던진다", async () => {
    await expect(fetchProductPage({ category: null, q: null }, 0, respond([], undefined, 500))).rejects.toThrow();
  });
});

describe("appendPage", () => {
  it("이미 있는 상품은 다시 붙이지 않는다", () => {
    expect(appendPage([product(3), product(2)], [product(2), product(1)]).map((p) => p.id)).toEqual([3, 2, 1]);
  });
});
