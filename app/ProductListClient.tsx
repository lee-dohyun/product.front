"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BlueprintCorners, Button, Tag } from "@posselect/ui";
import { PAGE_SIZE, appendPage, fetchProductPage, type ProductPage, type ProductSummary } from "@/lib/product-list";

/**
 * 상품 목록의 상호작용 부분(product.front#74).
 *
 * 첫 쪽은 서버 렌더가 받아 `initialPage` 로 넘긴다 - 상품명·가격이 첫 HTML 에 들어간다. "더보기"(#52)는
 * 지금처럼 브라우저가 같은 출처 `/api/products` 로 다음 쪽을 받는다. 카테고리·검색어가 바뀌면 page.tsx 가
 * key 를 바꿔 이 컴포넌트를 새 첫 쪽으로 다시 만든다. 서버 조회가 실패하면 null 로 오고, 그때만 첫 쪽도
 * 브라우저에서 받는다(폴백).
 */
export default function ProductListClient({ category, q, initialPage }: Readonly<{
  category: string | null;
  q: string | null;
  initialPage: ProductPage | null;
}>) {
  const [products, setProducts] = useState<ProductSummary[]>(initialPage?.items ?? []);
  const [total, setTotal] = useState(initialPage?.total ?? 0);
  const [nextPage, setNextPage] = useState(initialPage ? 1 : 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  // 카테고리·검색어가 바뀐 뒤 도착한 이전 조건의 응답을 버린다.
  const filterKey = `${category ?? ""}|${q ?? ""}`;
  const latestFilterKey = useRef(filterKey);

  useEffect(() => {
    latestFilterKey.current = filterKey;
    if (initialPage) return;
    let cancelled = false;
    fetchProductPage({ category, q }, 0)
      .then((page) => {
        if (cancelled) return;
        setProducts(page.items);
        setTotal(page.total);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setTotal(0);
      })
      .finally(() => {
        if (cancelled) return;
        setNextPage(1);
        setLoadingMore(false);
        setLoadMoreFailed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, q, filterKey, initialPage]);

  const loadMore = async () => {
    const requestedFor = filterKey;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await fetchProductPage({ category, q }, nextPage);
      if (latestFilterKey.current !== requestedFor) return;
      setProducts((current) => appendPage(current, page.items));
      setTotal(page.total);
      setNextPage(nextPage + 1);
    } catch {
      if (latestFilterKey.current === requestedFor) setLoadMoreFailed(true);
    } finally {
      if (latestFilterKey.current === requestedFor) setLoadingMore(false);
    }
  };

  const hasMore = nextPage * PAGE_SIZE < total;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="mb-6">{q ? `"${q}" 검색 결과` : "상품 목록"}</h1>
      {products.length === 0 ? (
        <p className="text-muted">등록된 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="card blueprint elev-sm"
            >
              <BlueprintCorners />
              <div className="duotone blueprint aspect-square overflow-hidden">
                <BlueprintCorners />
                {product.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {product.stockQuantity === 0 && (
                <Tag variant="danger" className="self-start">
                  품절
                </Tag>
              )}
              <div className="card-title truncate">{product.name}</div>
              <div className="card-meta">{`${product.price.toLocaleString("ko-KR")}원`}</div>
            </Link>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          {loadMoreFailed && <p className="text-muted">상품을 더 불러오지 못했습니다. 다시 시도해 주세요.</p>}
          <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "불러오는 중…" : `더보기 (${products.length} / ${total})`}
          </Button>
        </div>
      )}
    </main>
  );
}
