import assert from "node:assert/strict";
import test from "node:test";

import { formatSupabaseError, isSupabaseUnavailableError } from "./supabase-errors.ts";

test("isSupabaseUnavailableError detects upstream HTML error pages", () => {
  assert.equal(isSupabaseUnavailableError("<!doctype html><html><body>down</body></html>"), true);
  assert.equal(isSupabaseUnavailableError("Cloudflare error code 522"), true);
  assert.equal(isSupabaseUnavailableError("Database timeout"), false);
});

test("formatSupabaseError replaces upstream HTML with safe message", () => {
  const message = formatSupabaseError(
    new Error("<!doctype html><html><body>Cloudflare error</body></html>"),
    "Unable to load allocation history.",
  );

  assert.match(message, /temporarily unavailable/i);
  assert.doesNotMatch(message, /<html/i);
});

test("formatSupabaseError strips HTML tags from regular errors", () => {
  const message = formatSupabaseError(
    new Error('<img src=x onerror=alert(1)>Connection failed'),
    "Unable to load allocation history.",
  );

  assert.equal(message, "Connection failed");
});
