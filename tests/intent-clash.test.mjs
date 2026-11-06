// 06/11: chặn trùng ý định khi viết bài mới + link bài trụ của cụm (aiWrite.js, dùng chung app / hàm web-writer)
import { test } from "node:test";
import assert from "node:assert/strict";
import { intentClash, CLASH_HARD, CLUSTER_STAR, linkTargets, linkIssues, linkStats } from "../src/pc/web/aiWrite.js";
import { CLUSTERS } from "../web/lib/clusters.js";

const docs = [
  ["/an-bun-co-beo-khong", "ăn bún có béo không"], ["/an-pho-co-beo-khong", "ăn phở có béo không"], ["/an-xoi-co-beo-khong", "ăn xôi có béo không"],
  ["/thuc-don-giam-can-7-ngay", "thực đơn giảm cân 7 ngày"], ["/thuc-don-giam-can-voi-trung", "thực đơn giảm cân với trứng 7 ngày"],
  ["/calo/pho-bo", "Phở bò bao nhiêu calo"], ["/calo/com-tam", "Cơm tấm bao nhiêu calo"], ["/calo/che-dau-xanh", "Chè đậu xanh bao nhiêu calo"], ["/calo/bun-cha", "Bún chả bao nhiêu calo"],
  ["/tinh-calo", "tính calo cần ăn mỗi ngày để giảm cân"], ["/bai-tap/nhom/nguc", "bài tập Ngực"], ["/bai-tap/giao-an/toan-than", "giáo án Toàn thân lịch tập 2–3 buổi/tuần · gym"],
  ["/cardio-hay-tap-ta-de-giam-mo", "cardio hay tập tạ để giảm mỡ"], ["/giam-can-tai-nha-khong-can-gym", "giảm cân tại nhà không cần gym"],
].map(([url, text]) => ({ url, text }));
const top = (k) => intentClash(k, docs)[0] || { score: 0 };

test("trùng thật bị chặn: cùng món cùng ý, trang món, công cụ, nhóm cơ", () => {
  assert.equal(top("ăn phở có béo không").url, "/an-pho-co-beo-khong");
  assert.ok(top("phở bò bao nhiêu calo").score >= CLASH_HARD);
  assert.equal(top("phở bò bao nhiêu calo").url, "/calo/pho-bo");
  assert.ok(top("tính calo cần ăn mỗi ngày").score >= CLASH_HARD);
  assert.ok(top("bài tập ngực").score >= CLASH_HARD, "trang nhóm cơ đã giữ ý này");
});

test("khác món / khác ý thì không chặn: chè ≠ bún, 'có béo không' ≠ 'bao nhiêu calo' của trang món", () => {
  assert.ok(top("ăn chè có béo không").score < CLASH_HARD);
  assert.ok(top("ăn lẩu có béo không").score < CLASH_HARD);
  assert.ok(top("tập gym có giảm cân không").score < CLASH_HARD);
  assert.ok(top("tăng tạ thế nào cho đúng").score < CLASH_HARD);
  assert.deepEqual(intentClash("", docs), []);
  assert.deepEqual(intentClash("bất kỳ", []), []);
});

test("bài trụ của cụm: bảng ở aiWrite giống web/lib/clusters.js; đích link + bắt buộc có link bài trụ", () => {
  assert.deepEqual(CLUSTER_STAR, Object.fromEntries(Object.entries(CLUSTERS).map(([k, c]) => [k, c.star])));
  const L = linkTargets({ keyword: "ăn chè có béo không", cat: { id: "c", slug: "co-beo-khong", name: "Món này có béo không?" }, posts: [{ slug: "an-pho-co-beo-khong", title: "Ăn phở có béo không?", primary_term: "c" }, { slug: "an-bun-co-beo-khong", title: "Ăn bún có béo không?", primary_term: "c" }] });
  const p = L.find((x) => x.kind === "pillar");
  assert.equal(p.url, "/an-pho-co-beo-khong");
  assert.equal(L.filter((x) => x.url === "/an-pho-co-beo-khong").length, 1, "bài trụ không lặp ở nhóm bài cùng chủ đề");
  assert.ok(linkIssues([{ type: "p", html: '<a href="/">x</a> <a href="/chu-de/co-beo-khong">y</a>' }], L).some((s) => /bài trụ/.test(s)));
  assert.equal(linkStats([{ type: "p", html: '<a href="/an-pho-co-beo-khong">phở</a>' }], L).pillar, 1);
  // chính bài trụ thì không tự link mình
  assert.ok(!linkTargets({ keyword: "ăn phở", cat: { id: "c", slug: "co-beo-khong", name: "x" }, posts: [], selfSlug: "an-pho-co-beo-khong" }).some((x) => x.kind === "pillar"));
  // cụm tập luyện có link thư viện bài tập
  assert.ok(linkTargets({ keyword: "tăng tạ", cat: { id: "t", slug: "tap-luyen", name: "Tập luyện giảm mỡ" }, posts: [] }).some((x) => x.url === "/bai-tap"));
});
