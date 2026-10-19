// Quản trị web (bản vẽ 138): đếm chữ, điểm SEO, mã YouTube, khối lưu
import { test } from "node:test";
import assert from "node:assert/strict";
import { wordCount, seoChecks, youtubeId, headings, links } from "../src/pc/web/webLib.js";
import { newBlock, forSave, withKeys } from "../src/pc/web/blocksMeta.js";

const blocks = [
  { type: "p", html: "Một tô <b>phở bò</b> vừa khoảng 340 kcal. Xem <a href=\"/calo/pho-bo\">bảng calo</a> và <a href=\"https://www.vinmec.com\">nguồn</a>." },
  { type: "h", level: 2, text: "Phở bò bao nhiêu calo?" },
  { type: "list", items: ["Tô nhỏ", "Tô vừa"] },
  { type: "h", level: 3, text: "Cách ăn" },
  { type: "img", url: "/a.webp", alt: "" },
  { type: "calo", food: "phở bò" },
];

test("đếm chữ gồm đoạn, tiêu đề, danh sách", () => {
  assert.equal(wordCount(blocks), 24);
  assert.deepEqual(headings(blocks).map((h) => h.level), [2, 3]);
  assert.deepEqual(links(blocks), { internal: 2, external: 1 });
});

test("điểm SEO: từ khoá không dấu vẫn nhận, báo ảnh thiếu alt, bài ngắn", () => {
  const r = seoChecks({ title: "Phở bò bao nhiêu calo? Ăn sao không tăng cân", slug: "pho-bo-bao-nhieu-calo", blocks, seo: { keyword: "pho bo" }, cover_url: "" });
  const t = (s) => r.list.find((x) => x.text.startsWith(s));
  assert.equal(t("Từ khoá có trong tiêu đề").ok, true);
  assert.equal(t("Từ khoá có trong đường dẫn").ok, true);
  assert.equal(t("Từ khoá có trong 100 chữ đầu").ok, true);
  assert.equal(t("Độ dài bài").ok, false);
  assert.match(r.list.find((x) => x.text.includes("alt")).text, /1 ảnh chưa có mô tả/);
  assert.ok(r.score > 0 && r.score < 100);
  assert.equal(seoChecks({ title: "x", slug: "x", blocks: [], seo: {} }).list[0].text, "Chưa đặt từ khoá chính");
});

test("mã YouTube từ mọi kiểu link", () => {
  assert.equal(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(youtubeId("https://www.youtube.com/shorts/abcDEF12345"), "abcDEF12345");
  assert.equal(youtubeId("không phải link"), "");
});

test("lưu khối: bỏ khoá nội bộ và đoạn trống", () => {
  const b = withKeys([{ type: "p", html: "a" }, { type: "p", html: "<br>" }, newBlock("h2")]);
  assert.ok(b.every((x) => x._k));
  const s = forSave(b);
  assert.equal(s.length, 2);
  assert.ok(s.every((x) => !("_k" in x)));
  assert.equal(s[1].type, "h");
});
