import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductQa from "./ProductQa";

// @posselect/ui는 git 의존성이라 테스트에서 실제 스타일까지 볼 이유가 없다. 이 테스트가 검증하는
// 것은 "어떤 상태에서 무엇을 보여주는가"이므로 최소 구현으로 대체해 UI 패키지 변경과 분리한다.
vi.mock("@posselect/ui", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
  Tag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  BlueprintCorners: () => null,
}));

function mockFetch(init: { status: number; body?: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: init.status,
      ok: init.status >= 200 && init.status < 300,
      json: async () => init.body,
    })) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const ask = () => fireEvent.click(screen.getByRole("button", { name: "물어보기" }));
const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("상품에 대해 묻고 싶은 내용"), { target: { value } });

describe("ProductQa", () => {
  it("답변과 추천 상품을 보여준다", async () => {
    mockFetch({
      status: 200,
      body: {
        answer: "가벼운 노트북으로는 A가 좋습니다.",
        products: [{ id: 7, name: "노트북 A", price: 1290000, thumbnailUrl: null }],
      },
    });
    render(<ProductQa productName="노트북 A" />);

    type("가벼운 노트북");
    ask();

    expect(await screen.findByText("가벼운 노트북으로는 A가 좋습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /노트북 A/ })).toHaveAttribute("href", "/products/7");
    expect(screen.getByText("1,290,000원")).toBeInTheDocument();
  });

  it("503이면 준비 중으로 안내하고 재시도 버튼을 내지 않는다", async () => {
    // 키 등록 전 프로덕션의 실제 상태다 — 눌러도 소용없는 재시도를 권하면 안 된다.
    mockFetch({ status: 503 });
    render(<ProductQa productName="노트북 A" />);

    type("질문");
    ask();

    expect(await screen.findByText("AI 답변 기능이 아직 준비 중입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("그 외 실패는 재시도 버튼을 준다", async () => {
    mockFetch({ status: 500 });
    render(<ProductQa productName="노트북 A" />);

    type("질문");
    ask();

    expect(await screen.findByText("답변을 가져오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("빈 질문으로는 요청하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<ProductQa productName="노트북 A" />);

    type("   ");
    ask();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("예시 질문을 누르면 그대로 질문이 된다", async () => {
    // 예시 첫 항목은 현재 상품명을 참조한다 — 상세 페이지 맥락과 이어지는 유일한 고리다.
    const fetchSpy = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ answer: "네", products: [] }),
    }));
    vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
    render(<ProductQa productName="노트북 A" />);

    fireEvent.click(screen.getByRole("button", { name: "노트북 A 같은 상품 더 보여줘" }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/products/qa",
        expect.objectContaining({ body: JSON.stringify({ question: "노트북 A 같은 상품 더 보여줘" }) }),
      ),
    );
  });
});
