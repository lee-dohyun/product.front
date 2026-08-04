"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BlueprintCorners, Tag } from "@posselect/ui";

type ProductSummary = {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  thumbnailUrl: string | null;
};

export default function ProductListPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : []))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="mb-6">상품 목록</h1>
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
