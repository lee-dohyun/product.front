/** 없는 상품 - 서버 렌더에서 notFound() 로 404 응답과 함께 그린다(product.front#74). 문구는 예전 client 화면과 같다. */
export default function ProductNotFound() {
  return (
    <main className="max-w-3xl mx-auto p-8">
      <p className="text-muted">상품을 찾을 수 없습니다.</p>
    </main>
  );
}
