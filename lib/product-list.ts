/** 홈 상품 목록을 한 쪽씩 받는다(product.front#52). 서버 계약은 product.api#107. */

export type ProductSummary = {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  stockQuantity: number;
  thumbnailUrl: string | null;
};

export type ProductPage = { items: ProductSummary[]; total: number };

/** 그리드가 2·3·4열이라 어느 폭에서도 마지막 줄이 꽉 차는 수. */
export const PAGE_SIZE = 24;

export function productListUrl(filter: { category: string | null; q: string | null }, page: number): string {
  const params = new URLSearchParams();
  if (filter.category) params.set("categoryId", filter.category);
  if (filter.q) params.set("q", filter.q);
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));
  return `/api/products?${params.toString()}`;
}

/**
 * X-Total-Count 가 없으면(page/size 를 모르는 구버전 API 는 전부를 한 번에 준다) 받은 것이 전부라고 본다 -
 * 그러면 "더보기"가 안 뜨고 같은 목록을 다시 붙이지도 않는다.
 */
export async function fetchProductPage(
  filter: { category: string | null; q: string | null },
  page: number,
  fetcher: typeof fetch = fetch,
): Promise<ProductPage> {
  const res = await fetcher(productListUrl(filter, page));
  if (!res.ok) throw new Error(`product list ${res.status}`);
  const items = (await res.json()) as ProductSummary[];
  const header = res.headers.get("X-Total-Count");
  const total = header !== null && /^\d+$/.test(header) ? Number(header) : items.length;
  return { items, total };
}

/** 같은 상품이 두 번 들어가지 않게 이어 붙인다 - 쪽 사이에 새 상품이 등록되면 한 칸씩 밀려 겹친다. */
export function appendPage(current: ProductSummary[], next: ProductSummary[]): ProductSummary[] {
  const seen = new Set(current.map((p) => p.id));
  return [...current, ...next.filter((p) => !seen.has(p.id))];
}
