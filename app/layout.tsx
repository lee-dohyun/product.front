import type { Metadata } from "next";
import Script from "next/script";
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
        <Script src="https://shell.posselect.com/v1/header.js" strategy="beforeInteractive" />
        <posselect-header search-href="/" cart-api-base="" categories-api-base="" />
        {children}
        <Script src="https://shell.posselect.com/v1/footer.js" strategy="beforeInteractive" />
        <posselect-footer />
      </body>
    </html>
  );
}
