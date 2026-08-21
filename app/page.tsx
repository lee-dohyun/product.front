"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlueprintCorners, Tag } from "@posselect/ui";

type ProductSummary = {
  id: number;
  categoryId: number;
  name: string;
  price: number;
  stockQuantity: number;
  thumbnailUrl: string | null;
};

function ProductList() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("categoryId", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    fetch(`/api/products${qs ? `?${qs}` : ""}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setProducts(data);
        setPage(1); // Reset page on new search/category
      })
      .catch(() => setProducts([]));
  }, [category, q]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "new") return b.id - a.id;
    if (sort === "price_asc") return a.price - b.price;
    // 판매량 데이터가 없으므로 임시로 재고가 적은 순(많이 팔린 순)으로 정렬
    if (sort === "sales") return a.stockQuantity - b.stockQuantity;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / limit));
  const paginatedProducts = sortedProducts.slice((page - 1) * limit, page * limit);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="mb-0 text-2xl font-bold">{q ? `"${q}" 검색 결과` : "상품 목록"}</h1>
        <select 
          value={sort} 
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="p-2 border rounded-md"
        >
          <option value="new">신상품순</option>
          <option value="price_asc">낮은가격순</option>
          <option value="sales">판매량순</option>
        </select>
      </div>
      {products.length === 0 ? (
        <p className="text-muted">등록된 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {paginatedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="card blueprint elev-sm block"
            >
              <BlueprintCorners />
              <div className="duotone blueprint aspect-square overflow-hidden relative">
                <BlueprintCorners />
                {product.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                {product.stockQuantity === 0 && (
                  <Tag variant="danger" className="mb-2 inline-block">
                    품절
                  </Tag>
                )}
                <div className="card-title truncate mb-1">{product.name}</div>
                <div className="card-meta font-bold">{product.price.toLocaleString()}원</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8 items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-md disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-4 py-2 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-md disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </main>
  );
}

export default function ProductListPage() {
  return (
    <Suspense fallback={null}>
      <ProductList />
    </Suspense>
  );
}
