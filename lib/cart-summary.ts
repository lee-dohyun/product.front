/**
 * 장바구니 합계 줄의 금액(gateway#322). 배송비는 product.api 가 계산해 장바구니 응답에 실어 준 값을
 * 그대로 쓴다 — 여기서 정책을 다시 계산하지 않는다(주문이 청구하는 금액과 같은 식에서 나와야 한다).
 * 등급 할인은 상품 합계에만 적용되고 배송비는 깎지 않는다(order.api 와 같은 순서).
 */
export type CartSummary = {
  itemTotal: number;
  discount: number;
  shippingFee: number;
  payable: number;
  /** 할인이나 배송비가 있어 "상품 합계 / … / 결제 예정 금액"으로 나눠 보여야 하는가. */
  breakdown: boolean;
};

export function cartSummary(
  cart: { totalPrice: number; shippingFee?: number | null },
  expectedDiscount: number,
): CartSummary {
  const shippingFee = cart.shippingFee ?? 0;
  return {
    itemTotal: cart.totalPrice,
    discount: expectedDiscount,
    shippingFee,
    payable: cart.totalPrice - expectedDiscount + shippingFee,
    breakdown: expectedDiscount > 0 || shippingFee > 0,
  };
}
