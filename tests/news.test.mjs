// 06/11: Tin giảm cân trong app (src/news/newsData.js) — hàm thuần
import { test } from "node:test";
import assert from "node:assert/strict";
import { routeOf, searchPosts, restPick, catView, ddmm, loadNews, loadPost, _reset, REST_FIRST } from "../src/news/newsData.js";

test("routeOf: link trong bài mở đúng màn app", () => {
  const slugs = new Set(["an-pho-co-beo-khong"]);
  assert.deepEqual(routeOf("https://fipilotai.com/an-pho-co-beo-khong", slugs), { k: "post", slug: "an-pho-co-beo-khong" });
  assert.deepEqual(routeOf("/calo/pho-bo"), { k: "food", slug: "pho-bo" });
  assert.deepEqual(routeOf("https://fipilotai.com/bai-tap/giao-an/toan-than"), { k: "plan" });
  assert.deepEqual(routeOf("https://fipilotai.com/bai-tap"), { k: "lib" });
  assert.deepEqual(routeOf("https://fipilotai.com/tinh-calo"), { k: "goals" });
  assert.equal(routeOf("https://fipilotai.com/chu-de/giam-can").k, "out");
  assert.equal(routeOf("https://fipilotai.com/khong-co", slugs).k, "out");
  assert.deepEqual(routeOf("https://www.who.int/x"), { k: "out", url: "https://www.who.int/x" });
  assert.equal(routeOf("javascript:alert(1)").k, "none");
});
test("searchPosts: bỏ dấu, mọi chữ phải có", () => {
  const L = [{ title: "Ăn phở có béo không?" }, { title: "Đi bộ bao nhiêu bước" }];
  assert.equal(searchPosts(L, "pho").length, 1);
  assert.equal(searchPosts(L, "di bo").length, 1);
  assert.equal(searchPosts(L, "phở bộ").length, 0);
  assert.equal(searchPosts(L, "  ").length, 0);
});
test("restPick: chỉ bài Tập luyện, chưa đọc trước, bài nói đúng chuyện nghỉ / tăng tạ ưu tiên", () => {
  const data = { posts: [{ slug: "an-pho-co-beo-khong", cat: "co-beo-khong" }, { slug: "creatine-la-gi", cat: "tap-luyen" }, { slug: REST_FIRST[0], cat: "tap-luyen" }, { slug: REST_FIRST[1], cat: "tap-luyen" }] };
  assert.equal(restPick(data, new Set(), 0).slug, REST_FIRST[0]);
  assert.equal(restPick(data, new Set([REST_FIRST[0]]), 0).slug, REST_FIRST[1]);
  assert.equal(restPick({ posts: [{ slug: "x", cat: "thuc-don" }] }), null);
  const all = new Set(data.posts.map((p) => p.slug));
  assert.ok(restPick(data, all, 0), "đọc hết vẫn gợi ý (bài đã đọc)");
});
test("catView: bài trụ + nhóm theo thứ tự web, bỏ slug không có", () => {
  const data = { posts: [{ slug: "a" }, { slug: "b" }, { slug: "s" }], cats: [{ slug: "tap-luyen", name: "Tập", n: 3, star: "s", groups: [{ name: "G1", slugs: ["b", "zz"] }, { name: "G2", slugs: ["zz"] }, { name: "G3", slugs: ["a"] }] }] };
  const v = catView(data, "tap-luyen");
  assert.equal(v.starPost.slug, "s");
  assert.deepEqual(v.groups.map((g) => g.name), ["G1", "G3"]);
  assert.equal(catView(data, "khac"), null);
});
test("ddmm theo giờ VN", () => { assert.equal(ddmm("2026-11-05T18:30:00Z"), "06/11"); assert.equal(ddmm(null), ""); });
test("loadNews / loadPost: gọi đúng đường dẫn web, 404 → null", async () => {
  _reset();
  const calls = [];
  const fetcher = async (u) => { calls.push(u); if (u.includes("app-post/khong")) return { ok: false, status: 404 }; return { ok: true, status: 200, json: async () => (u.includes("app-news") ? { posts: [], cats: [] } : { slug: "x" }) }; };
  assert.deepEqual(await loadNews({ fetcher }), { posts: [], cats: [] });
  await loadNews({ fetcher }); // lần 2 lấy từ bộ nhớ
  assert.equal(calls.filter((u) => u.endsWith("/api/app-news")).length, 1);
  assert.equal((await loadPost("x", { fetcher })).slug, "x");
  assert.equal(await loadPost("khong", { fetcher }), null);
  assert.ok(calls.includes("https://fipilotai.com/api/app-post/x"));
});
