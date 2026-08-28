/**
 * RAG 상품 Q&A API 클라이언트 (product.front#29)
 *
 * UI에서 fetch를 직접 부르지 않고 이 모듈을 거치는 이유는 **실패의 종류를 화면이 구분해야 하기
 * 때문**이다. 이 엔드포인트는 "잠깐 실패"와 "아직 안 켜짐"이 전혀 다른 안내를 요구하는데,
 * 백엔드는 둘 다 에러 응답으로 준다. 분류 로직을 컴포넌트에 두면 테스트가 어려워 여기로 뺐다.
 *
 * @author leedohyun
 * @since 2026-08-28
 * @see {@link https://github.com/lee-dohyun/product.front/issues/29}
 * @see {@link https://github.com/lee-dohyun/product.api/issues/46} 백엔드 RAG 엔드포인트
 */

/** 백엔드 ProductDtos.ProductSummaryResponse 와 1:1. 추천 결과 카드에 쓰는 필드만 좁혀 받는다. */
export type QaProduct = {
  id: number;
  name: string;
  price: number;
  thumbnailUrl: string | null;
  listPrice: number | null;
  ratingAvg: number | null;
  reviewCount: number | null;
  shippingBadge: string | null;
  freeShipping: boolean;
};

/** 백엔드 ProductQaDtos.ProductQaResponse 와 1:1. */
export type QaAnswer = {
  answer: string;
  products: QaProduct[];
};

/**
 * 화면이 서로 다른 문구를 보여줘야 하는 실패 종류.
 *
 * - `unavailable`: 503. LLM 자격증명이 아직 등록되지 않아 기능 자체가 꺼져 있는 상태다
 *   (product.api가 `RagUnavailableException` → 503). 재시도해도 소용없으므로 "준비 중"으로 안내한다.
 * - `failed`: 그 외 응답 오류·네트워크 오류·타임아웃. 재시도가 의미 있다.
 */
export type QaErrorKind = "unavailable" | "failed";

export class ProductQaError extends Error {
  readonly kind: QaErrorKind;

  constructor(kind: QaErrorKind, message: string) {
    super(message);
    this.name = "ProductQaError";
    this.kind = kind;
  }
}

/**
 * LLM 왕복은 임베딩 1회 + 채팅 완성 1회라 수 초가 걸린다. 게이트웨이/브라우저가 먼저 끊어
 * 원인 모를 실패로 보이는 것보다, 화면이 스스로 끊고 "다시 시도" 를 주는 편이 낫다.
 */
const TIMEOUT_MS = 30_000;

/**
 * 질문을 백엔드에 보내고 답변 + 추천 상품을 받는다.
 *
 * 게이트웨이가 `Path=/api/products/**` 로 product-api에 프록시하므로 동일 출처 fetch로 충분하다
 * (이 저장소는 route handler를 두지 않는다 — AGENTS.md §"자체 route handler가 하나도 없다").
 *
 * @throws {ProductQaError} 실패 종류를 `kind`로 구분해 던진다.
 */
export async function askProductQa(question: string, signal?: AbortSignal): Promise<QaAnswer> {
  // AbortSignal.timeout/any 를 쓰지 않는 것은 의도적이다 — jsdom(테스트 환경)과 구형 브라우저에서
  // 구현이 갈려 조용히 undefined 가 된다. 컨트롤러를 직접 다루면 어디서든 같게 동작한다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  let res: Response;
  try {
    res = await fetch("/api/products/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
  } catch {
    throw new ProductQaError("failed", "답변을 가져오지 못했습니다.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  if (res.status === 503) {
    throw new ProductQaError("unavailable", "AI 답변 기능이 아직 준비 중입니다.");
  }
  if (!res.ok) {
    throw new ProductQaError("failed", "답변을 가져오지 못했습니다.");
  }

  try {
    return (await res.json()) as QaAnswer;
  } catch {
    throw new ProductQaError("failed", "답변을 가져오지 못했습니다.");
  }
}

/**
 * 빈 입력으로 요청을 보내면 백엔드 `@NotBlank`에 걸려 400이 되고, 화면에는 원인을 알 수 없는
 * 실패로 보인다. 왕복 전에 여기서 거른다.
 */
export function isAskable(question: string): boolean {
  return question.trim().length > 0;
}
