/**
 * 주문 요청을 안전하게 다시 보내기 위한 도구(gateway#306).
 *
 * 배포 직후 첫 요청은 게이트웨이가 3초에 타임아웃(503)으로 끊는데 order.api 는 처리를 끝낸다 — 주문은
 * 만들어졌는데 화면은 실패다. order.api 가 `Idempotency-Key` 를 받으므로, 같은 키로 다시 보내면 새 주문이
 * 아니라 처음 만든 주문을 돌려받는다.
 */

/**
 * 주문 시도 하나에 멱등 키 하나를 붙인다. 주문 내용(요청 본문)이 같으면 같은 키를 돌려주고, 내용이
 * 바뀌면 새 키를 만든다 — order.api 는 같은 키에 다른 내용이 오면 거부한다(409).
 * 메모리에만 둔다. 화면을 새로 고치면 새 시도로 본다.
 */
export function createOrderAttempt() {
  let current: { body: string; key: string } | null = null;
  return {
    keyFor(body: string): string {
      if (current?.body !== body) {
        current = { body, key: crypto.randomUUID() };
      }
      return current.key;
    },
    /** 주문이 끝났다. 다음 주문은 내용이 같아도 새 주문이다. */
    clear() {
      current = null;
    },
  };
}

/** 서버가 판단을 내리지 못한 응답. 게이트웨이의 타임아웃 폴백(503)과 업스트림 연결 실패가 여기 온다. */
const TRANSIENT_STATUS = new Set([502, 503, 504]);

/**
 * 응답을 못 받았을 때(네트워크 예외, 502/503/504)만 한 번 더 보낸다. 4xx·500 은 서버가 판단한
 * 결과라 다시 보내도 같다.
 *
 * **멱등한 요청에만 쓸 것.** 다시 보내도 결과가 하나로 남는다는 보장(멱등 키, 서버의 상태 가드)이 없는
 * 요청에 쓰면 중복 처리가 된다.
 */
export async function fetchWithRetry(
  send: () => Promise<Response>,
  {
    retries = 1,
    delayMs = 1500,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  }: { retries?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= retries;
    try {
      const res = await send();
      if (last || !TRANSIENT_STATUS.has(res.status)) return res;
    } catch (e) {
      if (last) throw e;
    }
    await sleep(delayMs);
  }
}
