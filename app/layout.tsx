import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "상품",
  description: "leedohyun.com 상품 목록",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b p-4 flex justify-between items-center max-w-5xl mx-auto">
          <Link href="/" className="font-bold">
            상품
          </Link>
          <Link href="/cart" className="text-sm text-gray-600 hover:text-black">
            장바구니
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
