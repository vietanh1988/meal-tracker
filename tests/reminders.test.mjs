// node --test tests/ — cài đặt nhắc nhở
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/lib/reminders.js";

test("normalizeReminders: rỗng → mặc định", () => {
  assert.deepEqual(R.normalizeReminders(null), R.DEFAULT_REMINDERS);
  assert.deepEqual(R.normalizeReminders({}), R.DEFAULT_REMINDERS);
});

test("normalizeReminders: bỏ giờ sai, bữa lạ, bữa trùng; sắp theo giờ", () => {
  const r = R.normalizeReminders({ meal: { on: false, slots: [{ meal: "toi", time: "19:00" }, { meal: "xx", time: "10:00" }, { meal: "sang", time: "7:5" }, { meal: "trua", time: "11:30" }, { meal: "toi", time: "20:00" }] } });
  assert.equal(r.meal.on, false);
  assert.deepEqual(r.meal.slots, [{ meal: "trua", time: "11:30" }, { meal: "toi", time: "19:00" }]);
});

test("normalizeReminders: cân & nước sai → mặc định", () => {
  const r = R.normalizeReminders({ weigh: { on: false, weekday: 9, time: "25:00" }, water: { on: true, every: 5, from: "20:00", to: "08:00" } });
  assert.deepEqual(r.weigh, { on: false, weekday: 0, time: "07:00" });
  assert.deepEqual(r.water, { on: true, every: 2, from: "08:00", to: "20:00" });
});

test("defaultSlotTime: +15 phút, qua nửa đêm", () => {
  assert.equal(R.defaultSlotTime("11:30"), "11:45");
  assert.equal(R.defaultSlotTime("23:50"), "00:05");
  assert.equal(R.defaultSlotTime("bad"), "12:15");
});

test("waterTimes", () => {
  assert.deepEqual(R.waterTimes({ every: 3, from: "09:00", to: "18:00" }), ["09:00", "12:00", "15:00", "18:00"]);
});

test("dueReminders: bữa đã ghi thì không nhắc", () => {
  const s = { meal: { on: true, slots: [{ meal: "trua", time: "11:45" }] }, weigh: { on: true, weekday: 0, time: "07:00" }, water: { on: true, every: 2, from: "08:00", to: "20:00" } };
  assert.deepEqual(R.dueReminders(s, { hhmm: "11:45", weekday: 2 }), [{ type: "meal", meal: "trua" }]);
  assert.deepEqual(R.dueReminders(s, { hhmm: "11:45", weekday: 2, loggedMeals: ["trua"] }), []);
  assert.deepEqual(R.dueReminders(s, { hhmm: "07:00", weekday: 0 }), [{ type: "weigh" }]);
  assert.deepEqual(R.dueReminders(s, { hhmm: "07:00", weekday: 1 }), []);
  assert.deepEqual(R.dueReminders(s, { hhmm: "10:00", weekday: 1 }), [{ type: "water" }]);
  assert.deepEqual(R.dueReminders({ ...s, meal: { on: false, slots: s.meal.slots } }, { hhmm: "11:45", weekday: 2 }), []);
});
