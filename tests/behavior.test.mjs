// node --test tests/ — Quản trị PC › Hành vi khách (bản vẽ 135c–e)
import test from "node:test";
import assert from "node:assert/strict";
import { behaviorStats, userStatus, timeline, eventLabel, agoShort, vnDay } from "../src/lib/behavior.js";

const T = "2026-10-18";
const at = (d, h = 10) => `${d}T${String(h - 7).padStart(2, "0")}:00:00Z`; // giờ VN h
const users = [
  { id: "a", ui_mode: "loss", created_at: at("2026-10-05"), onboarding_done: true, last_at: at(T), has_push: true },
  { id: "b", ui_mode: "loss", created_at: at("2026-10-16"), onboarding_done: true, last_at: at("2026-10-16"), has_push: false },
  { id: "c", ui_mode: null, created_at: at("2026-10-17"), onboarding_done: false, last_at: null, has_push: false },
];
const events = [
  { user_id: "a", at: at("2026-10-05"), name: "app_open" },
  { user_id: "a", at: at("2026-10-06"), name: "app_open" },
  { user_id: "a", at: at("2026-10-13"), name: "app_open" },
  { user_id: "a", at: at(T, 12), name: "meal_eaten", meta: { meal: "trua" } },
  { user_id: "a", at: at(T, 7), name: "meal_log", meta: { meal: "sang", how: "photo" } },
  { user_id: "a", at: at(T, 7), name: "water" },
  { user_id: "b", at: at("2026-10-16"), name: "meal_eaten", meta: { meal: "sang" } },
  { user_id: "c", at: at("2026-10-17"), name: "onb_step", meta: { step: 0 } },
  { user_id: "c", at: at("2026-10-17", 11), name: "onb_step", meta: { step: 11 } },
];

test("vnDay theo giờ VN", () => {
  assert.equal(vnDay("2026-10-17T18:30:00Z"), "2026-10-18"); // 01:30 sáng VN
});

test("ô số, phễu, tính năng, bỏ ngang onboarding", () => {
  const s = behaviorStats({ users, events, today: T, days: 30 });
  assert.equal(s.tiles.openToday, 1);
  assert.equal(s.tiles.newUsers, 3);
  assert.equal(s.tiles.push, 1);
  assert.deepEqual(s.funnel.map((f) => f.n), [3, 2, 2, 1, 1]);
  assert.equal(s.features.find((f) => f.key === "meal_eaten").n, 2);
  assert.equal(s.features.find((f) => f.key === "meal_log:photo").n, 1);
  assert.deepEqual(s.onboardingDrop, [{ label: "Nhập cân nặng, chiều cao", n: 1 }]);
  const loss = behaviorStats({ users, events, today: T, days: 30, mode: "loss" });
  assert.equal(loss.tiles.total, 2);
  const wk = behaviorStats({ users, events, today: T, days: 7 });
  assert.equal(wk.tiles.newUsers, 2);
});

test("quay lại theo tuần đăng ký: chưa đủ ngày → null", () => {
  const s = behaviorStats({ users, events, today: T, days: null });
  const w = s.cohorts.find((c) => c.n === 2); // tuần 12/10: b (16/10), c (17/10)
  assert.equal(w.d1, 0);
  assert.equal(w.d7, null);
  const old = s.cohorts.find((c) => c.label.includes("05/10"));
  assert.equal(old.d1, 100);
  assert.equal(old.d7, 100);
});

test("tình trạng + dòng thời gian + nhãn", () => {
  assert.deepEqual(userStatus(users[0], events, T), { tone: "green", text: "Ghi 2 bữa hôm nay" });
  assert.equal(userStatus(users[1], events, T).text, "Mở 2 ngày trước");
  assert.equal(userStatus(users[2], events, T).text, "Bỏ ở onboarding");
  assert.equal(userStatus({ ...users[1], last_at: at("2026-10-08") }, events, T).text, "Không quay lại");
  const tl = timeline(events, "a");
  assert.equal(tl[0].day, T);
  assert.equal(tl[0].items[0].time, "12:00");
  assert.match(tl[0].items[0].label, /Bữa trưa/);
  assert.equal(eventLabel({ name: "app_open", meta: { from: "push" } }), "Mở app (từ thông báo)");
  assert.equal(agoShort(new Date(Date.now() - 3 * 3600e3).toISOString()), "3 giờ");
});
