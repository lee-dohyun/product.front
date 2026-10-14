import { describe, expect, it } from "vitest";
import { serverTime, trackingSearchUrl } from "./order-display";

describe("serverTime", () => {
  it("오프셋 없는 order.api 시각은 UTC 로 읽는다 — UTC 15:00 은 한국 다음 날 0시", () => {
    expect(serverTime("2026-10-04T15:00:00").toISOString()).toBe("2026-10-04T15:00:00.000Z");
    expect(serverTime("2026-10-04T07:13:28.855985").getTime()).toBe(Date.UTC(2026, 9, 4, 7, 13, 28, 855));
  });

  it("오프셋이 있으면 그대로 쓴다", () => {
    expect(serverTime("2026-10-04T16:13:28+09:00").toISOString()).toBe("2026-10-04T07:13:28.000Z");
    expect(serverTime("2026-10-04T07:13:28Z").toISOString()).toBe("2026-10-04T07:13:28.000Z");
  });
});



describe("trackingSearchUrl", () => {
  it("택배사와 운송장 번호로 검색한다", () => {
    expect(trackingSearchUrl("CJ대한통운", "123456789012")).toBe(
      "https://search.naver.com/search.naver?query=CJ%EB%8C%80%ED%95%9C%ED%86%B5%EC%9A%B4%20123456789012",
    );
  });
});
