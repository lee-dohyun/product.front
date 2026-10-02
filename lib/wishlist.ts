/**
 * 찜 상품 ID 목록 응답에서 특정 상품이 찜 되어 있는지 판정한다.
 *
 * product.api 의 GET /api/wishlists/product-ids 는 로그인 사용자의 찜 상품 ID 전체를
 * 페이지 없이 숫자 배열(`[3, 7]`)로 돌려준다. 예전에는 GET /api/wishlists(Page, 최대 100건)를
 * 읽어서, 100개 넘게 찜한 사용자는 뒤쪽 상품이 "찜 안 함"으로 보였다(product.api#10).
 * 비로그인(400/401 등)으로 본문이 다른 모양이어도 false 를 돌려준다.
 */
export function isProductWishlisted(payload: unknown, productId: number | string): boolean {
  if (!Array.isArray(payload)) return false;
  return payload.some((id) => id != null && String(id) === String(productId));
}
