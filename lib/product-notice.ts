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
