"use client";

import { useState } from "react";
import Link from "next/link";
import { BlueprintCorners, Button, Tag } from "@posselect/ui";
import { askProductQa, isAskable, ProductQaError, type QaAnswer } from "@/lib/product-qa";

/**
 * 자연어 상품 질의응답 패널 (product.front#29)
 *
 * 상세 페이지 하단에 두지만 **현재 상품에 대한 질문에 답하는 기능이 아니다.** 백엔드
 * `POST /api/products/qa` 는 `{ question }` 만 받아 카탈로그 전체에서 유사도 상위 5개를 찾고
 * 그 목록만 근거로 답한다(product.api `ProductQaService`). 상품 id를 받지 않으므로 "이 상품
 * 어때요?" 같은 지시대명사 질문에는 구조적으로 답할 수 없다. 그래서 문구를 "비슷한 상품 찾기"로
 * 잡고, 예시 질문에 현재 상품명을 박아 넣어 상세 페이지 맥락과 이어지게 했다.
 *
 * @author leedohyun
 * @since 2026-08-28
 * @see {@link https://github.com/lee-dohyun/product.front/issues/29}
 */
export default function ProductQa({ productName }: { productName: string }) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<QaAnswer | null>(null);
  const [error, setError] = useState<ProductQaError | null>(null);

  // 빈 화면에서 뭘 물어야 할지 모르는 것이 이런 입력창의 가장 큰 이탈 지점이라 예시를 눌러
  // 바로 보낼 수 있게 한다. 첫 항목만 현재 상품을 참조한다.
  const examples = [
    `${productName} 같은 상품 더 보여줘`,
    "3만원 이하로 선물하기 좋은 것",
    "재고 있는 것 중에 인기 많은 상품",
  ];

  const submit = async (raw: string) => {
    const q = raw.trim();
    if (!isAskable(q) || asking) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(await askProductQa(q));
    } catch (e) {
      setError(
        e instanceof ProductQaError ? e : new ProductQaError("failed", "답변을 가져오지 못했습니다."),
      );
    } finally {
      setAsking(false);
    }
  };

  const askExample = (example: string) => {
    setQuestion(example);
    void submit(example);
  };

  return (
    <section className="mt-8 pt-6" style={{ borderTop: "1px solid var(--color-divider)" }}>
      <h3 className="mb-1">AI 에게 물어보기</h3>
      <p className="text-sm text-muted mb-3">
        찾는 조건을 말로 적으면 카탈로그에서 어울리는 상품을 골라 설명해 드립니다.
      </p>

      <form
        className="flex gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(question);
        }}
      >
        <input
          className="input"
          style={{ flex: 1 }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예) 가볍고 오래 쓰는 노트북 추천해줘"
          aria-label="상품에 대해 묻고 싶은 내용"
          disabled={asking}
        />
        <Button type="submit" variant="primary" disabled={asking || !isAskable(question)}>
          {asking ? "찾는 중..." : "물어보기"}
        </Button>
      </form>

      <div className="flex gap-2 flex-wrap mb-4">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => askExample(example)}
            disabled={asking}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              cursor: asking ? "default" : "pointer",
              fontSize: "0.85rem",
              opacity: asking ? 0.5 : 1,
              padding: "var(--space-1) var(--space-2)",
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {/*
        LLM 왕복이 수 초 걸리므로 "눌렀는데 아무 반응 없다"로 보이지 않게 대기 상태를 명시한다.
        버튼 문구만으로는 스크롤 위치에 따라 안 보일 수 있어 결과 영역에도 같이 띄운다.
      */}
      {asking && (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          카탈로그를 뒤져 답을 만드는 중입니다. 몇 초 걸릴 수 있어요.
        </p>
      )}

      {error && (
        <div role="alert">
          <Tag variant={error.kind === "unavailable" ? "warning" : "danger"}>{error.message}</Tag>
          {error.kind === "failed" && (
            <div className="mt-2">
              <Button variant="secondary" onClick={() => void submit(question)}>
                다시 시도
              </Button>
            </div>
          )}
        </div>
      )}

      {answer && !asking && (
        <div aria-live="polite">
          <p className="whitespace-pre-wrap mb-4">{answer.answer}</p>
          {answer.products.length > 0 && (
            /*
              카드 마크업을 목록 페이지(app/page.tsx)와 똑같이 맞춘 것은 의도적이다. 설치된
              @posselect/ui(package-lock 고정 커밋 eae0b64)에는 ProductCard가 아직 없고, 그것 하나
              때문에 git 의존성 버전을 올리면 이 패키지를 쓰는 5개 저장소에 파급된다(#198에서
              일부러 고정한 상태). 상위 버전이 반영되는 시점에 ProductCard로 갈아탈 것.
            */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {answer.products.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="card blueprint elev-sm">
                  <BlueprintCorners />
                  <div className="duotone blueprint aspect-square overflow-hidden">
                    <BlueprintCorners />
                    {p.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnailUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="card-title truncate">{p.name}</div>
                  <div className="card-meta">{p.price.toLocaleString()}원</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
