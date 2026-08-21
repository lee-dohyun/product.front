# product.front

`product.api`가 제공하는 상품 정보를 보여주는 Next.js(App Router) 프론트엔드. 프로덕션 도메인은
`product.posselect.com`이고, K3s에는 `customer` 네임스페이스의 `deployment/product-front`로 떠 있다.

`customer.front`와 동일하게 **자체 API 라우트가 하나도 없다.** 같은 오리진의 `/api/...`를 클라이언트에서
직접 fetch하고, 게이트웨이가 각 경로를 백엔드로 프록시하는 것을 전제로 한다.

## 페이지

- `/` — 상품 목록 (`?category=`, `?q=` 지원)
- `/products/[id]` — 상품 상세
- `/cart` — 장바구니 + 주문서(배송지 선택 포함)

## 브라우저가 부르는 경로와 게이트웨이 라우트

| 경로 | 라우트 id | 백엔드 |
| --- | --- | --- |
| `/api/products/**`, `/api/categories/**`, `/api/cart/**` | `product-api` | product.api |
| `/api/orders/**` | `order-api` | order.api |
| `/api/auth/addresses/**` | `auth-api-addresses-product` | auth.api |

이 표에 없는 `/api/...`는 게이트웨이 catch-all을 타고 이 앱으로 들어와 404가 된다. 또한 게이트웨이
`product-front-block-write` 라우트가 위 경로 외의 POST/PUT/PATCH/DELETE를 403으로 막으므로, 이 저장소에
POST route handler나 Server Action을 추가할 수 없다. 자세한 내용은 `AGENTS.md`와
`.claude/agents/gateway-route-guard.md` 참고.

이 호스트는 게이트웨이의 `optional-auth-hosts`라 로그인을 강제하지 않는다 — 쿠키가 있으면 검증해서
`X-User-*`를 주입하고, 없으면 게스트로 통과시킨다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000

npm run typecheck  # tsc --noEmit — push 전 필수
npm run lint
```

로컬에서는 게이트웨이를 거치지 않으므로 위의 라우팅/쓰기 차단 동작이 재현되지 않는다.

## 배포

`.github/workflows/docker-image.yml` — main push 시 Docker 이미지 빌드/푸시 후 self-hosted 러너에서
`kubectl set image deployment/product-front -n customer`. **main push = 즉시 프로덕션 반영**이며 CI는
lint/typecheck를 돌리지 않는다. 문서/설정만 바꾼 커밋에는 `[skip ci]`.
