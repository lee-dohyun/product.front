import { describe, expect, it, vi } from "vitest";
import { createOrderAttempt, fetchWithRetry } from "./order-submit";

const noSleep = () => Promise.resolve();
const res = (status: number) => new Response(null, { status });

describe("createOrderAttempt", () => {
  it("같은 주문 내용이면 같은 키를 다시 준다 — 재시도가 같은 주문에 묶인다", () => {
    const attempt = createOrderAttempt();
    const key = attempt.keyFor('{"items":[1]}');
    expect(attempt.keyFor('{"items":[1]}')).toBe(key);
    expect(key).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
  });
  it("주문 내용이 바뀌면 새 키를 준다", () => {
    const attempt = createOrderAttempt();
    const key = attempt.keyFor('{"items":[1]}');
    expect(attempt.keyFor('{"items":[1,2]}')).not.toBe(key);
  });
  it("주문이 끝난 뒤(clear) 같은 내용으로 다시 주문하면 새 주문이다", () => {
    const attempt = createOrderAttempt();
    const key = attempt.keyFor('{"items":[1]}');
    attempt.clear();
    expect(attempt.keyFor('{"items":[1]}')).not.toBe(key);
  });
});

describe("fetchWithRetry", () => {
  it("게이트웨이 일시 오류(503)면 한 번 더 보내고 그 응답을 돌려준다", async () => {
    const send = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(201));
    const result = await fetchWithRetry(send, { sleep: noSleep });
    expect(result.status).toBe(201);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("요청이 서버에 닿지 못해도(예외) 한 번 더 보낸다", async () => {
    const send = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(res(201));
    expect((await fetchWithRetry(send, { sleep: noSleep })).status).toBe(201);
  });
  it("정해진 횟수를 넘으면 마지막 결과를 그대로 낸다", async () => {
    const send = vi.fn().mockResolvedValue(res(503));
    expect((await fetchWithRetry(send, { sleep: noSleep })).status).toBe(503);
    expect(send).toHaveBeenCalledTimes(2);

    const failing = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchWithRetry(failing, { sleep: noSleep })).rejects.toThrow("fetch failed");
  });
  it("서버가 판단을 내린 응답(4xx, 500)은 다시 보내지 않는다", async () => {
    for (const status of [400, 404, 409, 500]) {
      const send = vi.fn().mockResolvedValue(res(status));
      expect((await fetchWithRetry(send, { sleep: noSleep })).status).toBe(status);
      expect(send).toHaveBeenCalledTimes(1);
    }
  });
});
