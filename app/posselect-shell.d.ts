import "react";

// posselect-shell(런타임 셸)이 정의하는 커스텀 엘리먼트. 이 저장소는 posselect-shell을 빌드
// 타임 의존성으로 설치하지 않는다(그게 이 아키텍처의 핵심) — 타입만 여기 직접 선언한다.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "posselect-header": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "search-href"?: string;
        "auth-api-base"?: string;
        "cart-api-base"?: string;
        "categories-api-base"?: string;
      };
      "posselect-footer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// posselect-shell/src/header.tsx가 window.posselect로 노출하는 전역 API. 마찬가지로 빌드
// 타임 의존성 없이 타입만 직접 선언한다.
declare global {
  interface Window {
    posselect?: {
      recentlyViewed?: {
        add(item: {
          id: number;
          name: string;
          price: number;
          imageUrl: string | null;
          href: string;
        }): void;
      };
    };
  }
}
