import test from "node:test";
import assert from "node:assert/strict";
import { keyStatusMap, keyPlaceholder, cleanKey } from "../src/lib/aiKeysView.js";

test("keyStatusMap + placeholder", () => {
  const m = keyStatusMap([{ name: "gpt_key", is_set: true, last4: "ab12", updated_at: "x" }, { name: "gemini_key", is_set: false, last4: null }, { name: "usda_key", is_set: true }]);
  assert.deepEqual(Object.keys(m).sort(), ["gemini_key", "gpt_key"]);
  assert.equal(keyPlaceholder(m.gpt_key, "sk-..."), "Đã cài · ••••ab12 — dán khoá mới để thay");
  assert.equal(keyPlaceholder(m.gemini_key, "AIza..."), "AIza...");
  assert.equal(keyPlaceholder(undefined, "x"), "x");
});
test("cleanKey", () => {
  assert.equal(cleanKey("  "), null);
  assert.equal(cleanKey("sk-123"), "short");
  assert.equal(cleanKey("  sk-12345678901234567890 "), "sk-12345678901234567890");
});
