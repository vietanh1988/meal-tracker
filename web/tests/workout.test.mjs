// 01/11: Thư viện bài tập trên web đọc chung dữ liệu app (lib/app/workout chép từ src/workout lúc dựng)
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISES, exSlug, exBySlug, exUrl, photoUrls, inTemplates, tplSessions, TEMPLATES, MUSCLE_SLUG, muscleOfSlug, setsText, exById, targetsOf, searchKey } from "../lib/workout.js";
import { linkTargets } from "../lib/autolink.js";

test("mỗi bài 1 link riêng theo tên Việt, không trùng; tạ đơn → ta-tay (không đụng tạ đòn)", () => {
  const sl = EXERCISES.map((e) => exSlug(e.id));
  assert.equal(new Set(sl).size, EXERCISES.length);
  assert.ok(sl.every((s) => /^[a-z0-9-]+$/.test(s) && !/-\d+$/.test(s)), "không có slug đuôi -2");
  assert.equal(exSlug("barbell-back-squat"), "ganh-ta");
  assert.equal(exSlug("barbell-bench-press"), "day-nguc-ta-don");
  assert.equal(exSlug("dumbbell-bench-press"), "day-nguc-ta-tay");
  for (const e of EXERCISES) assert.equal(exBySlug(exSlug(e.id)).id, e.id);
  assert.equal(exUrl("push-up"), "/bai-tap/hit-dat");
});
test("ảnh lấy từ app, bài không có ảnh trả null", () => {
  assert.deepEqual(photoUrls("barbell-back-squat"), ["https://app.fipilotai.com/ex/barbell-back-squat-0.webp", "https://app.fipilotai.com/ex/barbell-back-squat-1.webp"]);
  assert.equal(photoUrls("burpee"), null);
  assert.ok(photoUrls("barbell-bench-press")[0].endsWith("-0.webp?v=2"), "ảnh đã vẽ lại có số phiên bản để máy khách tải ảnh mới");
});
test("giáo án mẫu đúng như app; bài nằm trong giáo án nào", () => {
  assert.equal(TEMPLATES.length, 4);
  assert.deepEqual(tplSessions("day-keo-chan").map((s) => s.title), ["Ngực – Vai – Tay sau", "Lưng – Tay trước", "Chân – Mông"]);
  for (const t of TEMPLATES) for (const s of tplSessions(t.id)) for (const it of s.items) assert.ok(exById(it.ex), `${t.id}: bài lạ ${it.ex}`);
  assert.deepEqual(inTemplates("barbell-back-squat").map((x) => x.tpl), ["toan-than", "tren-duoi", "day-keo-chan"]);
  assert.equal(setsText(3, 40, exById("plank")), "3 × 40 giây");
  assert.equal(setsText(4, 8, exById("barbell-back-squat")), "4 × 8");
});
test("nhóm cơ: link đi được 2 chiều", () => {
  for (const [k, s] of Object.entries(MUSCLE_SLUG)) assert.equal(muscleOfSlug(s), k);
  assert.equal(muscleOfSlug("xyz"), null);
});
test("tự gắn link tên bài tập trong bài viết", async () => {
  const t = await linkTargets();
  assert.ok(t.some((x) => x.href === "/bai-tap/ganh-ta" && x.re.test("bài gánh tạ cho người mới")));
  assert.ok(t.some((x) => x.href === "/bai-tap/ganh-ta" && x.re.test("Barbell Back Squat")));
});

test("cơ tác động dùng chung app; ô tìm web tìm theo cơ chính", () => {
  for (const e of EXERCISES) assert.ok(targetsOf(e.id)?.main.length, e.id);
  assert.ok(searchKey(exById("hip-thrust")).includes("mong"));
});
