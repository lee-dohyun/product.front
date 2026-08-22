"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BlueprintCorners, Tag, Pagination } from "@posselect/ui";

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
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    setPage(1);
    const params = new URLSearchParams();
    if (category) params.set("categoryId", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    fetch(`/api/products${qs ? `?${qs}` : ""}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [category, q]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "sales") return b.id - a.id; // 판매량 데이터가 없으므로 임시로 최신순 동일 처리
    return b.id - a.id; // newest
  });

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE) || 1;
  const pagedProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-end mb-6">
        <h1 className="m-0 text-2xl font-bold">{q ? `"${q}" 검색 결과` : "상품 목록"}</h1>
        <select 
          value={sort} 
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        >
          <option value="newest">신상품순</option>
          <option value="price_asc">낮은가격순</option>
          <option value="sales">판매량순</option>
        </select>
      </div>

      {products.length === 0 ? (
        <p className="text-muted">등록된 상품이 없습니다.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {pagedProducts.map((product) => (
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
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {product.stockQuantity <= 0 && (
                  <Tag variant="danger" className="self-start">
                    품절
                  </Tag>
                )}
                <div className="card-title truncate">{product.name}</div>
                <div className="card-meta">{product.price.toLocaleString()}원</div>
              </Link>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Pagination 
              page={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          </div>
        </>
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
