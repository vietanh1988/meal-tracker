// Hàng chờ AI viết bài (supabase/functions/web-writer/writer.js) chạy với DB giả + Claude / fal.ai giả (không gọi AI thật).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeWriter } from "../supabase/functions/web-writer/writer.js";

test("aiWrite.js trong hàm máy chủ là bản chép y nguyên của src/pc/web/aiWrite.js", () => {
  assert.equal(readFileSync("supabase/functions/web-writer/aiWrite.js", "utf8"), readFileSync("src/pc/web/aiWrite.js", "utf8"));
});

// ---- DB giả kiểu supabase-js (đủ cho writer.js) ----
function fakeDb(tables, rpcs) {
  const q = (name) => {
    let rows = () => tables[name] || (tables[name] = []);
    const f = []; let op = "select", payload = null, lim = null, ord = null, single = false;
    const match = (r) => f.every((fn) => fn(r));
    const run = () => {
      if (op === "insert") { const list = (Array.isArray(payload) ? payload : [payload]).map((r) => ({ id: r.id || `id${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString(), ...r })); rows().push(...list); return single ? list[0] : list; }
      if (op === "update") { const hit = rows().filter(match); hit.forEach((r) => Object.assign(r, payload)); return single ? hit[0] : hit; }
      let out = rows().filter(match);
      if (ord) out = [...out].sort((a, b) => (a[ord.c] > b[ord.c] ? 1 : -1) * (ord.asc ? 1 : -1));
      if (lim != null) out = out.slice(0, lim);
      return single ? out[0] || null : out;
    };
    const b = {
      select() { return b; }, insert(p) { op = "insert"; payload = p; return b; }, update(p) { op = "update"; payload = p; return b; },
      eq(c, v) { f.push((r) => r[c] === v); return b; }, neq(c, v) { f.push((r) => r[c] !== v); return b; }, gte(c, v) { f.push((r) => r[c] >= v); return b; },
      like(c, v) { const p = v.replace(/%$/, ""); f.push((r) => String(r[c]).startsWith(p)); return b; },
      order(c, o = {}) { ord = { c, asc: o.ascending !== false }; return b; }, limit(n) { lim = n; return b; },
      single() { single = true; return b; }, maybeSingle() { single = true; return b; },
      then(res, rej) { try { return Promise.resolve({ data: run(), error: null }).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); } },
    };
    return b;
  };
  const uploads = [];
  return { uploads, from: q, rpc: async (n, a) => ({ data: rpcs[n](a), error: null }), storage: { from: () => ({ upload: async (path) => { uploads.push(path); return { error: null }; } }) }, auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } };
}

const ARTICLE = ["SEO Title: Bữa sáng giảm cân với món Việt dễ làm mỗi ngày", "SEO Description: Gợi ý bữa sáng giảm cân với món Việt quen thuộc, đủ đạm và rau, kèm bảng calo ước tính để bạn chọn món nhanh mỗi sáng.", "Slug: bua-sang-giam-can", "Excerpt: Ăn sáng đủ đạm giúp no lâu.", "Thẻ: bữa sáng, Món Việt, #giảm cân", "Ảnh bìa: bát phở gà ít bánh nhiều rau cho bữa sáng giảm cân", "Full Article:", "Tiêu đề bài viết: Bữa sáng giảm cân với món Việt",
  "**Bữa sáng giảm cân nên có đạm, rau và ít tinh bột tinh chế.** " + "Chữ ".repeat(120), "", "## Nên ăn gì?", "Trứng và bánh mì nguyên cám.", "", "[chèn ảnh ở đây: alt ảnh \"đĩa trứng luộc và bánh mì nguyên cám buổi sáng\"]", "", "## Bao nhiêu calo?", "Khoảng 350 đến 450 kcal.", "", "| Món | Calo |", "|---|---|", "| Phở gà | 400 |", "", "## Sai lầm hay gặp", "Bỏ bữa sáng.", "",
  "Image Prompts:", "1. A bowl of Vietnamese chicken pho with herbs", "2. Boiled eggs and whole wheat bread on a plate"].join("\n");

function setup({ cfg = {}, media = [], text = ARTICLE, writes = null } = {}) {
  const tables = {
    web_ai_config: [{ id: 1, data: { searches: 2, img_inline: 1, ...cfg } }],
    app_settings: [{ key: "claude_key", value: "sk-ant-test-xxxxxxxxxxxxxxxxxxxxxxxx" }, { key: "fal_key", value: "fal-test-xxxxxxxxxxxxxxxxxxxx" }],
    web_terms: [{ id: "t1", kind: "category", name: "Thực đơn giảm cân", slug: "thuc-don", sort: 1 }, { id: "t2", kind: "category", name: "Giảm cân", slug: "giam-can", sort: 0 }],
    web_authors: [{ id: "a1", created_at: "2026-01-01" }],
    web_posts: [], web_post_terms: [], web_revisions: [], web_media: media, ai_usage_log: [],
    web_ai_jobs: [{ id: "j1", keyword: "bữa sáng giảm cân", term_id: null, auto_term: true, notes: "", model: "claude-sonnet-5-5", status: "queued", state: {}, in_tok: 0, out_tok: 0, searches: 0, images: 0, reused: 0, cost_text: 0, cost_img: 0, attempts: 0, created_by: "u1", created_at: "2026-10-19T01:00:00Z", updated_at: "2026-10-19T01:00:00Z" }],
  };
  const db = fakeDb(tables, {
    web_ai_claim: () => tables.web_ai_jobs.filter((j) => !["done", "error", "canceled"].includes(j.status)).slice(0, 1),
    web_writer_cron_ok: ({ p }) => p === "s3cret",
  });
  const calls = { claude: [], fal: 0 };
  let chunk = 0;
  const fetch = async (url, opt = {}) => {
    if (String(url).includes("anthropic")) {
      const body = JSON.parse(opt.body); calls.claude.push(body);
      if (body.tools) return new Response(JSON.stringify({ content: [{ type: "text", text: "Để tôi tra." }, { type: "server_tool_use" }, { type: "web_search_tool_result" }, { type: "text", text: "Chuyên mục: thuc-don\nÝ định tìm kiếm: chọn món sáng.\nSố liệu đã kiểm:\n- Trứng 6g đạm (nguồn: USDA)" }], stop_reason: "end_turn", usage: { input_tokens: 3000, output_tokens: 400, server_tool_use: { web_search_requests: 2 } } }));
      if (writes) { const x = writes[chunk++]; return new Response(JSON.stringify({ content: [{ type: "text", text: x.text }], stop_reason: x.stop || "end_turn", usage: { input_tokens: 1000, output_tokens: 1000 } })); }
      // Bài viết chia 2 đoạn: đoạn 1 dừng vì max_tokens
      const half = Math.floor(text.length / 2);
      const part = chunk++ === 0 ? text.slice(0, half) : text.slice(half);
      return new Response(JSON.stringify({ content: [{ type: "text", text: part }], stop_reason: chunk === 1 ? "max_tokens" : "end_turn", usage: { input_tokens: 5000, output_tokens: 3500 } }));
    }
    if (String(url).includes("fal.run")) { calls.fal++; return new Response(JSON.stringify({ images: [{ url: "https://fal.media/x.jpg" }] })); }
    if (String(url).includes("fal.media")) return new Response(new Uint8Array([1, 2, 3]));
    throw new Error("fetch lạ " + url);
  };
  const Image = { decode: async () => { throw new Error("không giải mã trong test"); } };
  const w = makeWriter({ db: () => db, Image, fetch });
  return { w, tables, calls, db };
}

const req = (body) => new Request("https://x/functions/v1/web-writer", { method: "POST", body: JSON.stringify(body), headers: { origin: "https://app.fipilotai.com" } });

test("tick không có mã bí mật → 403", async () => {
  const { w } = setup();
  assert.equal((await w.handle(req({ action: "tick", secret: "sai" }))).status, 403);
});

test("chạy hết 1 bài: tra cứu → viết 2 đoạn → vẽ 2 ảnh → lưu bản nháp đúng chuyên mục, tính tiền", async () => {
  const { w, tables, calls, db } = setup();
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) { const r = await w.handle(req({ action: "tick", secret: "s3cret" })); assert.equal(r.status, 200); }
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done", JSON.stringify({ s: j.status, e: j.error }));
  assert.equal(j.term_id, "t1"); // AI tự chọn chuyên mục
  assert.equal(calls.claude.length, 3); // 1 tra cứu + 2 đoạn viết
  assert.equal(calls.claude[0].tools[0].max_uses, 2);
  assert.equal(calls.claude[2].messages.length, 3); // đoạn 2 = viết tiếp
  assert.equal(calls.fal, 2); // ảnh bìa + 1 ảnh trong bài
  assert.equal(j.searches, 2); assert.equal(j.in_tok, 13000); assert.equal(j.out_tok, 7400);
  assert.ok(Math.abs(Number(j.cost_text) - ((13000 * 2 + 7400 * 10) / 1e6 + 0.02)) < 1e-9);
  assert.ok(Math.abs(Number(j.cost_img) - 0.006) < 1e-9);
  const p = tables.web_posts[0];
  assert.equal(p.status, "draft"); assert.equal(p.slug, "bua-sang-giam-can"); assert.equal(p.primary_term, "t1");
  assert.match(p.cover_url, /^https:\/\/fipilotai\.com\/anh\/\d{4}\/\d{2}\/.+-bia-[a-z0-9]+\.jpg$/); // giải mã lỗi → không có _1200w (khỏi srcset ảo)
  assert.equal(p.blocks.filter((b) => b.type === "img" && b.url).length, 1);
  assert.equal(p.seo.keyword, "bữa sáng giảm cân");
  assert.equal(tables.web_revisions[0].reason, "ai");
  assert.equal(tables.web_post_terms[0].term_id, "t1");
  assert.equal(db.uploads.length, 2);
  assert.ok(tables.ai_usage_log.some((l) => l.feature === "web_article") && tables.ai_usage_log.some((l) => l.feature === "web_image"));
});

test("dùng lại ảnh có sẵn trong Thư viện ảnh thì không vẽ, không tốn tiền ảnh", async () => {
  const media = [{ url: "https://fipilotai.com/anh/2026/10/pho-ga_1200w.webp", alt: "bát phở gà ít bánh nhiều rau thơm", name: "pho-ga" }, { url: "https://fipilotai.com/anh/2026/10/trung_800w.webp", alt: "đĩa trứng luộc bánh mì nguyên cám", name: "trung" }];
  const { w, tables, calls } = setup({ media });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done"); assert.equal(calls.fal, 0); assert.equal(j.reused, 2); assert.equal(Number(j.cost_img), 0);
  assert.equal(tables.web_posts[0].cover_url, media[0].url);
});

test("chạm trần tiền hôm nay thì dừng hàng chờ", async () => {
  const { w, tables } = setup({ cfg: { daily_cap_usd: 0.01 } });
  tables.web_ai_jobs.push({ id: "old", keyword: "x", status: "done", cost_text: 0.5, cost_img: 0, updated_at: new Date().toISOString(), created_at: "2026-10-19T00:00:00Z" });
  const r = await (await w.handle(req({ action: "tick", secret: "s3cret" }))).json();
  assert.equal(r.paused, "cap"); assert.equal(tables.web_ai_jobs[0].status, "queued");
});

test("lỗi 3 lần liền → bài chuyển Lỗi, ghi lý do", async () => {
  const { w, tables } = setup();
  tables.app_settings.length = 0; // không có khoá Claude
  for (let i = 0; i < 4; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "error"); assert.match(j.error, /Chưa có khoá Claude/); assert.equal(j.state.failedAt, "research");
});

test("bài thiếu sapo in đậm → nhờ AI sửa 1 lần rồi mới lưu", async () => {
  const bad = ARTICLE.replace("**Bữa sáng giảm cân nên có đạm, rau và ít tinh bột tinh chế.**", "Bữa sáng giảm cân nên có đạm.");
  const { w, tables, calls } = setup({ cfg: { searches: 0, img_on: false }, writes: [{ text: bad }, { text: ARTICLE }] });
  tables.web_ai_jobs[0].auto_term = false; tables.web_ai_jobs[0].term_id = "t2";
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  assert.equal(tables.web_ai_jobs[0].status, "done");
  assert.equal(calls.claude.length, 2);
  assert.match(calls.claude[1].messages[0].content, /Sapo chưa bôi đậm/);
  assert.match(tables.web_posts[0].blocks[0].html, /<b>/);
  assert.equal(tables.web_posts[0].cover_url, null);
});

// Gemini / ChatGPT: cùng luồng, khác cách gọi API
function setupProv(model, imgProvider) {
  const env = setup({ cfg: { model, img_provider: imgProvider, searches: 2 } });
  env.tables.app_settings.push({ key: "gemini_key", value: "AIza-test-xxxxxxxxxxxxxxxxxxxx" }, { key: "gpt_key", value: "sk-test-xxxxxxxxxxxxxxxxxxxxxxxx" });
  env.tables.web_ai_jobs[0].model = model;
  const calls = []; let n = 0;
  const half = Math.floor(ARTICLE.length / 2);
  const fetch = async (url, opt = {}) => {
    const u = String(url); const body = opt.body ? JSON.parse(opt.body) : {}; calls.push({ u, body });
    if (u.includes("gemini-2.5-flash-image")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: btoa("png") } }] } }] }));
    if (u.includes("images/generations")) return new Response(JSON.stringify({ data: [{ b64_json: btoa("jpg") }] }));
    if (u.includes("generativelanguage")) {
      if (body.tools) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Chuyên mục: thuc-don\nSố liệu đã kiểm:\n- x" }] }, finishReason: "STOP", groundingMetadata: { webSearchQueries: ["a", "b"] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 } }));
      const first = n++ === 0;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: first ? ARTICLE.slice(0, half) : ARTICLE.slice(half) }] }, finishReason: first ? "MAX_TOKENS" : "STOP" }], usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 3000, thoughtsTokenCount: 100 } }));
    }
    if (u.includes("/v1/responses")) return new Response(JSON.stringify({ status: "completed", output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "Chuyên mục: thuc-don\n- x" }] }], usage: { input_tokens: 1000, output_tokens: 200 } }));
    if (u.includes("chat/completions")) { const first = n++ === 0; return new Response(JSON.stringify({ choices: [{ message: { content: first ? ARTICLE.slice(0, half) : ARTICLE.slice(half) }, finish_reason: first ? "length" : "stop" }], usage: { prompt_tokens: 2000, completion_tokens: 3000 } })); }
    throw new Error("fetch lạ " + u);
  };
  const w = makeWriter({ db: () => env.db, Image: { decode: async () => { throw new Error("x"); } }, fetch });
  return { ...env, w, calls };
}

for (const [model, ip, searchUrl, writeUrl, imgUrl] of [
  ["gemini-3.8-flash", "gemini", "generativelanguage", "generativelanguage", "gemini-2.5-flash-image"],
  ["gpt-6.1-sol", "gpt", "/v1/responses", "chat/completions", "images/generations"],
]) {
  test(`viết bằng ${model} + vẽ ảnh ${ip}: tra web, viết tiếp khi bị cắt, ảnh, lưu nháp`, async () => {
    const { w, tables, calls } = setupProv(model, ip);
    for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
    const j = tables.web_ai_jobs[0];
    assert.equal(j.status, "done", j.error || "");
    assert.ok(calls.some((c) => c.u.includes(searchUrl) && (c.body.tools || []).length));
    assert.equal(calls.filter((c) => c.u.includes(writeUrl) && !c.u.includes(imgUrl) && !(c.body.tools || []).length).length, 2);
    assert.equal(calls.filter((c) => c.u.includes(imgUrl)).length, 2);
    assert.ok(j.searches >= 1); assert.ok(Number(j.cost_text) > 0); assert.ok(Number(j.cost_img) > 0);
    assert.equal(tables.web_posts[0].primary_term, "t1");
    assert.ok(tables.ai_usage_log.some((l) => l.provider === ip && l.feature === "web_article"));
  });
}

test("tự đăng nếu đạt: đủ ảnh + chuyên mục + thẻ (tạo thẻ mới / dùng thẻ cũ) → Đã đăng, gắn đủ chuyên mục và thẻ", async () => {
  const { w, tables } = setup({ cfg: { publish: "auto" } });
  tables.web_terms.push({ id: "tg1", kind: "tag", name: "Bữa sáng", slug: "bua-sang" });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const p = tables.web_posts[0];
  assert.equal(p.status, "published"); assert.ok(p.published_at);
  const tags = tables.web_terms.filter((t) => t.kind === "tag").map((t) => t.slug).sort();
  assert.deepEqual(tags, ["bua-sang", "giam-can", "mon-viet"]);
  assert.deepEqual(tables.web_post_terms.map((x) => x.term_id).length, 4); // chuyên mục + 3 thẻ
  assert.ok(tables.web_post_terms.some((x) => x.term_id === "tg1"));
  assert.ok(p.cover_url && p.blocks.every((b) => b.type !== "img" || b.url));
  assert.equal(tables.web_ai_jobs[0].state.published.status, "published");
});

test("tự đăng nhưng KHÔNG đạt (tắt vẽ ảnh → thiếu ảnh đại diện) → để nháp, ghi lý do", async () => {
  const { w, tables } = setup({ cfg: { publish: "auto", img_on: false } });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  assert.equal(tables.web_posts[0].status, "draft");
  assert.match(tables.web_ai_jobs[0].state.published.note, /thiếu ảnh đại diện/);
});

test("đặt lịch nếu đạt → Hẹn giờ ở mốc trống kế tiếp", async () => {
  const { w, tables } = setup({ cfg: { publish: "schedule", sched_times: ["08:00", "19:00"] } });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const p = tables.web_posts[0];
  assert.equal(p.status, "scheduled");
  const vn = new Date(new Date(p.published_at).getTime() + 7 * 3600e3);
  assert.ok([8, 19].includes(vn.getUTCHours()) && vn.getUTCMinutes() === 0);
  assert.ok(new Date(p.published_at) > new Date());
});
