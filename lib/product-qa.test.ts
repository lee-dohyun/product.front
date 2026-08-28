import { afterEach, describe, expect, it, vi } from "vitest";
import { askProductQa, isAskable, ProductQaError } from "./product-qa";

function mockFetch(init: { status: number; body?: unknown; reject?: boolean }) {
  const fn = vi.fn(async () => {
    if (init.reject) throw new Error("network down");
    return {
      status: init.status,
      ok: init.status >= 200 && init.status < 300,
      json: async () => {
        if (init.body === undefined) throw new Error("not json");
        return init.body;
      },
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askProductQa", () => {
  it("200이면 답변과 추천 상품을 그대로 돌려준다", async () => {
    const payload = { answer: "이런 상품이 있습니다.", products: [{ id: 1, name: "노트북" }] };
    mockFetch({ status: 200, body: payload });

    await expect(askProductQa("가벼운 노트북")).resolves.toEqual(payload);
  });

  it("동일 출처 POST /api/products/qa 로 질문을 보낸다", async () => {
    // 이 저장소는 route handler를 두지 않고 게이트웨이가 product-api로 프록시한다.
    // 경로가 바뀌면 게이트웨이 라우트(Path=/api/products/**)와 어긋나므로 계약으로 고정한다.
    const fn = mockFetch({ status: 200, body: { answer: "", products: [] } });

    await askProductQa("질문");

    expect(fn).toHaveBeenCalledWith(
      "/api/products/qa",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ question: "질문" }) }),
    );
  });

  it("503은 unavailable — 키가 아직 없어 기능이 꺼진 상태라 재시도를 권하지 않는다", async () => {
    mockFetch({ status: 503 });

    await expect(askProductQa("질문")).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("500은 failed — 재시도가 의미 있는 실패다", async () => {
    mockFetch({ status: 500 });

    await expect(askProductQa("질문")).rejects.toMatchObject({ kind: "failed" });
  });

  it("네트워크 오류도 failed로 감싼다", async () => {
    mockFetch({ status: 0, reject: true });

    const err = await askProductQa("질문").catch((e) => e);
    expect(err).toBeInstanceOf(ProductQaError);
    expect(err.kind).toBe("failed");
  });

  it("200인데 본문이 JSON이 아니면 failed로 떨어진다", async () => {
    mockFetch({ status: 200 });

    await expect(askProductQa("질문")).rejects.toMatchObject({ kind: "failed" });
  });
});

describe("isAskable", () => {
  it("공백뿐인 질문은 보내지 않는다 — 백엔드 @NotBlank 400을 화면이 원인불명 실패로 보이게 한다", () => {
    expect(isAskable("   ")).toBe(false);
    expect(isAskable("")).toBe(false);
    expect(isAskable("노트북")).toBe(true);
  });
});
