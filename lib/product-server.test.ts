import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFirstProductPageOnServer, fetchProductDetailOnServer, serverApiBase } from "./product-server";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("serverApiBase", () => {
  it("기본값은 클러스터 내부 주소다", () => {
    vi.stubEnv("PRODUCT_API_URL", "");
    expect(serverApiBase()).toBe("http://product-api.customer.svc.cluster.local:8080");
  });
});

describe("fetchProductDetailOnServer", () => {
  it("200 이면 상품을 돌려준다", async () => {
    const fetcher = vi.fn<(url: string) => Promise<Response>>(async () => json({ id: 7, name: "A" }));
    const result = await fetchProductDetailOnServer("7", fetcher as unknown as typeof fetch);
    expect(result).toEqual({ status: "ok", data: { id: 7, name: "A" } });
    expect(fetcher.mock.calls[0][0]).toBe("http://product-api.customer.svc.cluster.local:8080/api/products/7");
  });

  it("404 는 not-found", async () => {
    const result = await fetchProductDetailOnServer("7", (async () => json({}, 404)) as unknown as typeof fetch);
    expect(result).toEqual({ status: "not-found" });
  });

  it("5xx·네트워크 오류는 error(화면은 client 조회로 폴백)", async () => {
    expect(await fetchProductDetailOnServer("7", (async () => json({}, 503)) as unknown as typeof fetch)).toEqual({ status: "error" });
    const refused = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await fetchProductDetailOnServer("7", refused)).toEqual({ status: "error" });
  });

  it("숫자가 아닌 id 는 백엔드에 보내지 않고 not-found", async () => {
    const fetcher = vi.fn();
    expect(await fetchProductDetailOnServer("../admin", fetcher as unknown as typeof fetch)).toEqual({ status: "not-found" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("fetchFirstProductPageOnServer", () => {
  it("page·size 를 명시해 첫 쪽을 받는다(product.api#141 대비)", async () => {
    const fetcher = vi.fn<(url: string) => Promise<Response>>(async () => json([{ id: 1 }], 200, { "X-Total-Count": "30" }));
    const result = await fetchFirstProductPageOnServer({ category: "5", q: null }, fetcher as unknown as typeof fetch);
    expect(result).toEqual({ status: "ok", data: { items: [{ id: 1 }], total: 30 } });
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/products");
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("24");
    expect(url.searchParams.get("categoryId")).toBe("5");
  });

  it("실패는 error", async () => {
    expect(await fetchFirstProductPageOnServer({ category: null, q: null }, (async () => json([], 500)) as unknown as typeof fetch)).toEqual({ status: "error" });
  });
});
