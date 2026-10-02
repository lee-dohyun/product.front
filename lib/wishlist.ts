/**
 * 찜 목록 응답에서 특정 상품이 찜 되어 있는지 판정한다.
 *
 * product.api 의 GET /api/wishlists 는 배열이 아니라 Spring Page(`{ content: [...] }`)를 돌려준다.
 * 배열로 가정하고 `.some` 을 부르면 TypeError 가 나 "찜 안 함"으로 조용히 떨어지고,
 * 이미 찜한 상품에서 다시 POST(409)만 반복돼 상세 화면에서 찜을 취소할 수 없게 된다(product.api#10).
 * 비로그인(400/401 등)으로 본문이 다른 모양이어도 false 를 돌려준다.
 */
type WishlistEntry = { productId: number | string };

export function isProductWishlisted(payload: unknown, productId: number | string): boolean {
  const items: unknown = Array.isArray(payload)
    ? payload
    : (payload as { content?: unknown } | null | undefined)?.content;
  if (!Array.isArray(items)) return false;
  return (items as WishlistEntry[]).some((item) => item != null && String(item.productId) === String(productId));
}

/** 한 번에 조회하는 찜 개수. 이보다 많이 찜한 경우는 POST 409(이미 찜함)로 상태를 바로잡는다. */
export const WISHLIST_STATUS_PAGE_SIZE = 100;
