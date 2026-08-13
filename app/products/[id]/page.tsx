"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Figure, Tag } from "@posselect/ui";

type ProductDetail = {
  id: number;
  category: { id: number; name: string };
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  images: { id: number; imageUrl: string; sortOrder: number }[];
  variants: { id: number; sku: string | null; price: number; active: boolean; stockQuantity: number }[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

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

  const addToCart = async () => {
    // 옵션 선택 UI는 아직 없음 - 지금은 상품마다 variant가 정확히 1개(옵션 없음)이므로 그걸 담는다.
    const variant = product?.variants[0];
    if (!variant) return;
    setAdding(true);
    setAdded(false);
    try {
      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });
      setAdded(true);
    } finally {
      setAdding(false);
    }
  };

  if (notFound) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <p className="text-muted">상품을 찾을 수 없습니다.</p>
      </main>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="text-sm text-muted mb-2">{product.category.name}</div>
      <h1 className="mb-4">{product.name}</h1>
      {product.images.length > 0 && (
        <div className="mb-4">
          <Figure src={product.images[0].imageUrl} alt={product.name} />
        </div>
      )}
      <h3 className="mb-2">{product.price.toLocaleString()}원</h3>
      <div className="mb-4">
        {product.stockQuantity === 0 ? (
          <Tag variant="danger">품절</Tag>
        ) : product.stockQuantity <= 5 ? (
          <Tag variant="warning">재고 {product.stockQuantity}개</Tag>
        ) : (
          <Tag variant="success">재고 {product.stockQuantity}개</Tag>
        )}
      </div>
      <Button
        variant="primary"
        onClick={addToCart}
        disabled={adding || product.stockQuantity === 0}
        className="mb-4"
      >
        {product.stockQuantity === 0
          ? "품절"
          : added
            ? "담았습니다"
            : adding
              ? "담는 중..."
              : "장바구니 담기"}
      </Button>
      {product.description && (
        <p className="whitespace-pre-wrap">{product.description}</p>
      )}
    </main>
  );
}
