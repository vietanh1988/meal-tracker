// node --test tests/ — lượt AI theo hạng
import test from "node:test";
import assert from "node:assert/strict";
import { aiQuota, utcDay } from "../src/lib/aiQuota.js";

const now = new Date("2026-10-13T03:00:00Z"); // 10:00 giờ VN

test("utcDay", () => {
  assert.equal(utcDay(new Date("2026-10-13T23:30:00Z")), "2026-10-13");
});

test("aiQuota: số kỳ cũ không tính, giới hạn theo hạng", () => {
  const sub = { tier: "premium", ai_chat_count_today: 7, ai_chat_count_reset_at: "2026-10-13", ai_menu_count_today: 3, ai_menu_count_reset_at: "2026-10-12", ai_photo_count_this_month: 12, ai_photo_count_reset_at: "2026-10-01", ai_macro_count_this_month: 99, ai_macro_count_reset_at: "2026-09-30" };
  const q = Object.fromEntries(aiQuota(sub, { premium_ai_chat_limit: 10 }, now).map((r) => [r.key, r]));
  assert.deepEqual([q.chat.used, q.chat.limit, q.chat.pct], [7, 10, 70]);
  assert.equal(q.menu.used, 0);
  assert.deepEqual([q.photo.used, q.photo.limit], [12, 300]);
  assert.equal(q.macro.used, 0);
});

test("aiQuota: hết lượt, hạng lạ → free", () => {
  const q = aiQuota({ tier: "vip", ai_chat_count_today: 25, ai_chat_count_reset_at: "2026-10-13" }, null, now);
  assert.equal(q[0].limit, 20);
  assert.equal(q[0].out, true);
  assert.equal(q[0].pct, 100);
});
