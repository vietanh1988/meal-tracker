import { test } from "node:test";
import assert from "node:assert/strict";
import { appendReply } from "../src/lib/feedbackReply.js";

test("lần đầu: chỉ nội dung", () => assert.equal(appendReply("", "ok bạn"), "ok bạn"));
test("trả lời thêm: nối sau mốc giờ VN", () => {
  assert.equal(appendReply("ok bạn", "đã có nhắc nước", "2026-10-16T14:50:00Z"), "ok bạn\n\n— 16/10 21:50 —\nđã có nhắc nước");
});
test("nội dung trống: giữ nguyên", () => assert.equal(appendReply("ok", "  "), "ok"));
