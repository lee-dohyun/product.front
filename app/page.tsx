import type { Metadata } from "next";
import { fetchFirstProductPageOnServer } from "@/lib/product-server";
import { PRODUCT_SITE_URL } from "@/lib/product-seo";
import ProductListClient from "./ProductListClient";

/**
 * 상품 목록 - 첫 쪽 서버 렌더(product.front#74).
 *
 * 빌드 타임에 프리렌더하지 않는다(서버 조회 주소가 클러스터 내부, store.front#53). HTML 은 매 요청 렌더하고
 * product-api 호출은 revalidate 주기당 1회다.
 */
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function single(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : null;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = single(params.q);
  const category = single(params.category);
  if (q) {
    // 검색 결과 쪽은 색인하지 않는다 - 검색어마다 얇은 중복 페이지가 생긴다.
    return { title: `"${q}" 검색 결과 | PosSelect`, robots: { index: false, follow: true } };
  }
  const canonical = category ? `${PRODUCT_SITE_URL}/?category=${encodeURIComponent(category)}` : `${PRODUCT_SITE_URL}/`;
  return { alternates: { canonical } };
}

export default async function ProductListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = single(params.category);
  const q = single(params.q);
  const result = await fetchFirstProductPageOnServer({ category, q });
  return (
    <ProductListClient
      key={`${category ?? ""}|${q ?? ""}`}
      category={category}
      q={q}
      initialPage={result.status === "ok" ? result.data : null}
    />
  );
}
