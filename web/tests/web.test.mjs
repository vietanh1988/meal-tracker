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

test("chuyên mục dưới 3 bài: tự chưa cho lập chỉ mục, trừ khi bật 'vẫn cho khi ít bài' hoặc đã tắt hẳn", async () => {
  const { catIndexable, THIN_CAT } = await import("../lib/content.js");
  assert.equal(THIN_CAT, 3);
  assert.equal(catIndexable({ seo: {} }, 1), false);
  assert.equal(catIndexable({ seo: {} }, 3), true);
  assert.equal(catIndexable({ seo: { index_thin: true } }, 1), true);
  assert.equal(catIndexable({ seo: { noindex: true, index_thin: true } }, 9), false);
});

// 23/10: chữ dính số + số/đơn vị không xuống dòng; link nội bộ tự gắn; ngày sửa không trước ngày đăng
import { tidy } from "../lib/typo.js";
import { autoLink } from "../lib/autolink.js";
import { modifiedOf } from "../lib/content.js";
import { withOg } from "../lib/site.js";
test("tidy: tách chữ dính số, giữ 21h30 / B12, nối số + đơn vị bằng dấu cách không ngắt", () => {
  assert.equal(tidy("mức tối thiểu1.800 kcal/ngày"), "mức tối thiểu 1.800 kcal/ngày");
  assert.equal(tidy("ăn lúc 21h30, vitamin B12"), "ăn lúc 21h30, vitamin B12");
  assert.equal(tidy('<a href="/a-1">Gỏi cuốn (60 g)</a>'), '<a href="/a-1">Gỏi cuốn (60 g)</a>');
});
test("autoLink: gắn link tới bài đã lên, bỏ đoạn mở bài, tiêu đề, link sẵn có và chính bài", () => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mk = (k, href) => ({ href, re: new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(k)})(?=$|[^\\p{L}\\p{N}])`, "iu") });
  const T = [mk("giảm cân sau sinh", "/giam-can-sau-sinh"), mk("bảng calo món việt", "/bang-calo"), mk("giảm cân cho nữ", "/giam-can-cho-nu")];
  const out = autoLink([{ type: "p", html: "Mở bài giảm cân sau sinh." }, { type: "h", text: "Giảm cân sau sinh" }, { type: "p", html: "Xem bảng calo món Việt và bài giảm cân sau sinh, giảm cân cho nữ." }], T, "/giam-can-cho-nu");
  assert.equal(out[0].html, "Mở bài giảm cân sau sinh.");
  assert.ok(out[2].html.includes('<a href="/bang-calo">bảng calo món Việt</a>'));
  assert.ok(out[2].html.includes('<a href="/giam-can-sau-sinh">giảm cân sau sinh</a>'));
  assert.ok(!out[2].html.includes('href="/giam-can-cho-nu"'));
});
test("modifiedOf: bài hẹn giờ không báo ngày sửa trước ngày đăng", () => {
  assert.equal(modifiedOf({ updated_at: "2026-10-20T00:00:00Z", published_at: "2026-10-22T00:00:00Z" }), "2026-10-22T00:00:00Z");
  assert.equal(modifiedOf({ updated_at: "2026-10-23T00:00:00Z", published_at: "2026-10-22T00:00:00Z" }), "2026-10-23T00:00:00Z");
});
test("withOg: đủ og:url / title / description / ảnh + twitter ảnh lớn", () => {
  const m = withOg({ title: "Bảng calo", description: "Mô tả", alternates: { canonical: "/bang-calo" } });
  assert.equal(m.openGraph.url, "/bang-calo"); assert.equal(m.openGraph.title, "Bảng calo"); assert.equal(m.openGraph.locale, "vi_VN");
  assert.ok(m.openGraph.images.length); assert.equal(m.twitter.card, "summary_large_image");
});
import { splitLong } from "../lib/paras.js";
test("splitLong: đoạn dài chia thành đoạn 2-3 câu, giữ đoạn mở bài và link", () => {
  const long = Array.from({ length: 6 }, (_, i) => `Câu số ${i + 1} nói về bữa ăn và calo trong ngày của mẹ sau sinh khá dài.`).join(" ") + ' Xem <a href="/bang-calo">bảng calo. Món Việt</a> nhé.';
  const out = splitLong([{ type: "p", html: "Mở bài." }, { type: "p", html: long }]);
  assert.equal(out[0].html, "Mở bài.");
  assert.ok(out.length >= 3);
  assert.ok(out.some((b) => b.html.includes('<a href="/bang-calo">bảng calo. Món Việt</a>')));
});

test("25/10: thẻ gói đầu = dùng thử đủ chức năng theo số ngày của app; không có dùng thử thì về Miễn phí", async () => {
  const { trialName, trialSub, trialPoints, premiumPoints } = await import("../lib/plans.js");
  const P = { trial: 30, limits: [] };
  assert.equal(trialName(P), "Dùng thử 30 ngày");
  assert.match(trialSub(P), /Gói trial đủ chức năng · 30 ngày/);
  assert.equal(trialPoints(P)[0], "Toàn bộ tính năng Premium trong 30 ngày");
  assert.equal(premiumPoints(P)[0], "Mọi thứ của gói dùng thử");
  assert.equal(trialName({ trial: 0 }, { free: { name: "Miễn phí" } }), "Miễn phí");
});
test("25/10: chân trang có khối Lưu ý — blog tin tức, không phải trang y tế", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../components/Footer.js", import.meta.url), "utf8");
  assert.match(src, /không phải trang web y tế/);
  assert.match(src, /data-testid="web-disclaimer"/);
});

test("31/10 tìm ngay trên đầu trang: Nav dùng SearchBox (không còn link sang /tim-kiem), menu mobile mở khung tìm, có /api/tim", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const nav = readFileSync(new URL("../components/Nav.js", import.meta.url), "utf8");
  assert.match(nav, /<SearchBox \/>/);
  assert.doesNotMatch(nav, /href="\/tim-kiem"/);
  assert.match(readFileSync(new URL("../components/MobileMenu.js", import.meta.url), "utf8"), /fp:search/);
  const sb = readFileSync(new URL("../components/SearchBox.js", import.meta.url), "utf8");
  for (const k of ["/api/tim?q=", "fp:search", "web-search-input", "/tim-kiem?q=", "ArrowDown"]) assert.ok(sb.includes(k), k);
  assert.ok(existsSync(new URL("../app/api/tim/route.js", import.meta.url)));
});
