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

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("categoryId", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    fetch(`/api/products${qs ? `?${qs}` : ""}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [category, q]);

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
              <div className="card-meta">{product.price.toLocaleString()}원</div>
            </Link>
          ))}
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
