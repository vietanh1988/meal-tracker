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

import { limitsTable, packagesOf, transferContent } from "../src/lib/aiQuota.js";
test("limitsTable: lấy từ settings, thiếu thì mặc định; Free khoá AI thực đơn", () => {
  const t = limitsTable({ free_ai_chat_limit: 10, trial_ai_chat_limit: 20, premium_ai_chat_limit: 100, free_ai_menu_limit: 2 });
  const chat = t.find((r) => r.key === "chat"), menu = t.find((r) => r.key === "menu");
  assert.deepEqual([chat.free, chat.trial, chat.premium], [10, 20, 100]);
  assert.equal(menu.free, null);
  assert.equal(menu.premium, 50);
});
test("packagesOf: giá/tháng + gói rẻ nhất mỗi tháng; bỏ gói chưa có giá", () => {
  const p = packagesOf({ price_3m: 150000, price_6m: 450000, price_12m: 800000 });
  assert.deepEqual(p.map((x) => x.perMonth), [50000, 75000, 66667]);
  assert.deepEqual(p.filter((x) => x.best).map((x) => x.id), ["3m"]);
  assert.equal(packagesOf({ price_3m: 150000 }).length, 1);
  assert.equal(packagesOf(null).length, 0);
});
test("transferContent: viết hoa, bỏ ký tự lạ, tối đa 12", () => {
  assert.equal(transferContent("viet_anh.88", "x", "12m"), "FIPILOT VIETANH88 12T");
});

test("packagesOf: có gói 1 tháng khi đặt giá, đứng đầu danh sách", () => {
  const p = packagesOf({ price_1m: 69000, price_3m: 150000, price_6m: 270000, price_12m: 480000 });
  assert.deepEqual(p.map((x) => x.id), ["1m", "3m", "6m", "12m"]);
  assert.equal(p[0].perMonth, 69000);
  assert.deepEqual(p.filter((x) => x.best).map((x) => x.id), ["12m"]);
  assert.equal(transferContent("an", "x", "1m"), "FIPILOT AN 1T");
});
