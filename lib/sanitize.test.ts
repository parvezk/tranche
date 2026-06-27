import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeDisplayText, stripHtmlTags } from "./sanitize.ts";

test("stripHtmlTags removes script and img tags", () => {
  assert.equal(stripHtmlTags('<img src=x onerror=alert(1)>Acme Corp'), "Acme Corp");
  assert.equal(stripHtmlTags("<script>alert(1)</script>Safe"), "alert(1)Safe");
});

test("sanitizeDisplayText strips tags and truncates", () => {
  assert.equal(sanitizeDisplayText("<b>Bold</b> Name"), "Bold Name");
  assert.equal(sanitizeDisplayText("x".repeat(250), 20), `${"x".repeat(20)}...`);
});
