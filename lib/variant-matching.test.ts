import { describe, expect, it } from "vitest";
import { findMatchingVariant, type Option, type Variant } from "./variant-matching";

const colorOption: Option = {
  id: 1,
  name: "색상",
  values: [
    { id: 11, value: "red" },
    { id: 12, value: "blue" },
  ],
};

const sizeOption: Option = {
  id: 2,
  name: "사이즈",
  values: [
    { id: 21, value: "S" },
    { id: 22, value: "M" },
  ],
};

function makeVariant(id: number, optionValues: Variant["optionValues"]): Variant {
  return {
    id,
    sku: `SKU-${id}`,
    price: 10000,
    active: true,
    stockQuantity: 5,
    optionValues,
  };
}

const redSmall = makeVariant(1, [
  { optionId: 1, optionName: "색상", valueId: 11, value: "red" },
  { optionId: 2, optionName: "사이즈", valueId: 21, value: "S" },
]);

const blueMedium = makeVariant(2, [
  { optionId: 1, optionName: "색상", valueId: 12, value: "blue" },
  { optionId: 2, optionName: "사이즈", valueId: 22, value: "M" },
]);

const variants = [redSmall, blueMedium];
const options = [colorOption, sizeOption];

describe("findMatchingVariant", () => {
  it("모든 옵션이 선택되어 일치하는 variant가 있으면 해당 variant를 반환한다", () => {
    const result = findMatchingVariant(variants, options, { 1: 11, 2: 21 });
    expect(result).toBe(redSmall);
  });

  it("다른 조합을 선택하면 그 조합에 맞는 variant를 반환한다", () => {
    const result = findMatchingVariant(variants, options, { 1: 12, 2: 22 });
    expect(result).toBe(blueMedium);
  });

  it("판매하지 않는 옵션 조합(존재하지 않는 조합)이면 undefined를 반환한다", () => {
    // red + M 조합은 variants 목록에 없다.
    const result = findMatchingVariant(variants, options, { 1: 11, 2: 22 });
    expect(result).toBeUndefined();
  });

  it("일부 옵션만 선택되어 있으면(나머지는 undefined) 매칭되지 않는다", () => {
    const result = findMatchingVariant(variants, options, { 1: 11 });
    expect(result).toBeUndefined();
  });

  it("옵션이 전혀 없는 단일 상품이면 첫 번째 variant를 그대로 반환한다", () => {
    const singleVariant = makeVariant(3, []);
    const result = findMatchingVariant([singleVariant, blueMedium], [], {});
    expect(result).toBe(singleVariant);
  });

  it("옵션이 없고 variants도 비어 있으면 undefined를 반환한다", () => {
    const result = findMatchingVariant([], [], {});
    expect(result).toBeUndefined();
  });

  it("선택값 객체가 비어 있으면(초기 상태) 옵션이 있는 상품은 매칭되지 않는다", () => {
    const result = findMatchingVariant(variants, options, {});
    expect(result).toBeUndefined();
  });
});
