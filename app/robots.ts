import type { MetadataRoute } from "next";
import { PRODUCT_SITE_URL } from "@/lib/product-seo";

/**
 * /robots.txt (gateway#332). 지금은 전부 허용하고 sitemap 위치만 알린다.
 * - AI 크롤러 정책은 gateway#371 에서 결정 후 이 파일에 넣는다(아직 미결정이라 넣지 않았다).
 * - 비공개 영역 noindex 는 gateway#370 범위다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${PRODUCT_SITE_URL}/sitemap.xml`,
  };
}
