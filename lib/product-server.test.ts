import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAllProductIdsOnServer,
  fetchFirstProductPageOnServer,
  fetchProductDetailOnServer,
  fetchSaleSuspendedOnServer,
  serverApiBase,
} from "./product-server";

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

describe("fetchAllProductIdsOnServer", () => {
  it("X-Total-Count 까지 page 를 넘기며 size=100 으로 모은다", async () => {
    const pages = [
      Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })),
      [{ id: 101 }, { id: 102 }],
    ];
    const fetcher = vi.fn<(url: string) => Promise<Response>>(async (url) => {
      const page = Number(new URL(url).searchParams.get("page"));
      return json(pages[page] ?? [], 200, { "X-Total-Count": "102" });
    });
    const result = await fetchAllProductIdsOnServer(fetcher as unknown as typeof fetch);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.data).toHaveLength(102);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("size")).toBe("100");
  });

  it("한 쪽이라도 실패하면 error", async () => {
    const fetcher = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      new URL(url).searchParams.get("page") === "0"
        ? json(Array.from({ length: 100 }, (_, i) => ({ id: i })), 200, { "X-Total-Count": "150" })
        : json([], 500),
    );
    expect(await fetchAllProductIdsOnServer(fetcher as unknown as typeof fetch)).toEqual({ status: "error" });
  });
});

describe("fetchSaleSuspendedOnServer", () => {
  it("saleSuspended 를 읽고, 실패하면 null", async () => {
    expect(await fetchSaleSuspendedOnServer("7", (async () => json({ saleSuspended: true })) as unknown as typeof fetch)).toBe(true);
    expect(await fetchSaleSuspendedOnServer("7", (async () => json({}, 500)) as unknown as typeof fetch)).toBeNull();
  });
});
