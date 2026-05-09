import { describe, expect, test } from "bun:test";
import { getTickerFromRequest } from "./yahoo";

describe("getTickerFromRequest", () => {
  test("returns null for missing ticker", () => {
    const req = new Request("https://example.com/api/perf");
    expect(getTickerFromRequest(req)).toBeNull();
  });

  test("returns null for empty ticker", () => {
    const req = new Request("https://example.com/api/perf?ticker=");
    expect(getTickerFromRequest(req)).toBeNull();
  });

  test("returns uppercase trimmed ticker for valid input", () => {
    const req = new Request("https://example.com/api/perf?ticker=  aapl  ");
    expect(getTickerFromRequest(req)).toBe("AAPL");
  });

  test("returns null for ticker exceeding MAX_TICKER_LENGTH", () => {
    const largeTicker = "A".repeat(21);
    const req = new Request(`https://example.com/api/perf?ticker=${largeTicker}`);
    expect(getTickerFromRequest(req)).toBeNull();
  });

  test("returns null for ticker with invalid characters", () => {
    const invalidTicker = "AAPL$";
    const req = new Request(`https://example.com/api/perf?ticker=${invalidTicker}`);
    expect(getTickerFromRequest(req)).toBeNull();
  });

  test("returns ticker for valid characters including dots and dashes", () => {
    const validTicker = "BRK.B";
    const req = new Request(`https://example.com/api/perf?ticker=${validTicker}`);
    expect(getTickerFromRequest(req)).toBe("BRK.B");

    const validTicker2 = "SHELL.L";
    const req2 = new Request(`https://example.com/api/perf?ticker=${validTicker2}`);
    expect(getTickerFromRequest(req2)).toBe("SHELL.L");
  });
});
