import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../lib/slug.js";
import { clean } from "../lib/sanitize.js";
import { shape } from "../lib/foods.js";
import { LOCAL_FOODS } from "../lib/app/localFoodDB.js";
import { prepare, toc, faqs } from "../lib/blocks.js";
import { calcMacro } from "../lib/app/calcMacro.js";

test("slugify bỏ dấu tiếng Việt", () => {
  assert.equal(slugify("Phở bò"), "pho-bo");
  assert.equal(slugify("Bún bò Huế"), "bun-bo-hue");
  assert.equal(slugify("  Đậu   phụ!! "), "dau-phu");
});

test("lọc HTML: bỏ script, on*, javascript:", () => {
  const out = clean('<p onclick="x()">a<script>alert(1)</script><a href="javascript:alert(1)">b</a><a href="/x" target="_blank">c</a><img src="/a.png" onerror="y"></p>');
  assert.ok(!/script|onclick|onerror|javascript/i.test(out), out);
  assert.match(out, /<a href="\/x" target="_blank" rel="noopener">c<\/a>/);
});

test("số calo web = kho món app (phở bò tô vừa 400 g = 340 kcal)", () => {
  const f = shape("phở bò", LOCAL_FOODS["phở bò"]);
  assert.equal(f.slug, "pho-bo");
  assert.equal(f.per100.cal, 85);
  const v = f.portions.find((p) => p.name === "tô vừa");
  assert.equal(v.gram, 400);
  assert.equal(v.cal, 340);
});

test("khối bài: tiêu đề có id, mục lục, FAQ", async () => {
  const b = await prepare([{ type: "h", level: 2, text: "Phở bò bao nhiêu calo?" }, { type: "p", html: "x" }, { type: "h", level: 2, text: "Phở bò bao nhiêu calo?" }, { type: "faq", items: [{ q: "A?", a: "B" }, { q: "", a: "" }] }]);
  assert.deepEqual(toc(b).map((x) => x.id), ["pho-bo-bao-nhieu-calo", "pho-bo-bao-nhieu-calo-2"]);
  assert.equal(faqs(b).length, 1);
});

test("ô tính calo dùng đúng công thức app", () => {
  const r = calcMacro({ cm: 158, kg: 68, birthYear: 1995, goalKg: 58, goalType: "cut", months: 6, gender: "female", exerciseType: "none", frequency: "regular", dietStrategy: "balanced", calorieMode: "standard", cutPace: "mid" });
  assert.ok(r.calTarget >= 1200 && r.calTarget < r.tdee);
});
