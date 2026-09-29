/**
 * 상품 상세의 상품정보제공고시·판매자 정보 표 구성(product.front#36) — 순수 함수(단위 테스트 대상).
 *
 * 법적 근거: 「전자상거래 등에서의 상품 등의 정보제공에 관한 고시」(품목별 필수 항목)와
 * 전자상거래법상 통신판매업자 신원정보 — 둘 다 **청약(구매) 전에** 보여야 한다.
 *
 * 값이 없으면 지어내지 않고 "-" 로 둔다. 필수 항목이 비어 있는 것 자체가 판매자가 채워야 할 결손이고,
 * 그걸 화면에서 가리면 결손이 드러나지 않는다.
 */
/**
 * 판매자 정보 섹션 노출 스위치(product.front#38). **사업자 등록 전이라 끈다**(2026-09-29 사용자 결정).
 * 자사 판매자 데이터가 자리표시 값("대표자 미정 / 000-00-00000")이라 공개하면 안 된다.
 *
 * 다시 켜는 조건: 사업자 등록 + 통신판매업 신고 후 판매자 데이터를 실제 값으로 갱신했을 때.
 * 3P 판매자를 받기 전에는 반드시 켜야 한다 — 전자상거래법상 청약 전 제공 의무다.
 */
export const SHOW_SELLER_INFO = false;

export type RequiredAttribute = { code: string; label: string; required: boolean };
export type ProductAttribute = { code: string; value: string | null };
export type NoticeRow = { label: string; value: string };

export const EMPTY = "-";

function present(v: string | null | undefined): string {
  return v && v.trim() ? v : EMPTY;
}

/** 카테고리 요건 순서대로, 요건에 있는 항목만 행으로 만든다. 요건이 없는 카테고리는 빈 배열(섹션 숨김). */
export function buildNoticeRows(required: RequiredAttribute[], values: ProductAttribute[]): NoticeRow[] {
  const byCode = new Map(values.map((a) => [a.code, a.value]));
  return required.map((r) => ({ label: r.label, value: present(byCode.get(r.code)) }));
}

export type PublicSellerInfo = {
  name: string | null;
  representativeName: string | null;
  businessRegistrationNo: string | null;
  mailOrderSalesNo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  csContact: string | null;
};

/** 판매자 신원정보 표. 항목 순서·라벨은 통신판매업자 표시 관행을 따른다. */
export function buildSellerRows(s: PublicSellerInfo): NoticeRow[] {
  return [
    { label: "상호", value: present(s.name) },
    { label: "대표자", value: present(s.representativeName) },
    { label: "사업자등록번호", value: present(s.businessRegistrationNo) },
    { label: "통신판매업 신고번호", value: present(s.mailOrderSalesNo) },
    { label: "사업장 소재지", value: present(s.address) },
    { label: "전화번호", value: present(s.csContact ?? s.phone) },
    { label: "이메일", value: present(s.email) },
  ];
}

/** 상품 판매 정책 공개 조회(GET /api/products/{id}/policy, product.api#79) 중 표시에 쓰는 필드. */
export type PublicPolicy = {
  kcCertType: string | null;
  kcCertNumber: string | null;
  shippingFeeType: string | null;
  shippingFee: number | null;
  freeShippingThreshold: number | null;
  shippingLeadDays: number | null;
  jejuExtraFee: number | null;
  islandExtraFee: number | null;
  returnShippingFee: number | null;
  exchangeShippingFee: number | null;
  returnAddress: string | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  maxPurchaseQuantity: number | null;
};

const KC_LABEL: Record<string, string> = {
  SAFETY_CERT: "안전인증",
  SAFETY_CONFIRM: "안전확인",
  SUPPLIER_CONFORMITY: "공급자적합성확인",
};

function won(n: number | null): string {
  return n == null ? EMPTY : `${Number(n).toLocaleString("ko-KR")}원`;
}

function shippingText(p: PublicPolicy): string {
  switch (p.shippingFeeType) {
    case "FREE":
      return "무료배송";
    case "CONDITIONAL":
      return `${won(p.shippingFee)} (${won(p.freeShippingThreshold)} 이상 구매 시 무료)`;
    case "PAID":
      return won(p.shippingFee);
    default:
      return EMPTY;
  }
}

function dateTimeText(v: string | null): string {
  return v ? v.slice(0, 16).replace("T", " ") : "";
}

/**
 * "배송·교환·반품 안내" 표(product.front#40). 배송비·출고일·반품/교환 비용·반품지는 청약 전 제공 정보다.
 *
 * 판매자가 정책을 **하나도** 입력하지 않은 상품(#79 이전에 등록된 상품 전부)은 빈 배열 → 섹션을 숨긴다.
 * 모든 칸이 "-" 인 표는 정보가 아니라 잡음이다. 일부만 있으면 빈 칸은 "-"(지어내지 않는다).
 * 판매 기간·최대 구매 수량·KC 인증은 값이 있을 때만 행을 만든다(없음 = 제한 없음/대상 아님).
 */
export function buildPolicyRows(p: PublicPolicy | null): NoticeRow[] {
  if (!p) return [];
  const hasAny = p.shippingFeeType != null || p.returnShippingFee != null || p.returnAddress != null || p.shippingLeadDays != null;
  if (!hasAny) return [];

  const rows: NoticeRow[] = [
    { label: "배송비", value: shippingText(p) },
    { label: "출고 소요일", value: p.shippingLeadDays == null ? EMPTY : `결제 후 ${p.shippingLeadDays}영업일 이내 출고` },
  ];
  if (p.jejuExtraFee != null || p.islandExtraFee != null) {
    rows.push({ label: "제주·도서산간 추가 배송비", value: `제주 ${won(p.jejuExtraFee)} / 도서산간 ${won(p.islandExtraFee)}` });
  }
  rows.push(
    { label: "반품 배송비(편도)", value: won(p.returnShippingFee) },
    { label: "교환 배송비(왕복)", value: won(p.exchangeShippingFee) },
    { label: "반품·교환 주소", value: present(p.returnAddress) },
  );
  if (p.saleStartAt || p.saleEndAt) {
    rows.push({ label: "판매 기간", value: `${dateTimeText(p.saleStartAt)} ~ ${dateTimeText(p.saleEndAt)}`.trim() });
  }
  if (p.maxPurchaseQuantity != null) {
    rows.push({ label: "1회 최대 구매 수량", value: `${p.maxPurchaseQuantity}개` });
  }
  if (p.kcCertType && p.kcCertType !== "NONE") {
    rows.push({ label: "KC 인증", value: `${KC_LABEL[p.kcCertType] ?? p.kcCertType} ${present(p.kcCertNumber)}` });
  }
  return rows;
}
