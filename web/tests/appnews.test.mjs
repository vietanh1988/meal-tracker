// 06/11: app đọc bài web (nút Pi › Tin giảm cân) — khối gọn cho app + danh sách / cụm
import { test } from "node:test";
import assert from "node:assert/strict";
import { toAppBlocks, appNews, appHtml } from "../lib/appnews.js";

test("toAppBlocks: đổi khối web sang khối app, link / ảnh trong web thành đường dẫn đầy đủ, bỏ khối chỉ của web", () => {
  const out = toAppBlocks([
    { type: "p", html: 'Xem <a href="/calo/pho-bo">phở bò</a><script>x()</script>' },
    { type: "h", level: 4, text: "<b>Ý chính</b>" },
    { type: "toc" }, { type: "app", title: "Mở app" }, { type: "button", url: "/x" },
    { type: "img", url: "/anh/a.webp", alt: "A" },
    { type: "calo", _food: { key: "pho_bo", name: "Phở bò", slug: "pho-bo", per100: { cal: 60 } }, _portion: { name: "tô vừa", gram: 500, cal: 340, p: 20, c: 45, f: 8 } },
    { type: "faq", title: "Hỏi đáp", items: [{ q: "Dùng thử bao lâu?", a: "%trial% ngày" }, { q: "", a: "x" }] },
    { type: "table", head: ["Món"], rows: [["<b>Phở</b>"]] },
  ], { plan: { trial: 7 } });
  assert.deepEqual(out.map((b) => b.t), ["p", "h", "img", "food", "faq", "table"]);
  assert.ok(out[0].html.includes('href="https://fipilotai.com/calo/pho-bo"') && !out[0].html.includes("script"));
  assert.equal(out[1].level, 3); assert.equal(out[1].text, "Ý chính");
  assert.equal(out[2].url, "https://fipilotai.com/anh/a.webp");
  assert.equal(out[3].food.key, "pho_bo"); assert.equal(out[3].food.por.cal, 340);
  assert.equal(out[4].items.length, 1); assert.equal(out[4].items[0].a.replace(/\u00a0/g, " "), "7 ngày");
});
test("appHtml giữ link ngoài nguyên vẹn", () => {
  assert.ok(appHtml('<a href="https://www.who.int/x">WHO</a>').includes('href="https://www.who.int/x"'));
});
test("appNews: bài mới trước, cụm theo thứ tự web, bỏ cụm 0 bài, bài trụ chỉ khi có", () => {
  const T = (slug) => [{ id: 1, kind: "category", slug }];
  const posts = [
    { slug: "cardio-hay-tap-ta-de-giam-mo", title: "Cardio", primary_term: 1, terms: T("tap-luyen"), published_at: "2026-10-01T00:00:00Z", word_count: 2176 },
    { slug: "creatine-la-gi", title: "Creatine", primary_term: 1, terms: T("tap-luyen"), published_at: "2026-11-02T00:00:00Z", word_count: 1537, cover_url: "/anh/c.webp" },
    { slug: "an-pho-co-beo-khong", title: "Phở", primary_term: 1, terms: T("co-beo-khong"), published_at: "2026-10-05T00:00:00Z", word_count: 100 },
  ];
  const r = appNews(posts, [{ slug: "tap-luyen", name: "Tập luyện giảm mỡ" }, { slug: "co-beo-khong", name: "Món này có béo không?" }]);
  assert.deepEqual(r.posts.map((p) => p.slug), ["creatine-la-gi", "an-pho-co-beo-khong", "cardio-hay-tap-ta-de-giam-mo"]);
  assert.equal(r.posts[0].cover, "https://fipilotai.com/anh/c.webp"); assert.equal(r.posts[0].min, 7);
  assert.deepEqual(r.cats.map((c) => c.slug), ["co-beo-khong", "tap-luyen"]);
  const tl = r.cats[1];
  assert.equal(tl.name, "Tập luyện giảm mỡ"); assert.equal(tl.star, "cardio-hay-tap-ta-de-giam-mo"); assert.equal(tl.n, 2);
  assert.ok(!tl.groups.flatMap((g) => g.slugs).includes(tl.star), "bài trụ không lặp trong nhóm");
  assert.ok(tl.groups.some((g) => g.slugs.includes("creatine-la-gi")));
  assert.equal(r.cats[0].star, "an-pho-co-beo-khong");
});
test("link /bai-tap/<slug> gắn data-ex để app mở thẳng bài tập", () => {
  const [b] = toAppBlocks([{ type: "p", html: '<a href="/bai-tap/day-nguc-ta-don">Đẩy ngực</a> <a href="/bai-tap/khong-co">x</a>' }], { exId: (s) => (s === "day-nguc-ta-don" ? "barbell-bench-press" : null) });
  assert.ok(b.html.includes('href="https://fipilotai.com/bai-tap/day-nguc-ta-don" data-ex="barbell-bench-press"'));
  assert.ok(!b.html.includes('khong-co" data-ex'));
});
