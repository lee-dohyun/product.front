import type { Metadata } from "next";
import Link from "next/link";
import { Nav, Logo } from "@posselect/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "상품",
  description: "PosSelect 상품 목록",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Nav brand={<Logo size={20} />}>
          <Link href="/">상품</Link>
          <a href="https://customer.posselect.com/mypage">주문내역</a>
          <Link href="/cart">장바구니</Link>
        </Nav>
        {children}
      </body>
    </html>
  );
}
