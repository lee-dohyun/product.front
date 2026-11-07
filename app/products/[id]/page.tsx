import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchProductDetailOnServer, fetchSaleSuspendedOnServer } from "@/lib/product-server";
import { buildProductJsonLd, buildProductMetadata, serializeJsonLd } from "@/lib/product-seo";
import ProductDetailClient from "./ProductDetailClient";

/**
 * 상품 상세 - 서버 렌더(product.front#74).
 *
 * 예전에는 페이지 전체가 client 라 첫 HTML 본문이 "상품" 두 글자뿐이었다(검색엔진·공유 미리보기가
 * 상품명·가격을 못 읽음). 이제 서버가 상품을 조회해 첫 HTML 에 상품명·가격·이미지와 메타데이터를 넣고,
 * 옵션 선택·장바구니·찜·Q&A 는 ProductDetailClient 가 맡는다.
 *
 * 빌드 타임에 프리렌더하지 않는다 - 서버 조회 주소가 클러스터 내부라 GitHub 호스티드 러너의 빌드에서는
 * 풀리지 않는다(store.front#53). HTML 은 매 요청 렌더하되 product-api 호출은 revalidate 주기당 1회다.
 */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/** generateMetadata 와 페이지 본문이 같은 요청에서 한 번만 조회하게 한다. */
const loadProduct = cache((id: string) => fetchProductDetailOnServer(id));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadProduct(id);
  if (result.status === "ok") return buildProductMetadata(result.data);
  if (result.status === "not-found") return { title: "상품을 찾을 수 없습니다 | PosSelect", robots: { index: false } };
  // 조회 실패(일시적) - 공통 메타데이터를 쓴다. 색인 신호를 끄지는 않는다.
  return {};
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadProduct(id);
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return <ProductDetailClient productId={id} initialProduct={null} />;
  // 구조화 데이터(gateway#332) - 서버가 상품을 읽었을 때만 낸다.
  const saleSuspended = await fetchSaleSuspendedOnServer(id);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildProductJsonLd(result.data, saleSuspended)) }}
      />
      <ProductDetailClient productId={id} initialProduct={result.data} />
    </>
  );
}
