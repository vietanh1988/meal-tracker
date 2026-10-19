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
  assert.ok(articleIssues(parseArticle(OUT), p.blocks).some((x) => /chỗ ảnh/.test(x)));
});

test("buildUserPrompt có từ khoá và bài đã có", () => {
  const s = buildUserPrompt({ keyword: " bmr ", category: "Kiến thức", related: ["A", "B"] });
  assert.match(s, /Từ khóa chính: bmr/); assert.match(s, /A; B/);
});
