import { describe, expect, it } from "vitest";
import { purchaseErrorMessage } from "./api-error";

const FALLBACK = "장바구니에 담지 못했습니다.";

describe("purchaseErrorMessage", () => {
  it("409 평문 사유는 그대로 보여 준다", () => {
    expect(purchaseErrorMessage(409, "이 상품은 1회 최대 2개까지 구매할 수 있습니다.", FALLBACK)).toBe(
      "이 상품은 1회 최대 2개까지 구매할 수 있습니다.",
    );
  });
  it("409 가 아니면 기본 문구 — 500 내부 메시지를 노출하지 않는다", () => {
    expect(purchaseErrorMessage(500, "NullPointerException at ...", FALLBACK)).toBe(FALLBACK);
    expect(purchaseErrorMessage(404, "variant not found: 3", FALLBACK)).toBe(FALLBACK);
  });
  it("HTML·JSON·빈 본문·지나치게 긴 본문은 기본 문구", () => {
    expect(purchaseErrorMessage(409, "<html>…</html>", FALLBACK)).toBe(FALLBACK);
    expect(purchaseErrorMessage(409, '{"error":"x"}', FALLBACK)).toBe(FALLBACK);
    expect(purchaseErrorMessage(409, "  ", FALLBACK)).toBe(FALLBACK);
    expect(purchaseErrorMessage(409, "가".repeat(201), FALLBACK)).toBe(FALLBACK);
  });
});
