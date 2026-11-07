/**
 * 서버 컴포넌트 전용 product-api 조회(product.front#74).
 *
 * 브라우저는 지금처럼 같은 출처 `/api/**`(게이트웨이)로 부르고, 서버 렌더만 클러스터 내부 주소로 직접 부른다.
 * 두 base URL 을 섞지 않는다 - 이 파일의 함수는 client 컴포넌트에서 import 하지 말 것.
 *
 * - 빌드 타임 프리렌더 금지: 빌드는 GitHub 호스티드 러너라 클러스터 DNS 가 풀리지 않는다(store.front#53).
 *   이 함수를 부르는 페이지는 `dynamic = "force-dynamic"` 이어야 한다.
 * - 로그인 상태에 따라 달라지는 값(등급 할인가·찜)은 여기서 읽지 않는다. 쿠키를 전달하지 않으므로
 *   product-api 는 항상 비로그인 신원으로 응답하고, 캐시된 응답에 남의 값이 섞이지 않는다.
 * - 재고·판매 상태는 revalidate 주기만큼 늦을 수 있다. 구매 판단에 쓰는 값은 client 가 다시 읽는다.
 */
import type { Option, Variant } from "@/lib/variant-matching";
import { productListUrl, type ProductPage, type ProductSummary } from "@/lib/product-list";

export type ProductDetail = {
  id: number;
  category: { id: number; name: string };
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  images: { id: number; imageUrl: string; sortOrder: number }[];
  options: Option[];
  variants: Variant[];
  /** 없거나 null 일 수 있다(구버전 응답). 구조화 데이터에만 쓴다. */
  brand?: string | null;
};

export type ServerResult<T> =
  | { status: "ok"; data: T }
  | { status: "not-found" }
  /** 네트워크·5xx·netpol 거부 등. 화면은 client 조회로 폴백한다(netpol 은 새 파드 직후 몇 초간 거부될 수 있다). */
  | { status: "error" };

/** product-api 응답을 서버에서 다시 쓰는 주기(초). 상품명·가격 반영 지연의 상한이다. */
export const SERVER_REVALIDATE_SECONDS = 60;

const SERVER_TIMEOUT_MS = 3000;

export function serverApiBase(): string {
  return process.env.PRODUCT_API_URL || "http://product-api.customer.svc.cluster.local:8080";
}

async function serverFetch(path: string, fetcher: typeof fetch): Promise<Response> {
  return fetcher(`${serverApiBase()}${path}`, {
    next: { revalidate: SERVER_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
  } as RequestInit);
}

export async function fetchProductDetailOnServer(
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<ServerResult<ProductDetail>> {
  // 숫자가 아닌 id 는 백엔드에 보내지 않는다 - 경로 조작(`../`) 방지 겸 400 대신 404 로 통일.
  if (!/^\d{1,18}$/.test(id)) return { status: "not-found" };
  try {
    const res = await serverFetch(`/api/products/${id}`, fetcher);
    if (res.status === 404) return { status: "not-found" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data: (await res.json()) as ProductDetail };
  } catch {
    return { status: "error" };
  }
}

/**
 * 목록 첫 쪽. page·size 를 항상 명시한다 - 공개 목록 기본 페이징 강제(product.api#141)가 들어와도
 * 같은 결과가 나오게.
 */
export async function fetchFirstProductPageOnServer(
  filter: { category: string | null; q: string | null },
  fetcher: typeof fetch = fetch,
): Promise<ServerResult<ProductPage>> {
  try {
    const res = await serverFetch(productListUrl(filter, 0), fetcher);
    if (!res.ok) return { status: "error" };
    const items = (await res.json()) as ProductSummary[];
    const header = res.headers.get("X-Total-Count");
    const total = header !== null && /^\d+$/.test(header) ? Number(header) : items.length;
    return { status: "ok", data: { items, total } };
  } catch {
    return { status: "error" };
  }
}

/**
 * 판매 중단 여부(product.api#100) - 구조화 데이터의 availability 에만 쓴다(gateway#332).
 * 조회에 실패하면 null(모름). 화면의 판매 중단 표시는 지금처럼 client 가 읽는다.
 */
export async function fetchSaleSuspendedOnServer(id: string, fetcher: typeof fetch = fetch): Promise<boolean | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  try {
    const res = await serverFetch(`/api/products/${id}/policy`, fetcher);
    if (!res.ok) return null;
    const body = (await res.json()) as { saleSuspended?: unknown };
    return body.saleSuspended === true;
  } catch {
    return null;
  }
}

/**
 * sitemap 용 전체 상품 id. size 는 product-api 상한(MAX_PAGE_SIZE=100)에 맞추고 page 를 명시한다.
 * 한 쪽이라도 실패하면 error - 일부만 담은 sitemap 은 나머지 상품이 사라진 것으로 읽힌다.
 */
export const SITEMAP_PAGE_SIZE = 100;
const SITEMAP_MAX_PAGES = 400; // 4만 개 - sitemap 한 파일 상한(5만 URL) 아래.

export async function fetchAllProductIdsOnServer(fetcher: typeof fetch = fetch): Promise<ServerResult<number[]>> {
  const ids: number[] = [];
  try {
    for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
      const res = await serverFetch(`/api/products?page=${page}&size=${SITEMAP_PAGE_SIZE}`, fetcher);
      if (!res.ok) return { status: "error" };
      const items = (await res.json()) as { id: number }[];
      ids.push(...items.map((p) => p.id));
      const header = res.headers.get("X-Total-Count");
      const total = header !== null && /^\d+$/.test(header) ? Number(header) : null;
      // X-Total-Count 가 없으면(page 를 모르는 구버전 API) 한 번에 전부 준 것으로 본다.
      if (total === null || items.length < SITEMAP_PAGE_SIZE || ids.length >= total) break;
    }
  } catch {
    return { status: "error" };
  }
  return { status: "ok", data: [...new Set(ids)] };
}
