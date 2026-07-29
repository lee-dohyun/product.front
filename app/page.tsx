"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <h1 className="text-2xl font-bold mb-6">상품 목록</h1>
      {products.length === 0 ? (
        <p className="text-gray-500">등록된 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                {product.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-sm text-gray-600">
                {product.price.toLocaleString()}원
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
