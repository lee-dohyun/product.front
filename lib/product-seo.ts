/**
 * 상품 상세·목록의 메타데이터(product.front#74).
 *
 * canonical·og:url 의 호스트는 이 앱이 실제로 서비스되는 product.posselect.com 이다.
 * 쇼핑몰 대표 호스트는 www.posselect.com(gateway#369)이지만 그 호스트에는 `/products/<id>` 가 없다
 * (2026-11-07 실측 404) - 상품 canonical 을 www 로 두면 존재하지 않는 주소를 가리키게 된다.
 * 상품 페이지가 www 아래로 옮겨지면 이 값만 바꾼다.
 */
import type { Metadata } from "next";
import type { ProductDetail } from "@/lib/product-server";

export const PRODUCT_SITE_URL = "https://product.posselect.com";
export const SITE_NAME = "PosSelect";
/** 상품 이미지가 없을 때 공유 미리보기에 쓰는 대표 이미지(app/layout.tsx 와 같은 값). */
export const DEFAULT_OG_IMAGE = "https://image.posselect.com/cdn/logos/posselect-og-share.png";

const DESCRIPTION_MAX = 150;

export function productUrl(id: number): string {
  return `${PRODUCT_SITE_URL}/products/${id}`;
}

export function formatWon(price: number): string {
  return `${Math.round(price).toLocaleString("ko-KR")}원`;
}

/** 검색 결과·공유 미리보기 설명. 상품 설명이 없으면 상품명·가격으로 만든다(지어낸 문구를 넣지 않는다). */
export function productDescription(product: Pick<ProductDetail, "name" | "price" | "description" | "category">): string {
  const lead = `${product.name} ${formatWon(product.price)}`;
  const body = product.description?.replace(/\s+/g, " ").trim();
  const text = body ? `${lead} - ${body}` : `${lead} | ${product.category.name}`;
  return text.length > DESCRIPTION_MAX ? `${text.slice(0, DESCRIPTION_MAX - 1)}…` : text;
}

export function primaryImage(product: Pick<ProductDetail, "images">): string | null {
  if (product.images.length === 0) return null;
  return [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl;
}

export function buildProductMetadata(product: ProductDetail): Metadata {
  const title = `${product.name} | ${SITE_NAME}`;
  const description = productDescription(product);
  const url = productUrl(product.id);
  const image = primaryImage(product) ?? DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
