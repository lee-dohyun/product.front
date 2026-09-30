"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Field, Figure, Tag } from "@posselect/ui";
import { findMatchingVariant, type Option, type Variant } from "@/lib/variant-matching";
import ProductQa from "./ProductQa";
import ProductNotice from "./ProductNotice";
import { readPurchaseError } from "@/lib/api-error";
import type { PublicPolicy } from "@/lib/product-notice";

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

/** 재고·판매 상태 태그. 판매 중단(product.api#100)이 품절보다 앞선다 — 재고와 무관하게 살 수 없다. */
function AvailabilityTag({ saleSuspended, hasVariant, soldOut, stock }: Readonly<{
  saleSuspended: boolean; hasVariant: boolean; soldOut: boolean; stock: number;
}>) {
  if (saleSuspended) return <Tag variant="danger">판매 중단</Tag>;
  if (!hasVariant) return <Tag variant="danger">이 옵션 조합은 판매하지 않습니다</Tag>;
  if (soldOut) return <Tag variant="danger">품절</Tag>;
  return <Tag variant={stock <= 5 ? "warning" : "success"}>재고 {stock}개</Tag>;
}

function cartButtonLabel(s: { saleSuspended: boolean; soldOut: boolean; added: boolean; adding: boolean }): string {
  if (s.saleSuspended) return "판매 중단";
  if (s.soldOut) return "품절";
  if (s.added) return "담았습니다";
  if (s.adding) return "담는 중...";
  return "장바구니 담기";
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({});
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  // 판매자 정지·해지로 판매 중단(product.api#100) — 상품은 보이지만 담기를 막는다. 서버도 409 로 막으므로
  // 조회에 실패하면 false(버튼을 열어 둔다)로 두고 서버 사유를 보여 준다.
  const [saleSuspended, setSaleSuspended] = useState(false);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}/policy`)
      .then((res) => (res.ok ? res.json() : null))
      .then((p: PublicPolicy | null) => setSaleSuspended(p?.saleSuspended === true))
      .catch(() => setSaleSuspended(false));
  }, [params.id]);

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
    setCartError(null);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant.id, quantity: 1 }),
      });
      // 예전에는 응답을 보지 않고 "담았습니다"를 띄웠다 — 판매 기간 밖·최대 수량 초과(409)도 성공처럼 보였다.
      if (!res.ok) {
        setCartError(await readPurchaseError(res, "장바구니에 담지 못했습니다. 잠시 후 다시 시도해 주세요."));
        return;
      }
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
        const res = await fetch(`/api/wishlists/${product.id}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error("Failed to remove from wishlist");
        setIsWishlisted(false);
      } else {
        const res = await fetch(`/api/wishlists?productId=${product.id}`, { method: "POST", credentials: "include" });
        if (!res.ok) throw new Error("Failed to add to wishlist");
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
        <AvailabilityTag saleSuspended={saleSuspended} hasVariant={!!selectedVariant} soldOut={soldOut} stock={displayStock} />
      </div>
      
      {cartError && (
        <p role="alert" className="text-sm mb-2" style={{ color: "var(--color-danger)" }}>
          {cartError}
        </p>
      )}
      <div className="flex gap-2 mb-4">
        <Button variant="primary" onClick={addToCart} disabled={adding || soldOut || saleSuspended} style={{ flex: 1 }}>
          {cartButtonLabel({ saleSuspended, soldOut: !selectedVariant || displayStock === 0, added, adding })}
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

      <ProductNotice productId={product.id} categoryId={product.category.id} />

      <ProductQa productName={product.name} />
    </main>
  );
}
