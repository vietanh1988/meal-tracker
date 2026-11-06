// 06/11: cụm chủ đề SEO (lib/clusters.js) + nối bài ↔ trang món / bài tập (lib/mentions.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLUSTERS, CLUSTER_ORDER, TOOLS, groupPosts, starOf } from "../lib/clusters.js";
import { postText, foodsInText, namePats, exPats } from "../lib/mentions.js";
import { exById } from "../lib/workout.js";

test("6 cụm, mỗi bài chỉ ở 1 nhóm của 1 cụm, bài trụ không nằm trong nhóm, công cụ có thật", () => {
  assert.deepEqual([...CLUSTER_ORDER].sort(), Object.keys(CLUSTERS).sort());
  const seen = new Map();
  for (const [k, c] of Object.entries(CLUSTERS)) {
    assert.ok(c.star && c.lead && c.groups.length, k);
    for (const t of c.tools) assert.ok(TOOLS[t], `${k}: công cụ ${t}`);
    for (const [, slugs] of c.groups) for (const s of slugs) {
      assert.ok(!seen.has(s), `${s} ở cả ${seen.get(s)} và ${k}`); seen.set(s, k);
      assert.notEqual(s, c.star, `${k}: bài trụ không xếp vào nhóm`);
    }
    assert.ok(!seen.has(c.star) || seen.get(c.star) !== k);
  }
  // 3 bài đã gộp (301) không còn trong cụm
  for (const s of ["thuc-don-cho-nguoi-tap-gym-giam-mo", "thuc-don-giam-can-cho-dan-van-phong-an-ngoai", "thuc-don-giam-can-voi-khoai-lang"]) assert.ok(!seen.has(s), s);
});

test("chia nhóm: đúng thứ tự cấu hình, bỏ bài trụ, bài chưa gán vào 'Bài khác', nhóm rỗng ẩn", () => {
  const cfg = { star: "a", groups: [["G1", ["b", "x"]], ["G2", ["zz"]]] };
  const posts = ["a", "c", "b"].map((slug) => ({ slug }));
  const g = groupPosts(cfg, posts);
  assert.deepEqual(g.map((x) => [x.name, x.posts.map((p) => p.slug)]), [["G1", ["b"]], ["Bài khác", ["c"]]]);
  assert.equal(starOf("thuc-don", "thuc-don-giam-can-7-ngay"), null);
  assert.equal(starOf("thuc-don", "bua-sang-giam-can"), "thuc-don-giam-can-7-ngay");
  assert.equal(starOf("khong-co", "x"), null);
});

test("món nhắc trong bài: tên dài trước, không kéo tên ngắn nằm trong tên dài, bỏ trang noindex, theo thứ tự xuất hiện", () => {
  const foods = [{ name: "Phở bò", slug: "pho-bo" }, { name: "Phở bò tái", slug: "pho-bo-tai" }, { name: "Cơm tấm", slug: "com-tam", noindex: true }, { name: "Bún chả", slug: "bun-cha" }, { name: "Bia", slug: "bia" }];
  const text = postText([{ type: "p", html: "Một tô <b>phở bò tái</b> khoảng 400 kcal, cơm tấm nhiều hơn." }, { type: "list", items: ["Bún chả Hà Nội", "uống bia"] }]);
  assert.deepEqual(foodsInText(text, foods).map((f) => f.slug), ["pho-bo-tai", "bun-cha"]);
  assert.deepEqual(foodsInText(`${text} phở bò chín`, foods).map((f) => f.slug), ["pho-bo-tai", "bun-cha", "pho-bo"]);
  assert.deepEqual(foodsInText("phở bòn bon", foods), [], "không khớp giữa chữ");
});

test("cụm chữ gửi DB tìm bài nhắc món / bài tập", () => {
  assert.deepEqual(namePats("Phở bò"), ["phở bò", "Phở bò"]);
  const e = exById("barbell-back-squat");
  assert.deepEqual(exPats(e), ['"ex": "barbell-back-squat"', "gánh tạ", "Gánh tạ"]);
  assert.deepEqual(exPats(null), []);
});

test("06/11 bảng trong bài trên điện thoại: giữ cuộn ngang, mỗi cột ≥ 150px để hàng không cao vì chữ rớt từng từ", async () => {
  const { readFileSync } = await import("node:fs");
  const c = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(c, /@media \(max-width: 720px\) \{\s*\.prose table \{ width: max-content[\s\S]*?\.prose th, \.prose td \{ min-width: 150px/);
});
