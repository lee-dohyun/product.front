"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Figure, Tag } from "@posselect/ui";

type OptionValue = { id: number; value: string };
type Option = { id: number; name: string; values: OptionValue[] };
type VariantOptionValue = { optionId: number; optionName: string; valueId: number; value: string };
type Variant = {
  id: number;
  sku: string | null;
  price: number;
  active: boolean;
  stockQuantity: number;
  optionValues: VariantOptionValue[];
};

type WishlistItem = { id: number; productId: number; productName: string };

type ProductDetail = {
  id: number;
  category: { id: number; name: string };
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  images: { id: number; imageUrl: string; sortOrder: number }[];
  options: Option[];
  variants: Variant[];
};

function findMatchingVariant(
  variants: Variant[],
  options: Option[],
  selected: Record<number, number>
): Variant | undefined {
  if (options.length === 0) {
    return variants[0];
  }
  return variants.find((v) =>
    options.every((opt) =>
      v.optionValues.some((ov) => ov.optionId === opt.id && ov.valueId === selected[opt.id])
    )
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data: ProductDetail | null) => {
        if (!data) return;
        setProduct(data);
        const first = data.variants[0];
        if (first) {
          const initial: Record<number, number> = {};
          first.optionValues.forEach((ov) => {
            initial[ov.optionId] = ov.valueId;
          });
          setSelectedValues(initial);
        }
        // posselect-shell(런타임 셸)이 window.posselect로 노출하는 전역 함수 — 빌드 타임
        // 의존성 없이 <script> 태그로만 셸을 로드하는 아키텍처라 import가 아니라 이 경로로
        // 호출한다. beforeInteractive 스크립트가 아직 실행 전이거나 로드 실패한 경우를 대비해
        // optional chaining으로 안전하게 무시한다.
        window.posselect?.recentlyViewed?.add({
          id: data.id,
          name: data.name,
          price: data.price,
          imageUrl: data.images[0]?.imageUrl ?? null,
          href: `${window.location.origin}/products/${data.id}`,
        });
      })
      .catch(() => setNotFound(true));

    // Fetch wishlist status
    fetch("/api/wishlists", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((wishlists: WishlistItem[]) => {
        const wishlisted = wishlists.some((item) => String(item.productId) === params.id);
        setIsWishlisted(wishlisted);
      })
      .catch(() => setIsWishlisted(false));
  }, [params.id]);

  const selectedVariant = useMemo(() => {
    if (!product) return undefined;
    return findMatchingVariant(product.variants, product.options, selectedValues);
  }, [product, selectedValues]);

  const addToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true);
    setAdded(false);
    try {
      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant.id, quantity: 1 }),
      });
      setAdded(true);
    } finally {
      setAdding(false);
    }
  };

  const toggleWishlist = async () => {
    if (!product || togglingWishlist) return;
    setTogglingWishlist(true);
    try {
      if (isWishlisted) {
        await fetch(`/api/wishlists/${product.id}`, { method: "DELETE", credentials: "include" });
        setIsWishlisted(false);
      } else {
        await fetch(`/api/wishlists?productId=${product.id}`, { method: "POST", credentials: "include" });
        setIsWishlisted(true);
      }
    } catch (e) {
      console.error(e);
      alert("찜하기 처리에 실패했습니다. 로그인 상태를 확인해주세요.");
    } finally {
      setTogglingWishlist(false);
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

  const displayPrice = selectedVariant?.price ?? product.price;
  const displayStock = selectedVariant?.stockQuantity ?? 0;
  const soldOut = !selectedVariant || displayStock === 0 || !selectedVariant.active;

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="text-sm text-muted mb-2">{product.category.name}</div>
      <h1 className="mb-4">{product.name}</h1>
      {product.images.length > 0 && (
        <div className="mb-4">
          <Figure src={product.images[0].imageUrl} alt={product.name} />
        </div>
      )}
      <h3 className="mb-2">{displayPrice.toLocaleString()}원</h3>

      {product.options.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {product.options.map((option) => (
            <Field key={option.id} label={option.name}>
              <select
                className="input"
                value={selectedValues[option.id] ?? ""}
                onChange={(e) =>
                  setSelectedValues({ ...selectedValues, [option.id]: Number(e.target.value) })
                }
              >
                {option.values.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.value}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      )}

      <div className="mb-4">
        {!selectedVariant ? (
          <Tag variant="danger">이 옵션 조합은 판매하지 않습니다</Tag>
        ) : soldOut ? (
          <Tag variant="danger">품절</Tag>
        ) : displayStock <= 5 ? (
          <Tag variant="warning">재고 {displayStock}개</Tag>
        ) : (
          <Tag variant="success">재고 {displayStock}개</Tag>
        )}
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button variant="primary" onClick={addToCart} disabled={adding || soldOut} style={{ flex: 1 }}>
          {!selectedVariant || displayStock === 0
            ? "품절"
            : added
              ? "담았습니다"
              : adding
                ? "담는 중..."
                : "장바구니 담기"}
        </Button>
        <Button
          variant="secondary"
          onClick={toggleWishlist}
          disabled={togglingWishlist}
          style={{ width: "120px", color: isWishlisted ? "var(--color-danger)" : undefined }}
        >
          {togglingWishlist ? "처리중..." : isWishlisted ? "♥ 찜 취소" : "♡ 찜하기"}
        </Button>
      </div>

      {product.description && (
        <p className="whitespace-pre-wrap">{product.description}</p>
      )}
    </main>
  );
}
