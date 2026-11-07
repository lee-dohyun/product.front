import type { MetadataRoute } from "next";
import { fetchAllProductIdsOnServer } from "@/lib/product-server";
import { PRODUCT_SITE_URL, productUrl } from "@/lib/product-seo";

/**
 * /sitemap.xml - 상품 목록과 판매 중인 상품 상세(gateway#332).
 *
 * 빌드 타임에 만들지 않는다 - 조회 주소가 클러스터 내부라 GitHub 호스티드 러너 빌드에서 풀리지 않는다
 * (store.front#53). product-api 조회는 revalidate 주기로 캐시된다.
 * lastModified 는 넣지 않는다 - 목록 API 에 수정 시각이 없다(지어내지 않는다).
 * 조회에 실패하면 throw 해서 5xx 를 낸다 - 빈 sitemap 을 200 으로 주면 검색엔진이 상품이 사라진 것으로 읽는다.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await fetchAllProductIdsOnServer();
  if (result.status !== "ok") throw new Error("sitemap: product-api 조회 실패");
  return [
    { url: `${PRODUCT_SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...result.data.map((id) => ({ url: productUrl(id), changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
