# product.front AI 개발 지침

> **캐논 참조**: 공통 개발 원칙(DB/트랜잭션/보안/배포 규칙 등)은 `~/msa/AGENTS.md`를 따른다.
> 이 문서에는 **이 저장소에서만 통하는 사실과 함정**만 적는다.

## 이 저장소는 무엇인가

`product.posselect.com`을 서비스하는 Next.js(App Router) **상품 카탈로그/장바구니/주문** 프론트엔드다.
게이트웨이 라우트 `product-front`가 `product-front.customer.svc.cluster.local:3000`으로 프록시하고,
K3s에는 `customer` 네임스페이스의 `deployment/product-front`로 떠 있다.

페이지: `/`(상품 목록), `/products/[id]`(상세), `/cart`(장바구니+주문서).

**자체 route handler가 하나도 없다.** 모든 데이터는 클라이언트에서 동일 출처로 `fetch`하고
게이트웨이가 백엔드로 프록시한다(`~/msa/customer/networkpolicy.yaml` [5]의 "product front는 서버사이드
API 호출 0건" 서술과 일치).

| 브라우저가 부르는 경로 | 게이트웨이 라우트 | 실제 백엔드 |
| --- | --- | --- |
| `/api/products/**`, `/api/categories/**`, `/api/cart/**` | `product-api` | product-api |
| `/api/orders/**` | `order-api` | order-api |
| `/api/auth/addresses/**` | `auth-api-addresses-product` | auth-api |

## 실제 함정 (전부 이 저장소 코드/게이트웨이 설정에서 확인된 것)

### 1. 이 호스트는 `optional-auth-hosts`다 — 비로그인도 통과하지만 신원은 조용히 달라진다

게이트웨이 `application.yml`의 `gateway.security.optional-auth-hosts` 기본값이
`product.posselect.com`이다. `JwtAuthenticationFilter`는 이 호스트에 대해 **로그인을 강제하지 않되,
`ACCESS_TOKEN` 쿠키가 있으면 검증해서 `X-User-Id`/`X-User-Email`/`X-User-Name` 헤더를 주입**한다.
비로그인 사용자도 상품/장바구니를 그대로 쓰고, 로그인된 경우에만 주문에 계정이 연결된다.

- 즉 같은 페이지가 **쿠키 유무에 따라 백엔드에서 다른 신원으로 처리된다.** 주문/장바구니 관련 변경은
  게스트 경로와 로그인 경로를 둘 다 확인해야 한다.
- 클라이언트가 `X-User-*` 헤더를 직접 실어 보내도 게이트웨이가 **항상 먼저 제거**한다(msa #87 인증우회
  패치). 이 저장소에서 그 헤더를 손대려는 시도는 하지 말 것.

### 2. 게이트웨이에 라우트가 없는 `/api/...`는 404가 아니라 "이 앱으로 떨어진다"

`product.posselect.com`의 라우트 목록은 위 표 3개 + catch-all `product-front`뿐이다. 새 API 경로
(예: `/api/wishlist`)를 화면에서 부르기 시작하면, 게이트웨이에 라우트를 추가하기 전까지 그 요청은
catch-all을 타고 **이 Next.js 앱으로 들어와 404**가 된다. 브라우저에서는 그냥 "API가 없다"로 보이지만
원인은 이 저장소가 아니라 게이트웨이 설정이다.

### 3. 이 호스트는 쓰기 요청이 게이트웨이에서 차단된다

라우트 `product-front-block-write`가 POST/PUT/PATCH/DELETE를 `SetStatus=403`으로 막는다
(msa #155 대응). 위 표의 API 라우트들이 먼저 채가므로 장바구니/주문은 정상 동작한다.

- **route handler에 `POST`를 추가하거나 Server Action을 쓰면 프로덕션에서 403**이다. 로컬 dev는
  게이트웨이를 안 거치므로 멀쩡히 돌아가서 배포 후에야 드러난다. 쓰기는 백엔드 API에 넣고
  게이트웨이 라우트를 추가할 것.

### 4. 로그인 전 접근이 필요한 경로는 게이트웨이 화이트리스트와 별개 관리 대상이다

지금은 이 호스트가 `optional-auth-hosts`라 `PUBLIC_EXACT_PATHS`가 조회되지 않는다. 하지만 이 호스트가
`protected-hosts`로 옮겨지는 순간, **페이지 경로와 그 페이지가 부르는 API 경로가 각각 별개의
화이트리스트 항목**이 된다(2026-08-02 `customer.front` `/verify` 인시던트, gateway 커밋 `0565a01`).
새 페이지/새 API를 추가할 때는 `.claude/agents/gateway-route-guard.md` 서브에이전트를 쓸 것.

### 5. `@posselect/ui`는 git 의존성이라 자동 반영되지 않는다

`"@posselect/ui": "github:lee-dohyun/posselect-ui"` + `next.config.ts`의 `transpilePackages`.
버전이 고정돼 있지 않고, posselect-ui를 고쳐도 **이 저장소를 다시 빌드해야** 반영된다(소비 저장소
5곳 각각). 이 저장소는 `BlueprintCorners`, `Tag`, `Button`, `Field`, `Input`, `Table`을 쓴다.

그리고 **정의되지 않은 CSS 변수는 조용히 죽는다** — posselect-ui `tokens.css`에 없는 변수를 배경색으로
쓰면 에러 없이 배경이 투명해져 텍스트만 흐릿하게 남는다(hero 배너 인시던트). 새 CSS 변수를 쓰기 전에
토큰 정의를 먼저 확인할 것. 헤더/푸터는 `app/layout.tsx`가 `shell.posselect.com/v1/{header,footer}.js`를
`beforeInteractive`로 불러오는 별도 저장소(`posselect-shell`) 소유다 — 여기서 고칠 수 없다.

### 6. 프로덕션 이미지는 최상위 파일을 골라서만 복사한다

`Dockerfile`의 production 스테이지는 `.next`, `node_modules`, `package.json`, `public`만 COPY하고
**`next.config.ts`는 복사하지 않는다.** 지금은 `transpilePackages`(빌드 타임 전용)만 있어서 문제가
없지만, `images`/`rewrites`/`headers` 같은 런타임 설정을 추가하면 Dockerfile도 같이 고쳐야 한다
(next.config.ts 누락으로 상품 이미지가 안 뜬 2026-08-20 `store.front` 사례).

### 7. CI는 타입/린트를 안 본다. main push = 즉시 프로덕션

`.github/workflows/docker-image.yml`은 Docker 빌드/푸시 성공만을 게이트로 삼고 `lint`/`typecheck`를
돌리지 않는다(Trivy도 `exit-code: "0"` 리포트 전용). 이어지는 `deploy` 잡이 self-hosted 러너에서
`kubectl set image deployment/product-front -n customer`를 실행한다.

→ push 전에 로컬에서 반드시 실행:

```bash
npm run typecheck   # tsc --noEmit
npm run lint
```

`.claude/hooks/pre-push-verify.sh`가 PreToolUse 훅으로 이걸 강제한다(정당한 사유가 있을 때만
`CLAUDE_SKIP_PUSH_VERIFY=1`).

## 작업 기록

`~/msa/AGENTS.md` §4의 Task Execution Workflow를 따른다. 이 저장소에 한정된 주의:

- **Draft Issue를 만들지 말 것.** 저장소에 연결되지 않은 Draft 카드는 추적이 끊기고, 과거 중복 카드가
  210여 건 쌓인 사고가 있었다. 반드시 `gh issue create -R lee-dohyun/product.front ...`로 **실제 저장소
  이슈**를 만든 뒤 GitHub Project #2에 연결하고 Status를 `In Progress`로 바꾼 다음 코드를 건드린다.
  (`gh`는 풀 경로 `~/.local/bin/gh`.)
- 완료 시 커밋 메시지의 `Closes #N` 또는 `gh issue close`로 반드시 닫는다.
- 상세 절차는 `msa-work-log` 스킬(사용자 레벨, 이 저장소 세션에서도 로드됨)을 따른다.

## 커밋

- 주석/문서 스타일은 `docs/COMMENT_STANDARDS.md`를 따른다.
- 문서·설정만 바꾼 커밋은 메시지 끝에 `[skip ci]` — 안 붙이면 불필요한 프로덕션 배포가 돈다.
