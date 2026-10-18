import test from "node:test";
import assert from "node:assert/strict";
import { MODELS, DEFAULT_MODEL, modelsFor } from "../src/lib/aiModels.js";
import { pickAiModel } from "../src/lib/aiProvider.js";

test("mỗi nhà cung cấp 3 mô hình, mặc định nằm trong danh sách", () => {
  for (const p of ["claude", "gemini", "gpt"]) {
    assert.equal(MODELS[p].length, 3);
    assert.ok(MODELS[p].some((m) => m.id === DEFAULT_MODEL[p]));
  }
});
test("modelsFor thêm dòng bản cũ khi mô hình đang lưu không còn", () => {
  assert.equal(modelsFor("gpt", "gpt-6-luna").length, 3);
  const l = modelsFor("gpt", "chat-latest");
  assert.equal(l.length, 4);
  assert.equal(l[3].legacy, true);
  assert.equal(modelsFor("claude", "").length, 3);
});
test("pickAiModel mặc định theo DEFAULT_MODEL", () => {
  assert.equal(pickAiModel("gpt", {}), DEFAULT_MODEL.gpt);
  assert.equal(pickAiModel("gemini", {}), DEFAULT_MODEL.gemini);
  assert.equal(pickAiModel("claude", {}), DEFAULT_MODEL.claude);
  assert.equal(pickAiModel("gpt", { gptModel: "chat-latest" }), "chat-latest");
});
