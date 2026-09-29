/**
 * 구매 규칙 거부 사유 표시(product.api#97).
 *
 * product.api(장바구니)와 order.api(주문)는 "지금 살 수 없음"을 409 + 사람이 읽는 평문 사유로 준다
 * (판매 기간 아님, 1회 최대 N개, 판매하지 않는 상품 등). 409 일 때만 그 문구를 그대로 보여 주고,
 * 그 밖의 오류(500 등)는 내부 메시지를 노출하지 않도록 호출부의 기본 문구를 쓴다.
 */
export function purchaseErrorMessage(status: number, body: string, fallback: string): string {
  const text = body.trim();
  if (status === 409 && text && text.length <= 200 && !text.startsWith("<") && !text.startsWith("{")) {
    return text;
  }
  return fallback;
}

export async function readPurchaseError(res: Response, fallback: string): Promise<string> {
  const body = await res.text().catch(() => "");
  return purchaseErrorMessage(res.status, body, fallback);
}
