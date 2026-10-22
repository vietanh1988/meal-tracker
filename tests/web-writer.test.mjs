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
      eq(c, v) { f.push((r) => r[c] === v); return b; }, in(c, v) { f.push((r) => v.includes(r[c])); return b; }, neq(c, v) { f.push((r) => r[c] !== v); return b; }, gte(c, v) { f.push((r) => r[c] >= v); return b; },
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
  "**Bữa sáng giảm cân nên có đạm, rau và ít tinh bột tinh chế.** " + "Chữ ".repeat(120), "", "## Nên ăn gì?", "Trứng và bánh mì nguyên cám.", "", "[chèn ảnh ở đây: alt ảnh \"đĩa trứng luộc và bánh mì nguyên cám buổi sáng\"]", "", "## Bao nhiêu calo?", "Khoảng 350 đến 450 kcal.", "", "| Món | Calo |", "|---|---|", "| Phở gà | 400 |", "", "## Sai lầm hay gặp", "Bỏ bữa sáng.", "", "Ghi bữa sáng trên [Fipilot AI](/) và đọc thêm [thực đơn giảm cân](/chu-de/thuc-don) hoặc [mẹo giảm cân](/chu-de/giam-can).", "",
  "Image Prompts:", "1. A bowl of Vietnamese chicken pho with herbs", "2. Boiled eggs and whole wheat bread on a plate"].join("\n");

function setup({ cfg = {}, media = [], text = ARTICLE, writes = null, review = "KHÔNG CÓ LỖI", relink = "KHÔNG CÓ" } = {}) {
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
      if (/biên tập viên SEO/.test(body.system || "")) { calls.relink = [...(calls.relink || []), body.messages[0].content]; return new Response(JSON.stringify({ content: [{ type: "text", text: typeof relink === "function" ? relink(body.messages[0].content) : relink }], stop_reason: "end_turn", usage: { input_tokens: 1500, output_tokens: 60 } })); }
      if (/soát bài/.test(body.system || "")) { calls.review = (calls.review || 0) + 1; return new Response(JSON.stringify({ content: [{ type: "text", text: review }], stop_reason: "end_turn", usage: { input_tokens: 2000, output_tokens: 100 } })); }
      if (body.tools && /soát lại bài/.test(body.messages[0].content)) return new Response(JSON.stringify({ content: [{ type: "text", text: "Số liệu đã kiểm:\n- Giảm 0,5-1 kg/tuần (nguồn: NHS Losing weight | https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/losing-weight/)\n- Bài báo (nguồn: báo X | https://vnexpress.net/x)" }], stop_reason: "end_turn", usage: { input_tokens: 2000, output_tokens: 300, server_tool_use: { web_search_requests: 2 } } }));
      if (body.tools) return new Response(JSON.stringify({ content: [{ type: "text", text: "Để tôi tra." }, { type: "server_tool_use" }, { type: "web_search_tool_result" }, { type: "text", text: "Chuyên mục: thuc-don\nÝ định tìm kiếm: chọn món sáng.\nSố liệu đã kiểm:\n- Trứng 6g đạm (nguồn: USDA)" }], stop_reason: "end_turn", usage: { input_tokens: 3000, output_tokens: 400, server_tool_use: { web_search_requests: 2 } } }));
      if (writes) { const x = writes[chunk++]; return new Response(JSON.stringify({ content: [{ type: "text", text: x.text }], stop_reason: x.stop || "end_turn", usage: { input_tokens: 1000, output_tokens: 1000 } })); }
      // Bài viết chia 2 đoạn: đoạn 1 dừng vì max_tokens
      const half = Math.floor(text.length / 2);
      const part = chunk++ === 0 ? text.slice(0, half) : text.slice(half);
      return new Response(JSON.stringify({ content: [{ type: "text", text: part }], stop_reason: chunk === 1 ? "max_tokens" : "end_turn", usage: { input_tokens: 5000, output_tokens: 3500 } }));
    }
    if (String(url).includes("/api/calo-data")) return new Response(JSON.stringify([{ n: "Phở gà", s: "pho-ga", u: [["tô vừa", 500, 420, 25, 55, 9]] }, { n: "Bánh mì thịt", s: "banh-mi-thit", u: [["ổ", 150, 400, 15, 45, 16]] }]));
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
  assert.equal(calls.claude.length, 4); // 1 tra cứu + 2 đoạn viết + 1 soát
  assert.equal(calls.review, 1);
  assert.equal(calls.claude[0].tools[0].max_uses, 2);
  assert.equal(calls.claude[2].messages.length, 3); // đoạn 2 = viết tiếp
  assert.match(calls.claude[1].messages[0].content, /BẢNG CALO KHO MÓN FIPILOT[\s\S]*Bánh mì thịt \| ổ \| 150 \| 400/); // số calo của app đưa cho AI (món phổ biến bù khi bài ít nhắc món)
  assert.equal(calls.fal, 2); // ảnh bìa + 1 ảnh trong bài
  assert.equal(j.searches, 2); assert.equal(j.in_tok, 15000); assert.equal(j.out_tok, 7500);
  assert.ok(Math.abs(Number(j.cost_text) - ((15000 * 2 + 7500 * 10) / 1e6 + 0.02)) < 1e-9);
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
  assert.equal(calls.claude.length, 3); // viết + sửa + soát
  assert.match(calls.claude[1].messages[0].content, /Sapo chưa bôi đậm/);
  assert.match(tables.web_posts[0].blocks[0].html, /<b>/);
  assert.equal(tables.web_posts[0].cover_url, null);
});

// Gemini / ChatGPT: cùng luồng, khác cách gọi API
function setupProv(model, imgProvider) {
  const env = setup({ cfg: { model, img_provider: imgProvider, searches: 2, review_model: "" } });
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

test("link nội bộ + thẻ có sẵn + dòng tiến trình: AI nhận danh sách đích & thẻ cũ, máy giữ link hợp lệ, bỏ link lạ, ghi mốc từng bước", async () => {
  const text = ARTICLE.replace("Trứng và bánh mì nguyên cám.", "Trứng và bánh mì nguyên cám, nhớ [tính calo cần ăn mỗi ngày](/tinh-calo) và đọc [BMR là gì](https://fipilotai.com/bmr-la-gi/) trước, tránh [web lạ](https://x.com/a) hay [đường lạ](/khong-co).")
    .replace("Khoảng 350 đến 450 kcal.", "Khoảng 350 đến 450 kcal, xem thêm [thực đơn giảm cân](/chu-de/thuc-don) và [Fipilot AI](/).");
  const { w, tables, calls } = setup({ text });
  tables.web_posts.push({ id: "p0", kind: "post", status: "published", slug: "bmr-la-gi", title: "BMR là gì", primary_term: "t1", seo: { keyword: "bmr" }, published_at: "2026-10-01T00:00:00Z" });
  tables.web_terms.push({ id: "g1", kind: "tag", name: "Bữa sáng", slug: "bua-sang" });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done", j.error);
  const prompt = calls.claude[1].messages[0].content;
  assert.match(prompt, /LINK NỘI BỘ[\s\S]*^\/ \|[\s\S]*^\/chu-de\/thuc-don \|[\s\S]*^\/tinh-calo \|[\s\S]*^\/bmr-la-gi \| BMR là gì/m);
  assert.match(prompt, /THẺ ĐÃ CÓ TRÊN WEB[^\n]*Bữa sáng/);
  const p = tables.web_posts.find((x) => x.slug === "bua-sang-giam-can");
  const html = p.blocks.map((b) => b.html || "").join(" ");
  for (const u of ["/tinh-calo", "/bmr-la-gi", "/chu-de/thuc-don", "/"]) assert.ok(html.includes(`href="${u}"`), u);
  assert.ok(!/x\.com|khong-co/.test(html)); assert.match(html, /web lạ/); // link lạ: bỏ link, giữ chữ
  assert.deepEqual(j.state.linkStats, { total: 4, home: 1, cat: 1, page: 1, post: 1 });
  assert.deepEqual(j.state.log.map((x) => x.s), ["research", "writing", "review", "images", "saving", "done"]);
  assert.equal(tables.web_post_terms.filter((x) => x.term_id === "g1").length, 1); // dùng lại thẻ cũ
});

test("soát bài thấy lỗi → 1 lượt viết sửa đúng chỗ (giữ link) → mới vẽ ảnh; tiền soát tính theo mô hình soát", async () => {
  const fixed = ARTICLE.replace("Khoảng 350 đến 450 kcal.", "Khoảng 400 kcal theo bảng calo của Fipilot AI.");
  const review = '- [so-khong-nguon] "Khoảng 350 đến 450 kcal" => dùng số app phở gà 420 kcal\n- [van-dich] "Bỏ bữa sáng." => viết lại câu đầy đủ';
  const { w, tables, calls } = setup({ cfg: { searches: 0, review_model: "claude-haiku-5-5" }, writes: [{ text: ARTICLE }, { text: fixed }], review });
  tables.web_ai_jobs[0].auto_term = false; tables.web_ai_jobs[0].term_id = "t1";
  for (let i = 0; i < 10 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done", j.error);
  const rv = calls.claude.find((c) => /soát bài/.test(c.system || ""));
  assert.equal(rv.model, "claude-haiku-5-5");
  assert.match(rv.messages[0].content, /BẢNG CALO APP[\s\S]*Bánh mì thịt \| ổ \| 150 \| 400/);
  const fix = calls.claude[calls.claude.length - 1];
  assert.match(fix.messages[0].content, /\[so-khong-nguon\] "Khoảng 350 đến 450 kcal" => dùng số app/);
  assert.match(fix.messages[0].content, /Khoảng 350 đến 450 kcal\./); // sửa trên bản đã viết
  assert.equal(j.state.review.issues.length, 2); // bài đã đủ link trang chủ + chuyên mục → máy không nhắc thêm
  assert.deepEqual(j.state.log.map((x) => x.s), ["writing", "review", "fixing", "images", "saving", "done"]);
  assert.ok(tables.web_posts[0].blocks.some((b) => /Khoảng 400 kcal theo bảng calo/.test(b.html || "")));
  assert.ok(tables.ai_usage_log.some((l) => l.feature === "web_review" && l.model === "claude-haiku-5-5"));
});

test("soát bằng hãng khác (Gemini) mà chưa có khoá Gemini → bỏ qua soát, vẫn lưu; tắt soát (review_model rỗng) thì bỏ qua bước soát", async () => {
  const off = setup({ cfg: { searches: 0, img_on: false, review_model: "" } });
  off.tables.web_ai_jobs[0].auto_term = false;
  for (let i = 0; i < 8 && off.tables.web_ai_jobs[0].status !== "done"; i++) await off.w.handle(req({ action: "tick", secret: "s3cret" }));
  assert.equal(off.tables.web_ai_jobs[0].status, "done");
  assert.ok(!off.tables.web_ai_jobs[0].state.log.some((x) => x.s === "review"));
  assert.ok(!off.calls.review);
  const g = setup({ cfg: { searches: 0, img_on: false, review_model: "gemini-3.8-flash" } });
  g.tables.web_ai_jobs[0].auto_term = false;
  for (let i = 0; i < 8 && g.tables.web_ai_jobs[0].status !== "done"; i++) await g.w.handle(req({ action: "tick", secret: "s3cret" }));
  assert.equal(g.tables.web_ai_jobs[0].status, "done"); // chưa nhập khoá Gemini → bỏ qua soát, vẫn lưu bài
  assert.match(g.tables.web_ai_jobs[0].state.review.skipped, /chưa có khoá Gemini/);
});

test("bước soát không thấy lỗi nhưng bài thiếu link chuyên mục → máy thêm lỗi thiếu link, vẫn có lượt sửa", async () => {
  const noCat = ARTICLE.replace(" và đọc thêm [thực đơn giảm cân](/chu-de/thuc-don) hoặc [mẹo giảm cân](/chu-de/giam-can)", "");
  const { w, tables, calls } = setup({ cfg: { searches: 0, img_on: false }, writes: [{ text: noCat }, { text: ARTICLE }] });
  tables.web_ai_jobs[0].auto_term = false; tables.web_ai_jobs[0].term_id = "t1";
  for (let i = 0; i < 10 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done", j.error);
  assert.deepEqual(j.state.review.issues.length, 1);
  assert.match(j.state.review.issues[0], /thieu-link[\s\S]*\/chu-de\/thuc-don/);
  assert.match(calls.claude[calls.claude.length - 1].messages[0].content, /thieu-link/);
  assert.equal(j.state.linkStats.cat, 1);
});

test("nút Gắn link (bài đã có) + link ngược: AI chỉ chọn chỗ, máy chèn <a> đúng chữ, lưu bản sửa; đích lạ bị bỏ", async () => {
  const relink = (prompt) => /Bài "Bữa sáng giảm cân với món Việt"/.test(prompt) ? "1 | Trứng và bánh mì nguyên cám | /bang-calo\n2 | 350 đến 450 kcal | /khong-co" : "1 | bữa sáng giảm cân | /bua-sang-giam-can";
  const { w, tables, calls } = setup({ relink });
  tables.profiles = [{ id: "u1", is_admin: true }];
  const blocks = [{ type: "p", html: "Sapo <b>x</b>." }, { type: "h", text: "A" }, { type: "p", html: "Trứng và bánh mì nguyên cám." }, { type: "p", html: "Khoảng 350 đến 450 kcal." }];
  tables.web_posts.push({ id: "p1", kind: "post", status: "published", slug: "bua-sang-giam-can", title: "Bữa sáng giảm cân với món Việt", primary_term: "t1", seo: { keyword: "bữa sáng giảm cân" }, blocks, published_at: "2026-10-02T00:00:00Z" });
  tables.web_posts.push({ id: "old1", kind: "post", status: "published", slug: "an-sang-gi", title: "Ăn sáng gì khi giảm cân", primary_term: "t1", seo: { keyword: "bữa sáng giảm cân" }, published_at: "2026-10-01T00:00:00Z",
    blocks: [{ type: "p", html: "Sapo." }, { type: "p", html: "Một bữa sáng giảm cân nên có trứng." }] });
  const auth = (body) => new Request("https://x/functions/v1/web-writer", { method: "POST", body: JSON.stringify(body), headers: { origin: "https://app.fipilotai.com", authorization: "Bearer t" } });
  const r = await (await w.handle(auth({ action: "links", post_id: "p1" }))).json();
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.added.map((x) => x.url), ["/bang-calo"]); // /khong-co không có trong danh sách đích → bỏ
  const p1 = tables.web_posts.find((p) => p.id === "p1");
  assert.equal(p1.blocks[2].html, '<a href="/bang-calo">Trứng và bánh mì nguyên cám</a>.');
  assert.equal(p1.blocks[0].html, "Sapo <b>x</b>."); // sapo không đụng
  assert.deepEqual(r.back.map((x) => x.slug), ["an-sang-gi"]); // link ngược: bài cũ cùng chủ đề
  assert.equal(tables.web_posts.find((p) => p.id === "old1").blocks[1].html, 'Một <a href="/bua-sang-giam-can">bữa sáng giảm cân</a> nên có trứng.');
  assert.ok(tables.web_revisions.filter((x) => x.reason === "ai").length >= 2);
  assert.ok(tables.ai_usage_log.some((l) => l.feature === "web_relink"));
  // xem trước trong trình soạn: apply=false → trả khối mới, không lưu
  const before = JSON.stringify(tables.web_posts.find((p) => p.id === "old1").blocks);
  const pv = await (await w.handle(auth({ action: "relink", post_id: "old1", apply: false }))).json();
  assert.ok(Array.isArray(pv.blocks));
  assert.equal(JSON.stringify(tables.web_posts.find((p) => p.id === "old1").blocks), before);
});

test("bài nhập sẵn vào thẳng bước soát: máy lập bảng calo + đích link, soát thấy thiếu link → lượt sửa chèn link rồi mới ảnh / lưu", async () => {
  const withLinks = ARTICLE.replace("Bỏ bữa sáng.", "Bỏ bữa sáng.").replace(" và đọc thêm [thực đơn giảm cân](/chu-de/thuc-don) hoặc [mẹo giảm cân](/chu-de/giam-can)", " và đọc thêm [thực đơn giảm cân](/chu-de/thuc-don)");
  const plain = withLinks.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const { w, tables, calls } = setup({ cfg: { searches: 0, img_on: false }, writes: [{ text: withLinks }] });
  Object.assign(tables.web_ai_jobs[0], { status: "review", term_id: "t1", auto_term: false, state: { final: plain, research: "- Trứng 6g đạm (nguồn: USDA)" } });
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done", j.error);
  assert.ok(Array.isArray(j.state.links) && j.state.links.some((l) => l.url === "/chu-de/thuc-don"));
  assert.match(calls.claude.find((c) => /soát bài/.test(c.system || "")).messages[0].content, /BẢNG CALO APP/);
  assert.ok(j.state.review.issues.some((x) => /thieu-link/.test(x)));
  assert.equal(j.state.linkStats.home, 1); assert.equal(j.state.linkStats.cat, 1);
});

test("publish_drafts: mã bí mật sai → 403; đúng → bài nháp AI đủ điều kiện được đăng + lưu lịch sử + ghi vào việc", async () => {
  const { w, tables } = setup();
  for (let i = 0; i < 8 && tables.web_ai_jobs[0].status !== "done"; i++) await w.handle(req({ action: "tick", secret: "s3cret" }));
  const j = tables.web_ai_jobs[0];
  assert.equal(j.status, "done");
  assert.equal((await w.handle(req({ action: "publish_drafts", secret: "sai", since: "2000-01-01" }))).status, 403);
  assert.equal((await w.handle(req({ action: "publish_drafts", secret: "s3cret" }))).status, 400);
  const post = tables.web_posts.find((p) => p.id === j.post_id);
  if (!post.cover_url) post.cover_url = "https://x/a.jpg";
  for (const b of post.blocks) if (b.type === "img" && !b.url) b.url = "https://x/b.jpg";
  const before = (tables.web_revisions || []).length;
  const d = await (await w.handle(req({ action: "publish_drafts", secret: "s3cret", since: "2000-01-01" }))).json();
  const ok = d.done.filter((x) => x.ok);
  if (ok.length) {
    assert.equal(post.status, "published");
    assert.ok(post.published_at);
    assert.equal(tables.web_revisions.length, before + 1);
    assert.equal(j.state.published.status, "published");
  } else assert.ok(d.done[0].miss.length, JSON.stringify(d)); // bài mẫu thiếu thẻ thì phải nói thiếu gì, không đăng
  const d2 = await (await w.handle(req({ action: "publish_drafts", secret: "s3cret", since: "2000-01-01" }))).json();
  assert.equal(d2.done.filter((x) => x.ok).length, 0); // chạy lại không đăng lại
});


test("revise_next: soát lại bài cũ — tra nguồn có link → AI chỉ trả đoạn sai → máy sửa đúng chỗ, giữ link, gắn Nguồn tham khảo, lưu lịch sử; xong thì bỏ qua", async () => {
  const review = "@2\nApp khuyên giảm 0,25-0,75% cân nặng mỗi tuần; NHS nêu 0,5-1 kg/tuần, xem [bảng calo](/bang-calo).\n@3\nTổng | 1.260\n@4\nđoạn mất link";
  const { w, tables, calls } = setup({ review });
  tables.web_posts.push({ id: "o1", kind: "post", status: "scheduled", slug: "cu", title: "Bài cũ", seo: { keyword: "giảm cân" }, published_at: "2026-10-25T00:00:00Z",
    blocks: [{ type: "p", html: "Sapo." }, { type: "p", html: "Giảm 0,5-1 kg/tuần là an toàn, xem <a href=\"/bang-calo\">bảng calo</a>." }, { type: "table", head: ["Bữa", "kcal"], rows: [["Tổng", "1.050"]] }, { type: "list", items: ["Một ý có <a href=\"/x\">link</a>"] }] });
  assert.equal((await w.handle(req({ action: "revise_next", secret: "sai" }))).status, 403);
  const r1 = await (await w.handle(req({ action: "revise_next", secret: "s3cret" }))).json();
  assert.equal(r1.stage, "research");
  const r2 = await (await w.handle(req({ action: "revise_next", secret: "s3cret" }))).json();
  assert.equal(r2.stage, "done", JSON.stringify(r2));
  const p = tables.web_posts.find((x) => x.id === "o1");
  assert.match(p.blocks[1].html, /0,25-0,75%.*<a href="\/bang-calo">bảng calo<\/a>/);
  assert.deepEqual(p.blocks[2].rows[0], ["Tổng", "1.260"]);
  assert.equal(p.blocks[3].items[0], 'Một ý có <a href="/x">link</a>'); // mất link → giữ đoạn cũ
  const h = p.blocks.findIndex((b) => b.type === "h" && b.text === "Nguồn tham khảo");
  assert.ok(h > 0); assert.equal(p.blocks[h + 1].items.length, 1); assert.match(p.blocks[h + 1].items[0], /nhs\.uk/); // báo không thuộc danh sách uy tín → bỏ
  assert.equal(p.seo.rev.stage, "done"); assert.equal(p.seo.keyword, "giảm cân");
  assert.ok(tables.web_revisions.some((x) => x.post_id === "o1"));
  assert.ok(tables.ai_usage_log.filter((l) => l.feature === "web_revise").length === 2);
  const r3 = await (await w.handle(req({ action: "revise_next", secret: "s3cret" }))).json();
  assert.ok(r3.idle);
  assert.ok(calls.claude.some((c) => /Tốc độ giảm cân: app khuyên/.test(c.messages[0].content)));
});
