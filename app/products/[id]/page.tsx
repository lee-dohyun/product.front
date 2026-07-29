"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ProductDetail = {
  id: number;
  category: { id: number; name: string };
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  images: { id: number; imageUrl: string; sortOrder: number }[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => data && setProduct(data))
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
      </main>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="text-sm text-gray-500 mb-2">{product.category.name}</div>
      <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
      {product.images.length > 0 && (
        <div className="aspect-video bg-gray-100 rounded mb-4 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0].imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="text-xl font-semibold mb-2">
        {product.price.toLocaleString()}원
      </div>
      <div className="text-sm text-gray-600 mb-4">
        재고: {product.stockQuantity}개
      </div>
      {product.description && (
        <p className="whitespace-pre-wrap">{product.description}</p>
      )}
    </main>
  );
}
