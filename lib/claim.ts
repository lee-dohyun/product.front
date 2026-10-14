/**
 * customer.front lib/claim.ts 에서 가져왔다(gateway#323 비회원 주문 조회) — 그쪽을 고치면 이쪽도 맞출 것.
 *
 * 주문 상세의 상품별 취소·반품 신청(gateway#320) 규칙. 최종 판정은 order.api 가 한다 — 여기서는 버튼을 보일지,
 * 몇 개까지 고를 수 있게 할지만 정한다(서버 규칙: 출고 전 취소, 배송 완료 후 7일 안 반품, 결제 전은 전체 취소만).
 */
import { serverTime } from "./order-display";

export type ClaimMode = "CANCEL" | "RETURN" | "UNPAID_CANCEL" | null;

export type ClaimableItem = { orderItemId: number; quantity: number; claimedQuantity: number };

export const RETURN_WINDOW_DAYS = 7;

export const claimReasonLabel: Record<string, string> = {
  CHANGE_OF_MIND: "단순 변심",
  DEFECTIVE: "상품 불량·파손",
  WRONG_ITEM: "다른 상품이 왔어요",
};

export const claimTypeLabel: Record<string, string> = { CANCEL: "취소", RETURN: "반품", EXCHANGE: "교환" };

/** 교환은 판매자 사유만(gateway#320 결정 — 단순 변심 교환은 실결제 전까지 받지 않는다). */
export const exchangeReasons = ["DEFECTIVE", "WRONG_ITEM"] as const;

export const claimStatusLabel: Record<string, string> = {
  REQUESTED: "접수됨(검토 중)",
  APPROVED: "승인됨(교환 상품 발송 준비 중)",
  COMPLETED: "완료",
  REJECTED: "반려",
};

/** 아직 신청하지 않은 수량. */
export function available(item: ClaimableItem): number {
  return Math.max(0, item.quantity - item.claimedQuantity);
}

/** 지금 이 주문에 어떤 신청을 받을 수 있는가. */
export function claimMode(
  order: { status: string; shipment: { deliveredAt: string | null } | null; items: ClaimableItem[] },
  now: Date,
): ClaimMode {
  if (!order.items.some((i) => available(i) > 0)) return null;
  if (order.status === "CREATED") return "UNPAID_CANCEL";
  if (order.status === "PAID" && !order.shipment) return "CANCEL";
  if (order.status === "DELIVERED" && order.shipment?.deliveredAt) {
    const deadline = serverTime(order.shipment.deliveredAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() <= deadline) return "RETURN";
  }
  return null;
}

type ClaimLine = { orderItemId: number; quantity: number; exchangeVariantId?: number };

/**
 * 고른 수량으로 요청 본문을 만든다. 0개 품목은 빼고, 아무것도 없으면 null. 교환은 품목마다 교환 옵션이 있어야 하고
 * 하나라도 비면 null 이다({@code exchangePick} 은 orderItemId → variantId).
 */
export function claimRequestBody(
  mode: Exclude<ClaimMode, null> | "EXCHANGE",
  picked: Record<number, number>,
  reasonType: string | null,
  reasonDetail: string,
  exchangePick: Record<number, number> = {},
): { type: "CANCEL" | "RETURN" | "EXCHANGE"; reasonType: string | null; reasonDetail: string | null; items: ClaimLine[] } | null {
  const isExchange = mode === "EXCHANGE";
  const items: ClaimLine[] = [];
  for (const [id, q] of Object.entries(picked)) {
    if (q <= 0) continue;
    const line: ClaimLine = { orderItemId: Number(id), quantity: q };
    if (isExchange) {
      const variantId = exchangePick[Number(id)];
      if (!variantId) return null;
      line.exchangeVariantId = variantId;
    }
    items.push(line);
  }
  if (items.length === 0) return null;
  let type: "CANCEL" | "RETURN" | "EXCHANGE" = "CANCEL";
  if (mode === "RETURN") type = "RETURN";
  if (isExchange) type = "EXCHANGE";
  return {
    type,
    reasonType: type === "CANCEL" ? null : reasonType,
    reasonDetail: reasonDetail.trim() || null,
    items,
  };
}
