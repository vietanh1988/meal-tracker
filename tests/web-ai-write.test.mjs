import test from "node:test";
import assert from "node:assert/strict";
import { parseArticle, mdToBlocks, articleToPost, articleIssues, buildUserPrompt } from "../src/pc/web/aiWrite.js";

const OUT = `SEO Title: Thâm hụt calo là gì? Cách tạo mức thâm hụt an toàn
**SEO Description:** Thâm hụt calo là khi bạn ăn ít năng lượng hơn mức cơ thể đốt.
Slug: Thâm-hụt calo là gì
Excerpt: Hiểu thâm hụt calo để giảm cân bền.
Full Article:
Tiêu đề bài viết: Thâm hụt calo là gì và nên tạo bao nhiêu?
**Thâm hụt calo là khi ăn ít hơn mức đốt.** Đoạn sapo tiếp — có gạch dài.

[chèn ảnh ở đây: alt ảnh "bữa cơm Việt thể hiện thâm hụt calo hợp lý"]

## Nên tạo thâm hụt bao nhiêu?
Khoảng 300 đến 500 kcal mỗi ngày, xem [nguồn](https://x.com).

| Món | Calo |
|---|---|
| Phở bò | 450 |

1. Tính TDEE
2. Trừ 400 kcal
   tiếp dòng
3. Theo dõi

- ý a
- ý b
---
### Câu hỏi con *nghiêng*
> trích dẫn
`;

test("parseArticle tách đủ phần", () => {
  const a = parseArticle(OUT);
  assert.equal(a.seoTitle, "Thâm hụt calo là gì? Cách tạo mức thâm hụt an toàn");
  assert.match(a.seoDesc, /^Thâm hụt calo là khi/);
  assert.equal(a.slug, "tham-hut-calo-la-gi");
  assert.equal(a.title, "Thâm hụt calo là gì và nên tạo bao nhiêu?");
  assert.ok(a.md.startsWith("**Thâm hụt"));
});

test("mdToBlocks đổi đúng khối", () => {
  const b = mdToBlocks(parseArticle(OUT).md);
  assert.deepEqual(b.map((x) => x.type), ["p", "img", "h", "p", "table", "list", "list", "h", "quote"]);
  assert.equal(b[0].html.includes("<b>Thâm hụt calo là khi ăn ít hơn mức đốt.</b>"), true);
  assert.ok(!/[—–]/.test(b[0].html));
  assert.equal(b[1].url, ""); assert.match(b[1].alt, /bữa cơm Việt/);
  assert.equal(b[3].html.includes("http"), false);
  assert.deepEqual(b[4].head, ["Món", "Calo"]); assert.deepEqual(b[4].rows, [["Phở bò", "450"]]);
  assert.equal(b[5].ordered, true); assert.equal(b[5].items.length, 3); assert.match(b[5].items[1], /tiếp dòng/);
  assert.equal(b[6].ordered, false);
  assert.equal(b[7].level, 3); assert.match(b[7].text, /<i>nghiêng<\/i>/);
});

test("articleToPost là bản nháp có chuyên mục + SEO", () => {
  const p = articleToPost(parseArticle(OUT), { keyword: "thâm hụt calo", termId: "t1", authorId: "a1" });
  assert.equal(p.status, "draft"); assert.deepEqual(p.terms, ["t1"]); assert.equal(p.primary_term, "t1");
  assert.equal(p.seo.keyword, "thâm hụt calo"); assert.equal(p.author_id, "a1");
  assert.ok(articleIssues(parseArticle(OUT), p.blocks, { inlineImages: 3 }).all.some((x) => /chỗ ảnh/.test(x)));
});

test("buildUserPrompt có từ khoá và bài đã có", () => {
  const s = buildUserPrompt({ keyword: " bmr ", category: "Kiến thức", related: ["A", "B"] });
  assert.match(s, /Từ khóa chính: bmr/); assert.match(s, /A; B/);
});

test("Ảnh bìa + Image Prompts tách khỏi bài; articleToPost gắn ảnh vào ô và ảnh bìa; dùng lại ảnh thư viện", async () => {
  const { matchMedia, systemPrompt, RULES_DEFAULT } = await import("../src/pc/web/aiWrite.js");
  const t = OUT.replace("Full Article:", "Ảnh bìa: bát phở bò ít bánh cho người giảm cân\nFull Article:") + "\nImage Prompts:\n1. A bowl of pho\n2. A plate of rice";
  const a = parseArticle(t);
  assert.equal(a.cover, "bát phở bò ít bánh cho người giảm cân");
  assert.deepEqual(a.prompts, ["A bowl of pho", "A plate of rice"]);
  assert.ok(!/Image Prompts/.test(a.md));
  const p = articleToPost(a, { imgs: { cover: { url: "c.jpg", alt: "bìa" }, inline: [{ url: "i1.jpg", alt: "trong bài" }] } });
  assert.equal(p.cover_url, "c.jpg"); assert.equal(p.blocks.find((b) => b.type === "img").url, "i1.jpg");
  assert.equal(matchMedia("bát phở bò tái ít bánh", [{ url: "x", alt: "Phở bò tái chín" }])?.url, "x");
  assert.equal(matchMedia("bát phở bò tái ít bánh", [{ url: "x", alt: "cơm gạo lứt" }]), null);
  assert.match(systemPrompt(null, { inlineImages: 2 }), /chỗ ảnh trong thân bài: đúng 2/);
  assert.ok(systemPrompt("LUẬT RIÊNG", {}).startsWith("LUẬT RIÊNG")); assert.ok(RULES_DEFAULT.includes("QUY TẮC BẮT BUỘC"));
});

test("nextSlot: mốc trống kế tiếp theo giờ VN, bỏ mốc đã có bài; postReady liệt kê chỗ thiếu", async () => {
  const { nextSlot, postReady } = await import("../src/pc/web/aiWrite.js");
  const now = Date.parse("2026-10-19T03:00:00Z"); // 10:00 giờ VN
  assert.equal(nextSlot(["08:00", "19:00"], [], now), "2026-10-19T12:00:00.000Z"); // 19:00 VN hôm nay
  assert.equal(nextSlot(["08:00", "19:00"], ["2026-10-19T12:00:00.000Z"], now), "2026-10-20T01:00:00.000Z"); // 8:00 VN mai
  assert.equal(nextSlot([], [], now), null);
  const r = postReady({ title: "x", blocks: [{ type: "img", url: "" }], seo: { title: "a" } });
  assert.equal(r.ok, false); assert.deepEqual(r.miss, ["ảnh đại diện", "1 ô ảnh trống", "chuyên mục", "SEO title / mô tả", "đoạn trích"]);
  assert.deepEqual(postReady({ title: "x", cover_url: "c", blocks: [], primary_term: "t1", terms: ["t1"], seo: { title: "a", desc: "b" }, excerpt: "e" }).miss, ["thẻ"]);
});
