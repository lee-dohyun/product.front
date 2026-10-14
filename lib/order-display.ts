/**
 * 비회원 주문 조회(gateway#323)의 표시 규칙 — customer.front lib/order.ts 에서 가져왔다(마이페이지와 같은 문구를
 * 써야 해서). 그쪽을 고치면 이쪽도 맞출 것.
 *
 * 원래 설명: 마이페이지 주문 목록·상세(gateway#321)에서 쓰는 표시 규칙. 금액·상태는 order.api 응답을 그대로 보여 주고,
 * 여기서는 라벨과 조회 기간 계산만 한다.
 */

export const orderStatusLabel: Record<string, string> = {
  CREATED: "결제 대기",
  PAID: "결제 완료",
  PREPARING: "상품 준비 중",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  CANCELLED: "주문 취소",
  REFUNDED: "환불 완료",
};

export const orderStatusVariant: Record<string, "warning" | "success" | "neutral"> = {
  CREATED: "warning",
  PAID: "success",
  PREPARING: "neutral",
  SHIPPED: "neutral",
  DELIVERED: "success",
  CANCELLED: "neutral",
  REFUNDED: "neutral",
};

export const shipmentStatusLabel: Record<string, string> = {
  PREPARING: "출고 준비 중",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
};

/**
 * order.api 의 시각 문자열을 Date 로. order.api 는 파드 시간대(UTC)의 LocalDateTime 을 오프셋 없이
 * 내려 준다("2026-10-04T07:13:28.85"). 그대로 new Date() 에 넣으면 브라우저가 한국 시각으로 읽어
 * 9시간 이르게 보인다 — 오프셋이 없으면 UTC 로 해석한다.
 */
export function serverTime(s: string): Date {
  return new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`);
}

/**
 * 배송 조회 링크. 택배사별 조회 주소는 관리자가 자유 입력하는 택배사 이름에 맞춰 추측해야 해서 쓰지 않고,
 * 택배사 이름과 운송장 번호로 검색 결과를 연다(검색 결과에 배송 조회 상자가 나온다).
 */
export function trackingSearchUrl(carrier: string, trackingNumber: string): string {
  return "https://search.naver.com/search.naver?query=" + encodeURIComponent(carrier + " " + trackingNumber);
}
