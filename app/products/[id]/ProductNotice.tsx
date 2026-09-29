"use client";

import { useEffect, useState } from "react";
import { Table } from "@posselect/ui";
import {
  buildNoticeRows,
  buildSellerRows,
  SHOW_SELLER_INFO,
  type NoticeRow,
  type ProductAttribute,
  type PublicSellerInfo,
  type RequiredAttribute,
} from "@/lib/product-notice";

/**
 * 상품정보제공고시 + 판매자 정보(product.front#36). 둘 다 구매 전에 보여야 하는 법정 정보다.
 *
 * 세 요청은 서로 독립이라 하나가 실패해도 나머지는 보여 준다. 고시 요건이 없는 카테고리는 고시 표를
 * 숨긴다. 판매자 정보를 못 불러오면 조용히 숨기지 않고 실패 문구를 남긴다 — 법정 표시가 빠진 것이
 * 화면에서 드러나야 한다.
 */
export default function ProductNotice({ productId, categoryId }: { productId: number; categoryId: number }) {
  const [noticeRows, setNoticeRows] = useState<NoticeRow[]>([]);
  const [sellerRows, setSellerRows] = useState<NoticeRow[] | null>(null);
  const [sellerError, setSellerError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/categories/${categoryId}/requirement`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/products/${productId}/attributes`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([requirement, attributes]: [{ requiredAttributes: RequiredAttribute[] } | null, ProductAttribute[]]) => {
        setNoticeRows(buildNoticeRows(requirement?.requiredAttributes ?? [], attributes));
      })
      .catch(() => setNoticeRows([]));

    if (!SHOW_SELLER_INFO) return;
    fetch(`/api/products/${productId}/seller`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        setSellerRows(buildSellerRows((await r.json()) as PublicSellerInfo));
      })
      .catch(() => setSellerError(true));
  }, [productId, categoryId]);

  return (
    <section className="mt-8 flex flex-col gap-6">
      {noticeRows.length > 0 && <InfoTable title="상품정보제공고시" rows={noticeRows} />}
      {sellerRows && <InfoTable title="판매자 정보" rows={sellerRows} />}
      {sellerError && <p className="text-sm text-muted">판매자 정보를 불러오지 못했습니다.</p>}
    </section>
  );
}

function InfoTable({ title, rows }: { title: string; rows: NoticeRow[] }) {
  return (
    <div>
      <h3 className="mb-2">{title}</h3>
      <Table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th style={{ width: "40%", textAlign: "left" }}>{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
