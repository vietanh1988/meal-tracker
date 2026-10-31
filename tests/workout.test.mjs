import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEMPLATES, buildPlan, defaultTpl, planDays, sessionOfDate, newSession, lastSets, bestSet, setsDone, volume, newRecords, move, searchEx } from "../src/workout/plan.js";
import { EXERCISES, EX_BY_ID } from "../src/workout/exercises.js";

test("thư viện: id duy nhất, có tên Việt + tên Anh, bước tập", () => {
  assert.ok(EXERCISES.length >= 100);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  for (const e of EXERCISES) { assert.ok(e.vi && e.en, e.id); assert.ok(e.steps.length >= 3, e.id); }
});
test("giáo án mẫu chỉ dùng bài có trong thư viện", () => {
  for (const t of TEMPLATES) for (const d of Object.values(buildPlan(t.id, [0, 1, 2, 3, 4, 5]).days)) for (const i of d.items) assert.ok(EX_BY_ID[i.ex], `${t.id}: ${i.ex}`);
});
test("mẫu hợp khách: giảm cân / không tập gym → tại nhà; theo số buổi", () => {
  assert.equal(defaultTpl({ days: 5, loss: true }), "giam-can-nha");
  assert.equal(defaultTpl({ days: 3, exerciseType: "none" }), "giam-can-nha");
  assert.equal(defaultTpl({ days: 5 }), "day-keo-chan");
  assert.equal(defaultTpl({ days: 4 }), "tren-duoi");
  assert.equal(defaultTpl({ days: 3 }), "toan-than");
});
test("xếp buổi vào đúng ngày tập (0 = T2), lặp vòng", () => {
  const p = buildPlan("day-keo-chan", [0, 1, 2, 4, 5]);
  assert.deepEqual(planDays(p), [0, 1, 2, 4, 5]);
  assert.equal(p.days["0"].title, "Ngực – Vai – Tay sau");
  assert.equal(p.days["4"].title, "Ngực – Vai – Tay sau");
  assert.equal(sessionOfDate(p, "2026-11-02").title, "Ngực – Vai – Tay sau"); // 2/11/2026 là Thứ Hai
  assert.equal(sessionOfDate(p, "2026-11-05"), null); // Thứ Năm nghỉ
});
test("buổi mới điền sẵn theo lần trước; kỷ lục; tổng kg", () => {
  const old = { id: "a", day: "2026-10-28", ended_at: "2026-10-28T11:00:00Z", items: [{ ex: "barbell-row", sets: [{ kg: 50, reps: 10, done: true }, { kg: 52.5, reps: 8, done: true }] }] };
  assert.deepEqual(lastSets([old], "barbell-row"), [{ kg: 50, reps: 10 }, { kg: 52.5, reps: 8 }]);
  const s = newSession({ title: "Lưng", items: [{ ex: "barbell-row", sets: 3, reps: 10 }, { ex: "pull-up", sets: 2, reps: 8 }] }, [old], "2026-11-01");
  assert.deepEqual(s.items[0].sets.map((x) => x.kg), [50, 52.5, 52.5]);
  assert.deepEqual(s.items[1].sets.map((x) => x.reps), [8, 8]);
  s.items[0].sets[0].done = true; s.items[0].sets[0].kg = 55;
  assert.equal(setsDone(s), 1); assert.equal(volume(s), 550);
  assert.deepEqual(bestSet([old], "barbell-row"), { kg: 52.5, reps: 8, day: "2026-10-28" });
  const rec = newRecords({ ...s, id: "b", ended_at: "x" }, [old]);
  assert.equal(rec[0].kg, 55); assert.equal(rec[0].was, 52.5);
});
test("đổi thứ tự, tìm không dấu theo tên Việt hoặc Anh", () => {
  assert.deepEqual(move(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.ok(searchEx(EXERCISES, "bench press").some((e) => e.id === "barbell-bench-press"));
  assert.ok(searchEx(EXERCISES, "day nguc ta don").some((e) => e.id === "barbell-bench-press"));
  assert.ok(searchEx(EXERCISES, "", "lung").every((e) => e.muscle === "lung"));
});
test("SQL tập luyện: RLS + GRANT, thưởng ≥ 10 hiệp 1 lần/ngày, Vận động cộng phút tập", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261101010000_tap_luyen.sql", import.meta.url), "utf8");
  assert.match(sql, /if v_sets < 10 then/);
  assert.match(sql, /'workout:' \|\| v_day/);
  assert.match(sql, /from public\.workout_sessions w/);
  for (const t of ["workout_plans", "workout_sessions", "user_exercises"]) assert.match(sql, new RegExp(`grant select, insert, update, delete on public\\.${t} to authenticated, service_role`));
});

test("ảnh bài tập: chỉ bài có trong thư viện, đủ 2 khung to + nhỏ trong public/ex", async () => {
  const { EX_PHOTOS } = await import("../src/workout/exPhotos.js");
  const { existsSync, statSync } = await import("node:fs");
  assert.ok(EX_PHOTOS.size >= 110);
  for (const id of EX_PHOTOS) {
    assert.ok(EX_BY_ID[id], `ảnh của bài lạ: ${id}`);
    for (const f of [`public/ex/${id}-0.webp`, `public/ex/${id}-1.webp`, `public/ex/t/${id}-0.webp`, `public/ex/t/${id}-1.webp`]) {
      assert.ok(existsSync(f), `thiếu ${f}`);
      assert.ok(statSync(f).size < 40_000, `ảnh nặng quá: ${f}`);
    }
  }
});
