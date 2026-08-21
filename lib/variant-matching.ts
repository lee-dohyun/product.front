export type OptionValue = { id: number; value: string };
export type Option = { id: number; name: string; values: OptionValue[] };
export type VariantOptionValue = { optionId: number; optionName: string; valueId: number; value: string };
export type Variant = {
  id: number;
  sku: string | null;
  price: number;
  active: boolean;
  stockQuantity: number;
  optionValues: VariantOptionValue[];
};

/**
 * 상품의 옵션 조합(선택된 옵션값 id 목록)에 대응하는 variant를 찾는다.
 *
 * - 옵션이 없는 단일 상품(options.length === 0)이면 첫 번째 variant를 그대로 반환한다.
 * - 옵션이 있으면, 모든 옵션에 대해 variant가 보유한 옵션값 중 선택값과 일치하는 항목이
 *   있어야 매칭으로 간주한다(every). 하나라도 선택되지 않았거나(undefined) 판매하지 않는
 *   조합이면 매칭되는 variant가 없어 undefined를 반환한다.
 */
export function findMatchingVariant(
  variants: Variant[],
  options: Option[],
  selected: Record<number, number>
): Variant | undefined {
  if (options.length === 0) {
    return variants[0];
  }
  return variants.find((v) =>
    options.every((opt) =>
      v.optionValues.some((ov) => ov.optionId === opt.id && ov.valueId === selected[opt.id])
    )
  );
}
