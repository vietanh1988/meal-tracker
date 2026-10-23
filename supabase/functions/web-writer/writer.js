// Lõi web-writer (JS thuần để test được bằng bun): index.ts chỉ nạp thư viện rồi gọi makeWriter.
import {
  cfgOf, systemPrompt, buildUserPrompt, researchPrompt, pickCategory, parseArticle, mdToBlocks, articleIssues, articleToPost,
  imagePrompt, matchMedia, textCost, IMG_PRICE, IMG_MODEL, providerOf, slugOf, postReady, nextSlot, pickFoods, foodTable, linkTargets, linkStats,
  caloHints, reviewPrompt, parseReview, fixPrompt, linkIssues, joinChunk, sourcesFromResearch, sourcesBlocks, reviseUnits, revisePrompt, parseRevise, applyRevise, hasSources,
  relinkUnits, relinkPrompt, parseRelink, applyRelink, backlinkCandidates,
} from "./aiWrite.js";
import { fixSources } from "./sources.js";

export function makeWriter({ db, Image, fetch = globalThis.fetch, envClaude = "" }) {
const ENV_CLAUDE = envClaude;

const ORIGINS = ["https://app.fipilotai.com", "https://fipilotai.com", "https://www.fipilotai.com", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"];
const PUB = "https://fipilotai.com/anh/";
const CALO_API = "https://fipilotai.com/api/calo-data"; // số calo kho món app (giống trang /calo/…)
const CHUNK_TOKENS = 3500, MAX_CHUNKS = 5, MAX_ATTEMPTS = 3;
const BUDGET_MS = 95_000; // mỗi lần gọi dừng nhận bước mới sau ~95 giây

const cors = (req) => {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};
const json = (req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

async function setting(admin, key) { const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle(); return data?.value || ""; }
async function config(admin) { const { data, error } = await admin.from("web_ai_config").select("data").eq("id", 1).maybeSingle(); if (error) throw new Error("Đọc cài đặt: " + error.message); return cfgOf(data?.data); }
const NAMES = { claude: "Claude", gemini: "Gemini", gpt: "ChatGPT" };
// Khoá viết bài: khoá riêng (<hãng>_writer_key) nếu chọn "khoá riêng", không thì khoá chung ở Kết nối AI (Claude còn khoá Secret dự phòng)
async function keysFor(admin, cfg, provider) {
  const own = cfg.key_mode === "own" ? await setting(admin, `${provider}_writer_key`) : "";
  if (own) return [own];
  return [...new Set([await setting(admin, `${provider}_key`), provider === "claude" ? ENV_CLAUDE : ""].filter(Boolean))];
}

// Cấu hình suy nghĩ giống ai-proxy (đã chạy thật)
function claudeExtra(model) {
  if (model === "claude-haiku-5-5") return { thinking: { type: "disabled" }, output_config: { effort: "low" } };
  if (model === "claude-sonnet-5-5") return { thinking: { type: "between_tools" }, output_config: { effort: "low" } };
  return { output_config: { effort: "low" } };
}
const THINK_ROOM = 2048;
const gptExtra = (m) => (m === "gpt-6-luna" ? { extra: { reasoning_effort: "none" }, room: 0 } : /^gpt-6/.test(m) ? { extra: { reasoning_effort: "low" }, room: THINK_ROOM } : { extra: {}, room: 0 });
const geminiExtra = (m) => (/^gemini-3/.test(m) ? { extra: { thinkingConfig: { thinkingLevel: "low" } }, room: THINK_ROOM } : { extra: {}, room: 0 });

// 1 lần gọi AI viết. search > 0: cho tra web (Claude web_search · Gemini Google Search · ChatGPT web_search).
// Trả { text, more (bị cắt vì hết token → viết tiếp), inTok, outTok, searches }
async function llm(provider, keys, { model, system, messages, maxTokens, search = 0 }) {
  if (!keys.length) throw new Error(`Chưa có khoá ${NAMES[provider]}: nhập ở Kết nối AI hoặc khoá riêng ở màn AI viết bài.`);
  const key = keys[0];
  if (provider === "gemini") {
    const gx = geminiExtra(model);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      ...(search > 0 ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { maxOutputTokens: maxTokens + gx.room, ...gx.extra },
    }) });
    const d = await r.json().catch(() => ({ error: { message: `Gemini trả lỗi ${r.status}` } }));
    if (d.error) throw new Error("Gemini: " + (d.error.message || "lỗi"));
    const c = d.candidates?.[0] || {};
    const text = (c.content?.parts || []).filter((x) => typeof x?.text === "string" && !x.thought).map((x) => x.text).join("");
    return { text, more: c.finishReason === "MAX_TOKENS", inTok: d.usageMetadata?.promptTokenCount || 0, outTok: (d.usageMetadata?.candidatesTokenCount || 0) + (d.usageMetadata?.thoughtsTokenCount || 0), searches: Math.min(search, c.groundingMetadata?.webSearchQueries?.length || 0) };
  }
  if (provider === "gpt") {
    const ox = gptExtra(model);
    if (search > 0) { // tra web: Responses API có công cụ web_search
      const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({
        model, instructions: system || undefined, input: messages.map((m) => ({ role: m.role, content: m.content })), tools: [{ type: "web_search" }],
        max_output_tokens: maxTokens + ox.room, ...(ox.extra.reasoning_effort ? { reasoning: { effort: ox.extra.reasoning_effort === "none" ? "minimal" : ox.extra.reasoning_effort } } : {}),
      }) });
      const d = await r.json().catch(() => ({ error: { message: `ChatGPT trả lỗi ${r.status}` } }));
      if (d.error) throw new Error("ChatGPT: " + (d.error.message || "lỗi"));
      const out = d.output || [];
      const text = out.filter((o) => o.type === "message").flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
      return { text, more: d.status === "incomplete", inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0, searches: Math.min(search, out.filter((o) => o.type === "web_search_call").length) };
    }
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({
      model, max_completion_tokens: maxTokens + ox.room, ...ox.extra, messages: [...(system ? [{ role: "system", content: system }] : []), ...messages],
    }) });
    const d = await r.json().catch(() => ({ error: { message: `ChatGPT trả lỗi ${r.status}` } }));
    if (d.error) throw new Error("ChatGPT: " + (d.error.message || "lỗi"));
    const c = d.choices?.[0] || {};
    return { text: c.message?.content || "", more: c.finish_reason === "length", inTok: d.usage?.prompt_tokens || 0, outTok: d.usage?.completion_tokens || 0, searches: 0 };
  }
  let d = null;
  for (const k of keys) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": k }, body: JSON.stringify({
      model, max_tokens: maxTokens, ...claudeExtra(model), ...(system ? { system } : {}), messages,
      ...(search > 0 ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: search }] } : {}),
    }) });
    d = await r.json().catch(() => ({ error: { message: `Claude trả lỗi ${r.status}` } }));
    if (!(r.status === 401 || d?.error?.type === "authentication_error")) break;
  }
  if (d?.error) throw new Error("Claude: " + (d.error.message || "lỗi"));
  const blocks = d.content || [];
  // Có tra web: chỉ lấy chữ SAU kết quả tra web cuối cùng (bỏ câu dẫn "để tôi tìm…")
  let lastTool = -1; blocks.forEach((b, i) => { if (/tool_result|tool_use/.test(b.type)) lastTool = i; });
  const text = blocks.slice(lastTool + 1).filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, more: d.stop_reason === "max_tokens", inTok: d.usage?.input_tokens || 0, outTok: d.usage?.output_tokens || 0, searches: d.usage?.server_tool_use?.web_search_requests || 0 };
}

async function logUsage(admin, uid, provider, model, inTok, outTok, cost, feature = "web_article") {
  await admin.from("ai_usage_log").insert({ user_id: uid, provider, model, feature, input_tokens: inTok, output_tokens: outTok, cost_usd: cost }).then(() => {}, () => {});
}

// ---- Ảnh: Flux (fal.ai) / Gemini / ChatGPT → ảnh ngang (bìa 16:9, trong bài 4:3) → kho 'web' + Thư viện ảnh ----
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function drawImage(admin, prov, prompt, cover) {
  if (prov === "gemini") {
    const k = await setting(admin, "gemini_key"); if (!k) throw new Error("Chưa có khoá Gemini (vẽ ảnh): nhập ở Kết nối AI.");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMG_MODEL.gemini}:generateContent?key=${k}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: cover ? "16:9" : "4:3" } } }) });
    const d = await r.json().catch(() => ({}));
    const part = (d?.candidates?.[0]?.content?.parts || []).find((x) => x?.inlineData?.data);
    if (!part) throw new Error("Gemini vẽ ảnh: " + (d?.error?.message || `không trả ảnh (${r.status})`));
    return { bytes: b64(part.inlineData.data), mime: part.inlineData.mimeType || "image/png" };
  }
  if (prov === "gpt") {
    const k = await setting(admin, "gpt_key"); if (!k) throw new Error("Chưa có khoá OpenAI (vẽ ảnh): nhập ở Kết nối AI.");
    const r = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` }, body: JSON.stringify({ model: IMG_MODEL.gpt, prompt, size: "1536x1024", quality: "low", output_format: "jpeg", n: 1 }) });
    const d = await r.json().catch(() => ({}));
    const data = d?.data?.[0]?.b64_json;
    if (!data) throw new Error("ChatGPT vẽ ảnh: " + (d?.error?.message || `lỗi ${r.status}`));
    return { bytes: b64(data), mime: "image/jpeg" };
  }
  const falKey = await setting(admin, "fal_key");
  if (!falKey) throw new Error("Chưa có khoá fal.ai (vẽ ảnh Flux): nhập ở Kết nối AI.");
  const size = cover ? { width: 1200, height: 672 } : { width: 1024, height: 768 };
  const r = await fetch("https://fal.run/fal-ai/flux/schnell", { method: "POST", headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt, image_size: size, num_inference_steps: 4, num_images: 1, enable_safety_checker: true, output_format: "jpeg" }) });
  const d = await r.json().catch(() => ({}));
  const url = d?.images?.[0]?.url;
  if (!r.ok || !url) throw new Error("fal.ai: " + (d?.detail?.[0]?.msg || d?.detail || d?.error || `lỗi ${r.status}`));
  return { bytes: new Uint8Array(await (await fetch(url)).arrayBuffer()), mime: "image/jpeg" };
}
async function storeImage(admin, im, name, alt, uid, by) {
  const now = new Date(Date.now() + 7 * 3600e3); // giờ VN cho thư mục năm/tháng
  const base = `img/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${slugOf(name).slice(0, 60) || "anh-ai"}-${Date.now().toString(36).slice(-5)}`;
  const put = async (path, b, type) => { const { error } = await admin.storage.from("web").upload(path, b, { contentType: type, cacheControl: "31536000", upsert: false }); if (error) throw new Error("Lưu ảnh: " + error.message); };
  // Đổi về JPEG theo LUẬT CỠ ẢNH WEB (src/pc/web/webLib.js IMG_RULE, 21/10): rộng ≤ 1200, cao ≤ 1600, bản chính ≤ 150 KB,
  // bản nhỏ 400 / 800 ≤ 40 / 90 KB (tên _<rộng>w → web tự ghép srcset). Chất lượng hạ dần 82 → 50. Không giải mã được thì lưu nguyên ảnh.
  const fit = async (img0, maxKB) => { for (let q = 82; q >= 50; q -= 8) { const b = await img0.encodeJPEG(q); if (b.length <= maxKB * 1024) return b; } return await img0.encodeJPEG(45); };
  let main = null, w = null, h = null; const small = [];
  try {
    const img = await Image.decode(im.bytes);
    const ow = img.width;
    if (img.width > 1200) img.resize(1200, Image.RESIZE_AUTO);
    if (img.height > 1600) img.resize(Image.RESIZE_AUTO, 1600);
    w = img.width; h = img.height;
    main = /jpe?g/.test(im.mime) && ow === w && im.bytes.length <= 150 * 1024 ? im.bytes : await fit(img, 150); // JPEG gốc vừa cỡ, đủ nhẹ thì giữ nguyên
    for (const [sw, kb] of [[400, 40], [800, 90]]) if (sw < w) small.push([sw, await fit(img.clone().resize(sw, Image.RESIZE_AUTO), kb)]);
  } catch (_e) { main = null; small.length = 0; }
  const ext = main ? "jpg" : (im.mime.split("/")[1] || "png").replace("jpeg", "jpg");
  const path = main && small.length ? `${base}_${w}w.jpg` : `${base}.${ext}`;
  await put(path, main || im.bytes, main ? "image/jpeg" : im.mime);
  for (const [sw, b] of small) await put(`${base}_${sw}w.jpg`, b, "image/jpeg");
  const url = PUB + path.replace(/^img\//, "");
  await admin.from("web_media").insert({ path, url, name: path.split("/").pop(), alt: alt || null, width: w, height: h, size: (main || im.bytes).length, sizes: small.map((x) => x[0]), orig_name: `AI vẽ (${by})`, uploader: "AI viết bài", created_by: uid }).then(() => {}, () => {});
  return url;
}

// Báo Bing / Cốc Cốc link mới (bật ở Cài đặt SEO › IndexNow), giống nút Đăng trong trình soạn
async function pingIndexNow(admin, path) {
  try {
    const { data } = await admin.from("web_settings").select("value").eq("key", "seo").maybeSingle();
    const k = data?.value?.indexnow && !data.value.block_all && data.value.indexnow_key;
    if (k) await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent("https://fipilotai.com" + path)}&key=${k}&keyLocation=${encodeURIComponent("https://fipilotai.com/indexnow-key.txt")}`).catch(() => {});
  } catch (_e) { /* bỏ qua */ }
}

// ---- Một bước của 1 bài ----
async function step(admin, job, cfg, t0) {
  const st = job.state || {};
  const save = async (patch) => {
    // Tiến trình: mỗi lần đổi bước ghi 1 mốc {s, at} vào state.log (màn AI viết bài hiện dòng thời gian)
    if (patch.status && patch.status !== job.status) {
      const base = patch.state || job.state || {};
      patch = { ...patch, state: { ...base, log: [...(base.log || job.state?.log || []), { s: patch.status, at: new Date().toISOString() }].slice(-30) } };
    }
    const { data, error } = await admin.from("web_ai_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", job.id).select().single();
    if (error) throw new Error("Lưu tiến độ: " + error.message); // không nuốt lỗi quyền / DB
    Object.assign(job, data || patch);
  };
  const prov = providerOf(job.model);
  const keys = () => keysFor(admin, cfg, prov);
  const addText = async (r, extra = {}) => {
    const cost = textCost(job.model, r.inTok, r.outTok, r.searches);
    await logUsage(admin, job.created_by, prov, job.model, r.inTok, r.outTok, cost);
    return { in_tok: job.in_tok + r.inTok, out_tok: job.out_tok + r.outTok, searches: job.searches + r.searches, cost_text: Number(job.cost_text) + cost, ...extra };
  };
  const cats = (await admin.from("web_terms").select("id,name,slug").eq("kind", "category").order("sort")).data || [];
  const term = cats.find((c) => c.id === job.term_id);
  const sys = () => systemPrompt(cfg.rules, { inlineImages: cfg.img_on ? cfg.img_inline : 0 });
  // Bối cảnh viết: số calo kho món app cho các món bài sẽ nhắc (lỗi thì bỏ qua, AI ghi "ước tính"), đích link nội bộ
  // (trang chủ, chuyên mục, trang liên quan, bài đã đăng cùng chủ đề), thẻ có sẵn. extra: chữ bài đã có (bài nhập vào ở bước soát).
  const prepCtx = async (extra = "") => {
    let list = [];
    try { const r = await fetch(CALO_API, { signal: AbortSignal.timeout(8000) }); if (r.ok) list = await r.json(); } catch (_e) { /* bỏ qua */ }
    const picked = pickFoods(Array.isArray(list) ? list : [], `${job.keyword} ${job.notes || ""} ${st.research || ""} ${extra}`);
    st.foods = foodTable(picked);
    const pub = ((await admin.from("web_posts").select("slug,title,primary_term,seo").eq("kind", "post").eq("status", "published").order("published_at", { ascending: false }).limit(300)).data || []).map((p) => ({ slug: p.slug, title: p.title, primary_term: p.primary_term, keyword: p.seo?.keyword || "" }));
    const mention = ` ${`${job.keyword} ${st.research || ""} ${extra}`.toLowerCase()} `;
    st.links = linkTargets({ keyword: job.keyword, cat: term || null, posts: pub, foods: picked.filter((f) => mention.includes(String(f.n).toLowerCase())) });
    st.tagNames = ((await admin.from("web_terms").select("name").eq("kind", "tag").order("name").limit(150)).data || []).map((t) => t.name);
  };
  const afterText = (reviewed) => (cfg.review_model && !reviewed ? "review" : cfg.img_on ? "images" : "saving"); // viết xong → soát (nếu bật) → ảnh → lưu

  if (job.status === "queued") { await save({ status: cfg.searches > 0 || job.auto_term ? "research" : "writing" }); return true; }

  if (job.status === "research") {
    const r = await llm(prov, await keys(), {
      model: job.model, maxTokens: 2500, search: cfg.searches,
      system: "Bạn là trợ lý tra cứu dinh dưỡng, chỉ ghi chú ngắn, tiếng Việt.",
      messages: [{ role: "user", content: researchPrompt({ keyword: job.keyword, category: term?.name || "", cats: job.auto_term ? cats : [], notes: job.notes || "" }) }],
    });
    const pick = job.auto_term ? pickCategory(r.text, cats) : null;
    await save({ ...(await addText(r)), status: "writing", state: { ...st, research: r.text.trim().slice(0, 6000) }, ...(pick ? { term_id: pick.id } : {}) });
    return false; // bước nặng: chờ lần sau
  }

  if (job.status === "writing" || job.status === "fixing") {
    const kind = job.status === "writing" ? "draft" : "fix";
    const g = st[kind] || { text: "", chunks: 0 };
    let base;
    if (kind === "draft") {
      if (st.foods == null) await prepCtx(); // lần viết đầu: bảng calo app + đích link nội bộ + thẻ có sẵn
      const related = ((await admin.from("web_posts").select("title").eq("kind", "post").neq("status", "trash").order("updated_at", { ascending: false }).limit(30)).data || []).map((p) => p.title);
      base = [{ role: "user", content: buildUserPrompt({ keyword: job.keyword, category: term?.name || "", notes: job.notes || "", research: st.research || "", related, foods: st.foods || "", links: st.links || [], tags: st.tagNames || [] }) }];
    } else {
      base = [{ role: "user", content: fixPrompt(st.issues || [], st.final || st.draft?.text || "") }];
    }
    const msgs = g.text ? [...base, { role: "assistant", content: g.text }, { role: "user", content: "Viết tiếp đúng chỗ đang dừng (đang giữa hai từ thì bắt đầu bằng dấu cách), không lặp lại, không thêm lời dẫn." }] : base;
    const r = await llm(prov, await keys(), { model: job.model, maxTokens: CHUNK_TOKENS, system: sys(), messages: msgs });
    const ng = { text: joinChunk(g.text, r.text), chunks: g.chunks + 1 };
    const more = r.more;
    if (more && ng.chunks >= MAX_CHUNKS) throw new Error("Bài dài quá 5 đoạn viết, dừng để tránh tốn tiền.");
    const patch = await addText(r, { state: { ...st, [kind]: ng } });
    if (!more) {
      const a = parseArticle(ng.text);
      const iss = articleIssues(a, mdToBlocks(a.md), { inlineImages: cfg.img_on ? cfg.img_inline : null });
      if (kind === "draft" && iss.hard.length) { patch.status = "fixing"; (patch.state).issues = iss.hard; }
      else {
        // Bản sửa hỏng (quá ngắn) thì giữ bản trước; còn lại dùng bản vừa xong
        const useFix = kind === "draft" || a.md.length > 400;
        const fin = useFix ? ng.text : st.final || st.draft.text;
        const fa = parseArticle(fin);
        patch.status = afterText(st.reviewed);
        Object.assign(patch.state, { final: fin, warn: articleIssues(fa, mdToBlocks(fa.md), { inlineImages: cfg.img_on ? cfg.img_inline : null }).all });
      }
    }
    await save(patch);
    return false;
  }

  // Soát bài: mô hình soát (cài đặt "Soát bài") đọc bài + ghi chú tra cứu + bảng calo app → danh sách lỗi; có lỗi thì 1 lượt viết sửa
  if (job.status === "review") {
    const rm = cfg.review_model;
    const rp = providerOf(rm);
    const a = parseArticle(st.final);
    if (st.links == null) await prepCtx(a.md); // bài nhập sẵn (vào thẳng bước soát): lập bảng calo + đích link để soát + sửa chèn link
    const rkeys = await keysFor(admin, cfg, rp);
    if (!rkeys.length) { // thiếu khoá hãng soát: bỏ qua soát, vẫn lưu bài (ghi chú ở tiến trình), không làm bài lỗi
      await save({ state: { ...st, reviewed: true, review: { model: rm, issues: [], skipped: `chưa có khoá ${NAMES[rp]}` } }, status: afterText(true) });
      return true;
    }
    const r = await llm(rp, rkeys, {
      model: rm, maxTokens: 2000, system: "Bạn là biên tập viên soát bài, chỉ liệt kê lỗi đúng khuôn, tiếng Việt.",
      messages: [{ role: "user", content: reviewPrompt({ article: `Tiêu đề: ${a.title}\n\n${a.md}`, research: st.research || "", foods: st.foods || "", hints: caloHints(a.md, st.foods || "") }) }],
    });
    const cost = textCost(rm, r.inTok, r.outTok, r.searches);
    await logUsage(admin, job.created_by, rp, rm, r.inTok, r.outTok, cost, "web_review");
    const issues = [...parseReview(r.text), ...linkIssues(mdToBlocks(a.md, { links: st.links || null }), st.links || [])].slice(0, 18); // + máy kiểm thiếu link bắt buộc
    const nst = { ...st, reviewed: true, review: { model: rm, issues } };
    if (issues.length) { nst.issues = issues; nst.fix = null; }
    await save({ in_tok: job.in_tok + r.inTok, out_tok: job.out_tok + r.outTok, cost_text: Number(job.cost_text) + cost, state: nst, status: issues.length ? "fixing" : afterText(true) });
    return false;
  }

  if (job.status === "images") {
    const a = parseArticle(st.final);
    const inl = mdToBlocks(a.md).filter((b) => b.type === "img").map((b) => b.alt);
    const slots = [{ alt: a.cover || inl[0] || job.keyword, prompt: a.prompts[0], cover: true }, ...inl.map((alt, i) => ({ alt, prompt: a.prompts[i + 1], cover: false }))];
    const imgs = st.imgs || [];
    const ip = cfg.img_provider || "flux";
    let media = null;
    while (imgs.length < slots.length && Date.now() - t0 < 60_000) {
      const s = slots[imgs.length];
      let got = null;
      if (cfg.img_reuse) {
        media = media || (await admin.from("web_media").select("url,alt,name").order("created_at", { ascending: false }).limit(500)).data || [];
        const m = matchMedia(s.alt, media, imgs.map((x) => x.url));
        if (m) got = { url: m.url, alt: s.alt, reused: true };
      }
      let cost = 0;
      if (!got) {
        const im = await drawImage(admin, ip, imagePrompt(s.prompt, s.alt), s.cover);
        const url = await storeImage(admin, im, `${a.slug || job.keyword}-${s.cover ? "bia" : "anh"}`, s.alt, job.created_by, IMG_MODEL[ip]);
        cost = IMG_PRICE[ip]; got = { url, alt: s.alt };
        await logUsage(admin, job.created_by, ip === "flux" ? "fal" : ip, IMG_MODEL[ip], 0, 0, cost, "web_image");
      }
      imgs.push(got);
      await save({ state: { ...st, imgs }, images: job.images + (got.reused ? 0 : 1), reused: job.reused + (got.reused ? 1 : 0), cost_img: Number(job.cost_img) + cost });
    }
    if (imgs.length >= slots.length) await save({ status: "saving" });
    return true;
  }

  if (job.status === "saving") {
    const a = parseArticle(st.final);
    const imgs = st.imgs || [];
    const author = (await admin.from("web_authors").select("id").order("created_at").limit(1)).data?.[0]?.id || null;
    const post = articleToPost(a, { keyword: job.keyword, termId: job.term_id, authorId: author, imgs: imgs.length ? { cover: imgs[0], inline: imgs.slice(1) } : null, links: st.links || null, sources: sourcesFromResearch(st.research || "") });
    const base = post.slug || slugOf(job.keyword) || "bai-viet-ai";
    const taken = new Set(((await admin.from("web_posts").select("slug").like("slug", `${base}%`)).data || []).map((r) => r.slug));
    let slug = base, n = 2; while (taken.has(slug)) slug = `${base}-${n++}`;
    const words = post.blocks.map((b) => [b.text, b.html, ...(b.items || []), ...(b.head || []), ...((b.rows || []).flat())].filter(Boolean).join(" ")).join(" ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    // Thẻ: AI đề xuất 3-5 thẻ → dùng thẻ đã có cùng đường dẫn, chưa có thì tạo mới
    const tagIds = [];
    if (a.tags?.length) {
      const all = (await admin.from("web_terms").select("id,slug,name").eq("kind", "tag")).data || [];
      for (const name of a.tags) {
        const sl = slugOf(name); if (!sl) continue;
        let t = all.find((x) => x.slug === sl);
        if (!t) { const { data: nt } = await admin.from("web_terms").insert({ kind: "tag", name: name.charAt(0).toUpperCase() + name.slice(1), slug: sl }).select("id,slug,name").single(); if (nt) { t = nt; all.push(nt); } }
        if (t && !tagIds.includes(t.id)) tagIds.push(t.id);
      }
    }
    const terms = [...new Set([post.primary_term, ...tagIds].filter(Boolean))];
    // Đăng theo cài đặt: nháp (mặc định) · tự đăng nếu đạt · tự đặt lịch nếu đạt. Đạt = đủ mọi chỗ (ảnh đại diện, ảnh trong bài, chuyên mục, SEO, đoạn trích) + không còn ghi chú cần xem lại.
    const ready = postReady({ ...post, slug, terms });
    const warn = (st.warn || []).filter((x) => !/chỗ ảnh trong bài/.test(x)); // số chỗ ảnh lệch cấu hình nhưng ô ảnh đã đủ: không chặn tự đăng
    let status = "draft", published_at = null, note = "";
    if (cfg.publish !== "draft") {
      if (!ready.ok || warn.length) note = `Chưa đạt nên để nháp: ${[...ready.miss.map((m) => "thiếu " + m), ...warn].join(" · ")}`;
      else if (cfg.publish === "auto") { status = "published"; published_at = new Date().toISOString(); }
      else {
        const takenAt = ((await admin.from("web_posts").select("published_at,status").gte("published_at", new Date().toISOString())).data || []).filter((r) => r.status === "scheduled" || r.status === "published").map((r) => r.published_at);
        const at = nextSlot(cfg.sched_times, takenAt);
        if (at) { status = "scheduled"; published_at = at; } else note = "Chưa có giờ đăng hợp lệ trong cài đặt nên để nháp.";
      }
    }
    const row = { kind: "post", title: post.title || job.keyword, slug, status, published_at, blocks: post.blocks, excerpt: post.excerpt || null, cover_url: post.cover_url || null, cover_alt: post.cover_alt || null, author_id: author, primary_term: post.primary_term, related: post.related, seo: { ...post.seo, ai_job: job.id, warn }, word_count: words, updated_at: new Date().toISOString(), updated_by: job.created_by };
    const { data: saved, error } = await admin.from("web_posts").insert(row).select("id").single();
    if (error) throw new Error("Lưu bài: " + error.message);
    if (terms.length) await admin.from("web_post_terms").insert(terms.map((term_id) => ({ post_id: saved.id, term_id }))).then(() => {}, () => {});
    await admin.from("web_revisions").insert({ post_id: saved.id, snapshot: { ...row, terms }, reason: status === "draft" ? "ai" : "publish", created_by: job.created_by }).then(() => {}, () => {});
    if (status === "published") await pingIndexNow(admin, `/${slug}`);
    if (status === "published" && cfg.backlinks) { try { st.backlinks = await backlinks(admin, cfg, { ...row, id: saved.id, terms }, job.created_by); } catch (_e) { /* link ngược lỗi không chặn bài */ } }
    await save({ status: "done", post_id: saved.id, finished_at: new Date().toISOString(), locked_until: null, error: null, state: { ...job.state, published: { status, at: published_at, note }, linkStats: linkStats(post.blocks, st.links || []), ...(st.backlinks ? { backlinks: st.backlinks } : {}) } });
    return false;
  }
  return false;
}

// ---- Gắn link nội bộ cho bài đã có: AI chọn chỗ (đoạn | chữ neo | đích), máy chèn. onlyUrl: chỉ gắn link tới 1 trang (link ngược). ----
async function publishedPosts(admin) {
  return ((await admin.from("web_posts").select("id,slug,title,primary_term,seo,blocks").eq("kind", "post").eq("status", "published").order("published_at", { ascending: false }).limit(300)).data || []).map((p) => ({ ...p, keyword: p.seo?.keyword || "" }));
}
async function relinkPost(admin, cfg, post, { onlyUrl = null, apply = true, uid = null, pub = null } = {}) {
  const cats = (await admin.from("web_terms").select("id,name,slug").eq("kind", "category")).data || [];
  const cat = cats.find((c) => c.id === post.primary_term) || null;
  const units = relinkUnits(post.blocks || []);
  let foods = [];
  if (!onlyUrl) { try { const r = await fetch(CALO_API, { signal: AbortSignal.timeout(8000) }); if (r.ok) foods = await r.json(); } catch (_e) { /* bỏ qua */ } }
  const text = units.map((u) => u.text).join(" ").toLowerCase();
  const picked = pickFoods(Array.isArray(foods) ? foods : [], `${post.title} ${text}`).filter((f) => text.includes(String(f.n).toLowerCase()));
  let links = linkTargets({ keyword: post.seo?.keyword || post.title, cat, posts: pub || (await publishedPosts(admin)), foods: picked, selfSlug: post.slug });
  if (onlyUrl) links = links.filter((l) => l.url === onlyUrl).concat(links.some((l) => l.url === onlyUrl) ? [] : [{ url: onlyUrl, kind: "post", title: (pub || []).find((p) => `/${p.slug}` === onlyUrl)?.title || onlyUrl }]);
  if (!units.length || !links.length) return { added: [], blocks: post.blocks, cost: 0 };
  const model = cfg.model, prov = providerOf(model);
  const r = await llm(prov, await keysFor(admin, cfg, prov), { model, maxTokens: 900, system: "Bạn là biên tập viên SEO tiếng Việt, chỉ trả đúng khuôn.", messages: [{ role: "user", content: relinkPrompt(units, links, { title: post.title }) }] });
  const cost = textCost(model, r.inTok, r.outTok);
  await logUsage(admin, uid, prov, model, r.inTok, r.outTok, cost, "web_relink");
  const res = applyRelink(post.blocks || [], parseRelink(r.text), links);
  if (apply && res.added.length) {
    const now = new Date().toISOString();
    const { error } = await admin.from("web_posts").update({ blocks: res.blocks, updated_at: now, updated_by: uid }).eq("id", post.id);
    if (error) throw new Error("Lưu bài: " + error.message);
    await admin.from("web_revisions").insert({ post_id: post.id, snapshot: { ...post, blocks: res.blocks, updated_at: now }, reason: "ai", created_by: uid }).then(() => {}, () => {});
  }
  const { data: j } = await admin.from("web_ai_jobs").select("id,cost_text").eq("post_id", post.id).maybeSingle();
  if (j) await admin.from("web_ai_jobs").update({ cost_text: Number(j.cost_text) + cost }).eq("id", j.id);
  return { ...res, cost };
}
// Link ngược: 1-2 bài cũ đã đăng hợp chủ đề nhất được gắn link sang bài mới
async function backlinks(admin, cfg, post, uid) {
  const pub = await publishedPosts(admin);
  const out = [];
  for (const old of backlinkCandidates(post, pub, 2)) {
    const r = await relinkPost(admin, cfg, old, { onlyUrl: `/${post.slug}`, uid, pub });
    if (r.added.length) out.push({ slug: old.slug, title: old.title, anchor: r.added[0].anchor });
  }
  return out;
}

// Đăng các bài nháp AI đã viết (máy chủ gọi bằng mã bí mật lịch chạy, khi chủ dự án không ngồi máy): làm đúng như nút Đăng
// ở màn AI viết bài = kiểm đủ điều kiện, chuyển đã đăng + lưu lịch sử, báo IndexNow, gắn link từ bài cũ sang. Mỗi lần tối đa max bài (cũ trước).
async function publishDrafts(admin, cfg, { since, max = 3 } = {}) {
  const { data: jobs } = await admin.from("web_ai_jobs").select("id,post_id,state,created_by,finished_at").eq("status", "done").gte("created_at", since).order("finished_at", { ascending: true }).limit(100);
  const out = [];
  for (const j of jobs || []) {
    if (out.filter((x) => x.ok).length >= max) break;
    if (!j.post_id) continue;
    const { data: p } = await admin.from("web_posts").select("*").eq("id", j.post_id).maybeSingle();
    if (!p || p.status !== "draft") continue;
    const terms = ((await admin.from("web_post_terms").select("term_id").eq("post_id", p.id)).data || []).map((t) => t.term_id);
    const ready = postReady({ ...p, terms });
    if (!ready.ok) { out.push({ slug: p.slug, ok: false, miss: ready.miss }); continue; }
    const now = new Date().toISOString();
    const { error } = await admin.from("web_posts").update({ status: "published", published_at: now, updated_at: now, updated_by: j.created_by }).eq("id", p.id).eq("status", "draft");
    if (error) throw new Error("Đăng bài: " + error.message);
    const row = { ...p, status: "published", published_at: now, updated_at: now, terms };
    await admin.from("web_revisions").insert({ post_id: p.id, snapshot: row, reason: "publish", created_by: j.created_by }).then(() => {}, () => {});
    await pingIndexNow(admin, `/${p.slug}`);
    let back = [];
    if (cfg.backlinks) { try { back = await backlinks(admin, cfg, row, j.created_by); } catch (_e) { /* link ngược lỗi không chặn đăng */ } }
    await admin.from("web_ai_jobs").update({ state: { ...(j.state || {}), published: { status: "published", at: now, note: "" }, backlinks: back } }).eq("id", j.id);
    out.push({ slug: p.slug, ok: true, back: back.length });
  }
  return out;
}

// ---- Soát lại bài CŨ (23/10, chủ dự án duyệt "bài nào cũ làm hết, cả bài chưa đăng"): lịch chạy gọi mỗi phút, mỗi lần 1 bước của 1 bài.
// Bước 1 tra web lấy nguồn có link (seo.rev.stage = "revise") → bước 2 AI chỉ trả đoạn cần sửa (tốc độ giảm theo app, thực đơn mẫu
// không dưới sàn, nguồn mơ hồ) + máy gắn mục Nguồn tham khảo → seo.rev.stage = "done". Lưu bản lịch sử trước khi ghi (khôi phục được).
async function reviseSpentToday(admin) {
  const vn = new Date(Date.now() + 7 * 3600e3); const start = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600e3).toISOString();
  const { data } = await admin.from("ai_usage_log").select("cost_usd").eq("feature", "web_revise").gte("created_at", start);
  return (data || []).reduce((t, r) => t + Number(r.cost_usd || 0), 0);
}
async function reviseNext(admin, cfg) {
  if (Number(cfg.daily_cap_usd) > 0 && (await spentToday(admin)) + (await reviseSpentToday(admin)) >= Number(cfg.daily_cap_usd)) return { paused: "cap" };
  const { data: rows } = await admin.from("web_posts").select("id,slug,title,status,blocks,seo,primary_term,published_at").eq("kind", "post").in("status", ["published", "scheduled", "draft"]).order("published_at", { ascending: true, nullsFirst: false }).limit(500);
  const fresh = (p) => p.seo?.rev?.lock && Date.now() - new Date(p.seo.rev.lock).getTime() < 180_000; // đang có lần chạy khác làm bài này (bước AI lâu hơn 1 phút)
  const post = (rows || []).find((p) => !(p.seo?.rev?.v === 2 && p.seo.rev.stage === "done") && !fresh(p));
  if (!post) return { idle: true };
  const model = cfg.model, prov = providerOf(model), keys = await keysFor(admin, cfg, prov);
  const rev = post.seo?.rev?.v === 2 ? post.seo.rev : { v: 2, stage: "research" };
  const saveSeo = async (patch) => { const seo = { ...(post.seo || {}), rev: { ...rev, ...patch } }; const { error } = await admin.from("web_posts").update({ seo }).eq("id", post.id); if (error) throw new Error("Lưu: " + error.message); };
  const fail = async (e) => { const n = (rev.fails || 0) + 1; await saveSeo({ lock: null, fails: n, error: String(e?.message || e).slice(0, 300), ...(n >= 3 ? { stage: "done", gaveUp: true } : {}) }); return { slug: post.slug, error: String(e?.message || e) }; };
  await saveSeo({ lock: new Date().toISOString() }); rev.lock = new Date().toISOString();
  try {
    if (rev.stage === "research") {
      const r = await llm(prov, keys, { model, maxTokens: 1400, search: 4, system: "Bạn là biên tập viên dinh dưỡng, tra web kiểm số liệu. Chỉ trả ghi chú đúng khuôn.", messages: [{ role: "user", content: researchPrompt({ keyword: post.seo?.keyword || post.title, notes: "Bài đã viết xong, cần nguồn có link gốc cho các số liệu chính (nhu cầu calo, tốc độ giảm cân an toàn, sàn calo, số liệu sức khỏe nhóm đối tượng) để soát lại bài." }) }] });
      const cost = textCost(model, r.inTok, r.outTok) + (r.searches || 0) * 0.01;
      await logUsage(admin, null, prov, model, r.inTok, r.outTok, cost, "web_revise");
      await saveSeo({ stage: "revise", research: r.text.trim().slice(0, 6000), cost: cost, fails: 0, error: null, lock: null });
      return { slug: post.slug, stage: "research" };
    }
    // bước 2: sửa đúng chỗ
    let list = [];
    try { const rr = await fetch(CALO_API, { signal: AbortSignal.timeout(8000) }); if (rr.ok) list = await rr.json(); } catch (_e) { /* bỏ qua */ }
    const units = reviseUnits(post.blocks || []);
    const text = units.map((u) => u.text).join(" ");
    const foods = foodTable(pickFoods(Array.isArray(list) ? list : [], `${post.title} ${text}`).filter((f) => text.toLowerCase().includes(String(f.n).toLowerCase())));
    const r = await llm(prov, keys, { model, maxTokens: 6000, system: "Bạn là biên tập viên soát bài dinh dưỡng tiếng Việt. Chỉ trả đúng khuôn.", messages: [{ role: "user", content: revisePrompt({ title: post.title, units, research: rev.research || "", foods }) }] });
    const cost = textCost(model, r.inTok, r.outTok);
    await logUsage(admin, null, prov, model, r.inTok, r.outTok, cost, "web_revise");
    const res = /^\s*KHÔNG CẦN SỬA\s*$/im.test(r.text) ? { blocks: post.blocks, changed: [], skipped: [] } : applyRevise(post.blocks || [], units, parseRevise(r.text));
    const src = hasSources(res.blocks) ? [] : sourcesFromResearch(rev.research || "");
    const blocks = fixSources([...res.blocks, ...sourcesBlocks(src)]);
    const now = new Date().toISOString();
    if (res.changed.length || src.length) {
      await admin.from("web_revisions").insert({ post_id: post.id, snapshot: { ...post, seo: post.seo }, reason: "ai", created_by: null }).then(() => {}, () => {});
      const { error } = await admin.from("web_posts").update({ blocks, updated_at: now, seo: { ...(post.seo || {}), rev: { v: 2, stage: "done", lock: null, at: now, changed: res.changed, skipped: res.skipped, sources: src.length, cost: (rev.cost || 0) + cost } } }).eq("id", post.id);
      if (error) throw new Error("Lưu bài: " + error.message);
      if (post.status === "published") await pingIndexNow(admin, `/${post.slug}`);
    } else await saveSeo({ stage: "done", lock: null, at: now, changed: [], skipped: res.skipped, sources: 0, cost: (rev.cost || 0) + cost, research: undefined });
    return { slug: post.slug, stage: "done", changed: res.changed.length, skipped: res.skipped.length, sources: src.length };
  } catch (e) { return await fail(e); }
}

// Trần tiền mỗi ngày (giờ VN): đã tốn hôm nay ≥ trần thì không chạy bước mới
async function spentToday(admin) {
  const vn = new Date(Date.now() + 7 * 3600e3); const start = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600e3).toISOString();
  const { data } = await admin.from("web_ai_jobs").select("cost_text,cost_img").gte("updated_at", start);
  return (data || []).reduce((s, r) => s + Number(r.cost_text) + Number(r.cost_img), 0);
}

// 23/10: dọn mục "Nguồn tham khảo" đã lưu của bài cũ cho khớp nguồn trích trong thân bài (không gọi AI).
// Mỗi phút 15 bài chưa có seo.src_v; đổi thì lưu bản lịch sử trước, rồi đánh dấu src_v = 1.
async function cleanSources(admin) {
  const { data: rows } = await admin.from("web_posts").select("id,slug,status,title,blocks,seo,excerpt").eq("kind", "post").is("seo->src_v", null).limit(15);
  let fixed = 0;
  for (const p of rows || []) {
    const next = fixSources(p.blocks || []);
    const seo = { ...(p.seo || {}), src_v: 1 };
    if (JSON.stringify(next) !== JSON.stringify(p.blocks || [])) {
      // reason chỉ nhận giá trị trong CHECK của web_revisions ("sources" bị từ chối) → dùng "update"; không lưu được bản lịch sử thì không sửa bài
      const { error: re } = await admin.from("web_revisions").insert({ post_id: p.id, snapshot: p, reason: "update", created_by: null });
      if (re) return { checked: (rows || []).length, fixed, error: "Lưu bản lịch sử: " + re.message };
      const { error } = await admin.from("web_posts").update({ blocks: next, seo, updated_at: new Date().toISOString() }).eq("id", p.id);
      if (!error) fixed++;
    } else await admin.from("web_posts").update({ seo }).eq("id", p.id);
  }
  return { checked: (rows || []).length, fixed };
}

async function tick() {
  const admin = db(); const t0 = Date.now();
  try { await cleanSources(admin); } catch (_e) { /* không chặn hàng chờ viết bài */ }
  const cfg = await config(admin);
  if (await spentToday(admin) >= Number(cfg.daily_cap_usd || 0) && Number(cfg.daily_cap_usd) > 0) return { paused: "cap" };
  const { data } = await admin.rpc("web_ai_claim");
  const job = data?.[0]; if (!job) return { idle: true };
  try {
    let go = true;
    while (go && Date.now() - t0 < BUDGET_MS && !["done", "error", "canceled"].includes(job.status)) {
      const cur = (await admin.from("web_ai_jobs").select("status").eq("id", job.id).single()).data;
      if (cur?.status === "canceled") break; // admin bấm Huỷ giữa chừng
      if (["research", "writing", "fixing", "review"].includes(job.status) && Date.now() - t0 > 20_000) break; // bước gọi AI lâu: để lần sau
      go = await step(admin, job, cfg, t0);
    }
    await admin.from("web_ai_jobs").update({ locked_until: null, attempts: 0 }).eq("id", job.id);
    return { id: job.id, status: job.status };
  } catch (e) {
    const attempts = (job.attempts || 0) + 1;
    const fail = attempts >= MAX_ATTEMPTS;
    await admin.from("web_ai_jobs").update({ attempts, locked_until: null, error: String(e?.message || e).slice(0, 500), ...(fail ? { status: "error", state: { ...(job.state || {}), failedAt: job.status }, finished_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() }).eq("id", job.id);
    return { id: job.id, error: String(e?.message || e) };
  }
}

async function adminUser(req, admin) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: p } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return p?.is_admin ? user : null;
}

async function handle(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  try {
    const body = await req.json().catch(() => ({}));
    const admin = db();
    if (body.action === "tick") {
      const { data: ok } = await admin.rpc("web_writer_cron_ok", { p: String(body.secret || "") });
      if (!ok) return json(req, { error: "Unauthorized" }, 403);
      return json(req, await tick());
    }
    if (body.action === "revise_next") { // lịch chạy soát lại bài cũ (mã bí mật như tick)
      const { data: ok } = await admin.rpc("web_writer_cron_ok", { p: String(body.secret || "") });
      if (!ok) return json(req, { error: "Unauthorized" }, 403);
      return json(req, await reviseNext(admin, await config(admin)));
    }
    if (body.action === "publish_drafts") {
      const { data: ok } = await admin.rpc("web_writer_cron_ok", { p: String(body.secret || "") });
      if (!ok) return json(req, { error: "Unauthorized" }, 403);
      const since = String(body.since || ""); if (!/^\d{4}-\d{2}-\d{2}/.test(since)) return json(req, { error: "Thiếu since." }, 400);
      return json(req, { ok: true, done: await publishDrafts(admin, await config(admin), { since, max: Math.min(5, Number(body.max) || 3) }) });
    }
    const user = await adminUser(req, admin);
    if (!user) return json(req, { error: "Chỉ quản trị viên." }, 403);
    const cfg = await config(admin);
    if (body.action === "test") {
      if (body.which === "fal") {
        const k = await setting(admin, "fal_key"); if (!k) return json(req, { ok: false, error: "Chưa có khoá fal.ai." });
        const r = await fetch("https://fal.run/fal-ai/flux/schnell", { method: "POST", headers: { Authorization: `Key ${k}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "a green apple on a wooden table", image_size: { width: 256, height: 256 }, num_inference_steps: 1, num_images: 1 }) });
        return json(req, r.ok ? { ok: true } : { ok: false, error: `fal.ai trả lỗi ${r.status}` });
      }
      const model = body.model || cfg.model; const p = providerOf(model);
      const r = await llm(p, await keysFor(admin, body.key_mode ? { ...cfg, key_mode: body.key_mode } : cfg, p), { model, maxTokens: 16, messages: [{ role: "user", content: "Trả lời đúng 1 chữ: OK" }] });
      await logUsage(admin, user.id, p, model, r.inTok, r.outTok, textCost(model, r.inTok, r.outTok), "ping_test");
      return json(req, { ok: true, reply: r.text.trim().slice(0, 20) });
    }
    if (body.action === "redraw") {
      const alt = String(body.alt || "").trim().slice(0, 200); if (!alt) return json(req, { error: "Thiếu mô tả ảnh." }, 400);
      const ip = cfg.img_provider || "flux";
      const im = await drawImage(admin, ip, imagePrompt(body.prompt, alt), !!body.cover);
      const url = await storeImage(admin, im, `${body.slug || "anh"}-${body.cover ? "bia" : "anh"}`, alt, user.id, IMG_MODEL[ip]);
      await logUsage(admin, user.id, ip === "flux" ? "fal" : ip, IMG_MODEL[ip], 0, 0, IMG_PRICE[ip], "web_image");
      if (body.post_id) { // cộng tiền vào bài AI đã viết (nếu có)
        const { data: j } = await admin.from("web_ai_jobs").select("id,images,cost_img").eq("post_id", body.post_id).maybeSingle();
        if (j) await admin.from("web_ai_jobs").update({ images: j.images + 1, cost_img: Number(j.cost_img) + IMG_PRICE[ip] }).eq("id", j.id);
      }
      return json(req, { ok: true, url, alt });
    }
    if (body.action === "relink" || body.action === "backlink" || body.action === "links") {
      const { data: post } = await admin.from("web_posts").select("id,slug,title,primary_term,seo,blocks,status,kind").eq("id", String(body.post_id || "")).maybeSingle();
      if (!post) return json(req, { error: "Không thấy bài." }, 404);
      const out = { added: [], back: [] };
      // apply=false (trình soạn): gắn trên khối đang soạn (chưa lưu cũng được), trả khối mới để người sửa xem rồi tự Lưu
      const src = body.apply === false && Array.isArray(body.blocks) ? { ...post, blocks: body.blocks } : post;
      if (body.action !== "backlink") { const r = await relinkPost(admin, cfg, src, { apply: body.apply !== false, uid: user.id }); out.added = r.added; if (body.apply === false) out.blocks = r.blocks; out.cost = r.cost; }
      if (body.action !== "relink" && post.status === "published") out.back = await backlinks(admin, cfg, post, user.id);
      return json(req, { ok: true, ...out });
    }
    return json(req, { error: "Yêu cầu không hợp lệ." }, 400);
  } catch (e) {
    return json(req, { error: String(e?.message || e) }, 500);
  }
}

return { handle, tick, step };
}
