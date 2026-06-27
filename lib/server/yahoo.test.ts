import assert from "node:assert/strict";
import test from "node:test";

import { getTickerFromRequest } from "./yahoo.ts";

test("returns null for missing ticker", () => {
  const req = new Request("https://example.com/api/perf");
  assert.equal(getTickerFromRequest(req), null);
});

test("returns null for empty ticker", () => {
  const req = new Request("https://example.com/api/perf?ticker=");
  assert.equal(getTickerFromRequest(req), null);
});

test("returns uppercase trimmed ticker for valid input", () => {
  const req = new Request("https://example.com/api/perf?ticker=  aapl  ");
  assert.equal(getTickerFromRequest(req), "AAPL");
});

test("returns null for ticker exceeding MAX_TICKER_LENGTH", () => {
  const largeTicker = "A".repeat(21);
  const req = new Request(`https://example.com/api/perf?ticker=${largeTicker}`);
  assert.equal(getTickerFromRequest(req), null);
});

test("returns null for ticker with invalid characters", () => {
  const invalidTicker = "AAPL$";
  const req = new Request(`https://example.com/api/perf?ticker=${invalidTicker}`);
  assert.equal(getTickerFromRequest(req), null);
});

test("returns null for XSS payloads in ticker query param", () => {
  const payloads = [
    "<script>alert(1)</script>",
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
  ];

  for (const payload of payloads) {
    const req = new Request(`https://example.com/api/perf?ticker=${encodeURIComponent(payload)}`);
    assert.equal(getTickerFromRequest(req), null);
  }
});

test("returns ticker for valid characters including dots and dashes", () => {
  const validTicker = "BRK.B";
  const req = new Request(`https://example.com/api/perf?ticker=${validTicker}`);
  assert.equal(getTickerFromRequest(req), "BRK.B");

  const validTicker2 = "SHELL.L";
  const req2 = new Request(`https://example.com/api/perf?ticker=${validTicker2}`);
  assert.equal(getTickerFromRequest(req2), "SHELL.L");
});
