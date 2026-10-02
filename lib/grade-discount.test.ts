import { describe, expect, it } from "vitest";
import { gradeDiscountAmount } from "./grade-discount";

describe("gradeDiscountAmount", () => {
  it("할인율만큼 깎는다", () => {
    expect(gradeDiscountAmount(23700, 5)).toBe(1185);
    expect(gradeDiscountAmount(23700, 2)).toBe(474);
  });

  it("원 미만은 버린다 — order.api 와 같은 규칙", () => {
    expect(gradeDiscountAmount(990, 2)).toBe(19);
  });

  it("할인율이 0이거나 합계가 0이면 할인도 0", () => {
    expect(gradeDiscountAmount(23700, 0)).toBe(0);
    expect(gradeDiscountAmount(0, 5)).toBe(0);
  });
});
