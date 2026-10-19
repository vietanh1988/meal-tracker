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

import { legalToBlocks, vnDateIso, fmtPhone } from "../lib/appdata.js";
test("trang điều khoản từ app: bỏ H1, tách ngày cập nhật, tách mục", () => {
  const r = legalToBlocks("<h1>Điều khoản sử dụng Fipilot AI</h1>\n<p><strong>Cập nhật lần cuối:</strong> 12/07/2026</p>\n<p>Chào mừng</p><hr><h2>1. Phạm vi</h2><ul><li>Web</li></ul><h3>1.1. Con</h3><p>x</p>");
  assert.equal(r.title, "Điều khoản sử dụng Fipilot AI");
  assert.equal(r.updated, "12/07/2026");
  assert.equal(vnDateIso(r.updated), "2026-07-12T00:00:00+07:00");
  assert.deepEqual(r.blocks.map((b) => b.type + (b.level || "")), ["html", "h2", "html", "h3", "html"]);
  assert.equal(r.blocks[1].text, "1. Phạm vi");
  assert.ok(!JSON.stringify(r.blocks).includes("<hr"));
  assert.equal(fmtPhone("0973113698"), "0973 113 698");
});

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
test("CSS viết trong trang phải dùng dangerouslySetInnerHTML (React đổi > và \" thành &gt; khi dựng trang)", () => {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : []; });
  const bad = [...walk("app"), ...walk("components")].filter((f) => /<style>\s*\{/.test(readFileSync(f, "utf8")));
  assert.deepEqual(bad, []);
});

test("foodSlugs: tên trùng đường dẫn — tên có dấu giữ gốc, tên kia thêm -2", async () => {
  const { foodSlugs } = await import("../lib/slug.js");
  const s = foodSlugs(["pho bo", "phở bò", "dừa", "dứa", "cơm"]);
  assert.equal(s["phở bò"], "pho-bo"); assert.equal(s["pho bo"], "pho-bo-2");
  assert.equal(s["dừa"], "dua"); assert.equal(s["dứa"], "dua-2"); assert.equal(s["cơm"], "com");
});

test("srcSet: chỉ ảnh _<rộng>w.webp có bản nhỏ", async () => {
  const { srcSet } = await import("../lib/img.js");
  assert.equal(srcSet("https://fipilotai.com/anh/2026/10/pho-bo-ab_1600w.webp"), "https://fipilotai.com/anh/2026/10/pho-bo-ab_400w.webp 400w, https://fipilotai.com/anh/2026/10/pho-bo-ab_800w.webp 800w, https://fipilotai.com/anh/2026/10/pho-bo-ab_1200w.webp 1200w, https://fipilotai.com/anh/2026/10/pho-bo-ab_1600w.webp 1600w");
  assert.equal(srcSet("https://x/a_900w.webp"), "https://x/a_400w.webp 400w, https://x/a_800w.webp 800w, https://x/a_900w.webp 900w");
  assert.equal(srcSet("https://x/a_300w.webp"), undefined);
  assert.equal(srcSet("https://x/old.webp"), undefined);
});

test("shapePlan: giá theo tháng, % tiết kiệm, gói rẻ nhất", async () => {
  const { shapePlan, fillTrial } = await import("../lib/plans.js");
  const p = shapePlan({ price_1m: 69000, price_3m: 150000, price_6m: 280000, price_12m: 500000, trial_days: 30, free_ai_photo_limit: 30, premium_ai_photo_limit: 300 });
  assert.equal(p.trial, 30); assert.equal(p.month.price, 69000);
  assert.deepEqual(p.durs.map((d) => [d.m, d.per, d.save]), [[1, 69000, 0], [3, 50000, 28], [6, 46700, 32], [12, 41700, 40]]);
  assert.equal(p.cheapest.m, 12);
  assert.equal(fillTrial("Miễn phí %trial% ngày", p), "Miễn phí 30 ngày");
});

test("safeUrl chặn javascript: kể cả viết mã hoá / chèn tab", async () => {
  const { safeUrl, clean } = await import("../lib/sanitize.js");
  for (const u of ["javascript:alert(1)", "&#106;avascript:1", "java\tscript:1", "JaVa&#x53;cript:1", "vbscript:x", "data:text/html,1"]) assert.equal(safeUrl(u), "#", u);
  for (const u of ["/bai-viet", "#muc", "https://fipilotai.com", "mailto:a@b.vn", "tel:0900"]) assert.equal(safeUrl(u), u);
  assert.ok(!/href/.test(clean('<a href="&#106;avascript:alert(1)">x</a>')));
});

test("shapePlan: tắt gói 1 tháng thì giá / tháng vẫn đúng đơn vị", async () => {
  const { shapePlan } = await import("../lib/plans.js");
  const p = shapePlan({ price_1m: 0, price_3m: 297000, trial_days: 0 });
  assert.equal(p.month.m, 3); assert.equal(p.month.per, 99000); assert.equal(p.trial, 0);
});

test("srcSet: ảnh AI vẽ _<rộng>w.jpg có bản nhỏ .jpg; ảnh không đuôi _<rộng>w thì không srcset", async () => {
  const { srcSet } = await import("../lib/img.js");
  assert.equal(srcSet("https://fipilotai.com/anh/2026/10/pho-bia-ab_1200w.jpg"), "https://fipilotai.com/anh/2026/10/pho-bia-ab_400w.jpg 400w, https://fipilotai.com/anh/2026/10/pho-bia-ab_800w.jpg 800w, https://fipilotai.com/anh/2026/10/pho-bia-ab_1200w.jpg 1200w");
  assert.equal(srcSet("https://fipilotai.com/anh/2026/10/pho-bia-ab.jpg"), undefined);
});
