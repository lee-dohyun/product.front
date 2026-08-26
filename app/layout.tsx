import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "상품",
  description: "PosSelect 상품 목록",
  icons: {
    icon: "https://image.posselect.com/cdn/favicons/favicon-transparent-red-256.png",
  },
  openGraph: {
    title: "상품 | PosSelect",
    description: "PosSelect 상품 목록",
    url: "https://product.posselect.com",
    siteName: "PosSelect",
    images: [
      {
        url: "https://image.posselect.com/cdn/logos/posselect-og-share.png",
        width: 1200,
        height: 630,
        alt: "PosSelect 대표 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "상품 | PosSelect",
    description: "PosSelect 상품 목록",
    images: ["https://image.posselect.com/cdn/logos/posselect-og-share.png"],
  },
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
