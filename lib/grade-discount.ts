/**
 * 회원 등급 할인 안내(gateway#81).
 *
 * 결제 금액은 order.api 가 주문 생성 시점에 확정한다(gateway#82). 여기 계산은 결제 전에 "얼마가
 * 빠질지"를 미리 보여 주기 위한 것이고, 규칙을 서버와 똑같이 맞춘다 — 원 미만 버림.
 */
export type MemberGrade = {
  grade: { code: string; name: string; discountRate: number };
};

/** GET /api/auth/me/grade 응답에서 할인 안내에 쓸 등급만 꺼낸다. 비로그인(401)·회원 정보 없음(404)·오류는 null. */
export async function fetchMemberGrade(): Promise<MemberGrade["grade"] | null> {
  try {
    const res = await fetch("/api/auth/me/grade", { credentials: "include" });
    if (!res.ok) return null;
    const body: MemberGrade = await res.json();
    return body.grade ?? null;
  } catch {
    return null;
  }
}

/** 등급 할인액(원). 할인율은 퍼센트 값(5 = 5%)이고 원 미만은 버린다. */
export function gradeDiscountAmount(subtotal: number, discountRate: number): number {
  if (subtotal <= 0 || discountRate <= 0) return 0;
  return Math.floor((subtotal * discountRate) / 100);
}
