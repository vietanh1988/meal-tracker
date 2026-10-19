// AI viết bài cho web (Quản trị › WEB · NỘI DUNG › AI viết bài).
// Bộ quy tắc = bản rút gọn của "Skillstystemcontent v2.4.5" cho Fipilot (sửa được ở màn AI viết bài; "Về bản gốc" = RULES_DEFAULT).
// Hàm thuần, KHÔNG import gì: file này được chép y nguyên sang supabase/functions/web-writer/aiWrite.js (test so khớp 2 bản).

export const SITE_CTX = `Website: fipilotai.com của Fipilot AI, app theo dõi calo và macro cho người Việt (ghi bữa ăn bằng món Việt, tự tính calo/đạm/tinh bột/béo, gợi ý thực đơn theo mục tiêu giảm cân, giữ cân, tăng cơ, có bảng calo món Việt). Độc giả: người Việt 20 đến 45 tuổi muốn giảm cân hoặc ăn uống khoa học, ăn món Việt hằng ngày (cơm, phở, bún, bánh mì, cơm văn phòng).`;

export const RULES_VERSION = "v2.4.5 rút gọn · Fipilot";

export const RULES_DEFAULT = `Bạn là biên tập viên nội dung dinh dưỡng tiếng Việt, viết theo bộ quy tắc nội dung v2.4.5 (bản rút gọn dưới đây). Tự làm trong đầu các bước: đọc yêu cầu, xác định ý định tìm kiếm, lên dàn ý, viết, làm mượt, tối ưu, tự kiểm rồi mới xuất bản cuối. Chỉ xuất bản cuối, không hiện các bước, không lộ suy nghĩ. Độ dài do ý định tìm kiếm quyết định: đủ trả lời trọn vẹn, không độn chữ.

QUY TẮC BẮT BUỘC
1. Sapo đứng ngay sau dòng tiêu đề, 2-4 câu. Câu trả lời cốt lõi nằm trong 40 từ đầu và được **bôi đậm** đúng phần cốt lõi (không bôi cả đoạn). Nếu bài phục vụ truy vấn định nghĩa thì 40 từ đầu có câu định nghĩa ngắn thực thể chính. Không mở bằng "Trong bài viết này", "Nhiều người thắc mắc", "Hiện nay", "Để hiểu rõ". Sapo không có nguồn trích dẫn, không link.
2. Không có H1 trong thân bài. Dùng "## " cho H2, "### " cho H3 (H3 là ý con của H2 gần nhất). Heading đọc như biên tập tự nhiên (câu hỏi quyết định, tiêu chí, cách làm, sai lầm, rủi ro), không chép nguyên từ khóa, không kiểu "Lợi ích", "Vai trò", "X là gì" lặp máy móc. Mỗi H2 một việc riêng, không trùng nhau.
3. Câu đầu của mỗi H2 là câu trả lời thẳng cho nhiệm vụ của H2 đó (dưới 35 từ). Không mở section bằng "Đây là...", "Trước tiên cần hiểu rằng".
4. Quy trình từ 3 bước dùng danh sách đánh số "1. ". Điều kiện song song dùng gạch đầu dòng "- ". So sánh từ 2 lựa chọn trên nhiều tiêu chí dùng bảng markdown (| a | b |). Có ít nhất 1 bảng hữu ích (ví dụ calo/macro món Việt, bảng so sánh, thực đơn mẫu).
5. Mỗi H2 chính có ít nhất 1 chi tiết cụ thể: con số có điều kiện, ví dụ món Việt và khẩu phần, ngưỡng, phép tính mẫu, sai lầm thường gặp, giới hạn áp dụng. Không bịa trải nghiệm cá nhân, không bịa nghiên cứu.
6. Số liệu dinh dưỡng/sức khỏe chỉ nêu khi đã kiểm ở ghi chú tra cứu hoặc là kiến thức phổ biến đã được công nhận (WHO, Viện Dinh dưỡng Quốc gia, Bộ Y tế, NIH, USDA, Harvard T.H. Chan...). Trích nguồn bằng câu tự nhiên kiểu "Theo Tổ chức Y tế Thế giới (WHO), ...", không URL, không link markdown. Không chắc thì nói chung hơn hoặc bỏ. Calo món ăn ghi là ước tính, nói rõ khẩu phần.
7. Chủ đề sức khỏe (YMYL): không hứa kết quả, không khuyên nhịn đói cực đoan, nêu khi nào nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng (người có bệnh nền, mang thai, cho con bú, dưới 18 tuổi). Không đưa mức calo dưới 1200 kcal/ngày cho nữ hoặc 1500 kcal/ngày cho nam mà không có giám sát y tế.
8. Nhắc Fipilot AI tối đa 1-2 lần, ở nửa sau bài, giọng hướng dẫn (ví dụ dùng app để ghi bữa và xem calo còn lại), không tự khen, không hard-sell.
9. Ảnh: số chỗ ảnh theo phần CẤU HÌNH LẦN CHẠY. Mỗi chỗ một dòng riêng, đúng mẫu: [chèn ảnh ở đây: alt ảnh "<mô tả 8-12 từ tiếng Việt>"]. Chỉ mô tả thứ chụp được thật (món ăn, mâm cơm, nguyên liệu, người đang ăn hay đi bộ, cái cân, chai nước), KHÔNG mô tả bảng, biểu đồ, infographic, ảnh có chữ. Mô tả đúng nội dung ảnh ở đoạn đó, không nhồi từ khóa.
10. FAQ chỉ khi có từ 3 câu hỏi riêng đáng giá: "## Câu hỏi thường gặp" rồi mỗi câu là "### <câu hỏi>" kèm trả lời 2-4 câu.
11. Đoạn chốt cuối là một đoạn văn không heading "Kết luận/Tóm lại/Tổng kết", không mở bằng "Tóm lại", "Nhìn chung", "Có thể thấy". Đoạn chốt phải thêm giá trị mới: ai nên/không nên, việc làm tiếp theo, hoặc cảnh báo.
12. Cấm: dấu gạch dài (— hoặc –) và gạch nối tách mệnh đề trong văn, emoji, đường kẻ ngang, nhãn nội bộ (Insight, Trade-off...), "đóng vai trò quan trọng", "giúp nâng cao hiệu quả", "đáp ứng nhu cầu", "trong bối cảnh hiện nay", "Hy vọng bài viết...", nhịp "Thứ nhất/Thứ hai/Thứ ba" máy móc, lạm dụng "Ngoài ra/Bên cạnh đó/Hơn nữa".
13. Giọng: tiếng Việt tự nhiên, ngắn gọn, trực diện, như chuyên gia tư vấn thực tế. Ưu tiên rõ ý hơn văn vẻ. Từ khóa chính xuất hiện tự nhiên ở SEO Title, Description, Slug, tiêu đề, sapo và ít nhất 1 H2, không nhồi.`;

// Phần máy tự ghép sau bộ quy tắc: bối cảnh web + khuôn đầu ra + số ảnh (không cho sửa, để máy đọc được kết quả)
export function runConfig({ inlineImages = 1 } = {}) {
  const n = Math.max(0, Math.min(4, inlineImages | 0));
  return `${SITE_CTX}

CẤU HÌNH LẦN CHẠY
- Ảnh bìa: 1 (ghi ở dòng "Ảnh bìa:"), chỗ ảnh trong thân bài: đúng ${n}.

ĐẦU RA (đúng thứ tự, đúng nhãn, không thêm gì khác, không bọc trong khối code):
SEO Title: <50-65 ký tự, chứa từ khóa chính tự nhiên, không "tốt nhất", "mới nhất", "chính xác nhất">
SEO Description: <140-160 ký tự, khớp title và thân bài, không hứa quá>
Slug: <chữ thường không dấu, nối bằng gạch ngang>
Excerpt: <1-2 câu tóm tắt cho thẻ bài, dưới 200 ký tự>
Ảnh bìa: <mô tả 8-12 từ tiếng Việt, có từ khóa chính tự nhiên, thứ chụp được thật>
Full Article:
Tiêu đề bài viết: <tiêu đề, gần nghĩa SEO Title, tự nhiên>
<sapo>
<thân bài markdown>
Image Prompts:
1. <English photo prompt for the cover, concrete subject, Vietnamese setting>
${Array.from({ length: n }, (_, i) => `${i + 2}. <English photo prompt for inline image ${i + 1}>`).join("\n")}`;
}

export const systemPrompt = (rules, cfg) => `${String(rules || RULES_DEFAULT).trim()}\n\n${runConfig(cfg)}`;

export function buildUserPrompt({ keyword, category = "", notes = "", research = "", related = [] } = {}) {
  return [
    `Từ khóa chính: ${String(keyword || "").trim()}`,
    category && `Chuyên mục: ${category}`,
    research && `GHI CHÚ TRA CỨU (đã kiểm trên web, chỉ dùng số liệu ở đây hoặc kiến thức phổ biến chắc chắn):\n${research}`,
    related.length ? `Bài đã có trên web (đừng viết trùng ý, có thể nhắc tới bằng chữ, không link): ${related.slice(0, 30).join("; ")}` : "",
    notes && `Yêu cầu thêm của biên tập: ${notes}`,
    "Viết bài theo đúng ĐẦU RA.",
  ].filter(Boolean).join("\n\n");
}

// Bước tra cứu: chỉ kiểm số liệu + dàn ý, KHÔNG viết bài (ra ghi chú ngắn để bước viết dùng)
export function researchPrompt({ keyword, category = "", cats = [], notes = "" } = {}) {
  return [
    `Từ khóa chính: ${String(keyword || "").trim()}`,
    category ? `Chuyên mục: ${category}` : cats.length ? `Chọn 1 chuyên mục hợp nhất trong danh sách (ghi đúng mã ở dòng "Chuyên mục:"): ${cats.map((c) => `${c.slug} (${c.name})`).join(", ")}` : "",
    notes && `Yêu cầu thêm của biên tập: ${notes}`,
    `Việc cần làm: tra web để kiểm các số liệu dinh dưỡng / sức khỏe mà bài về từ khóa này sẽ cần (ưu tiên WHO, Viện Dinh dưỡng Quốc gia, Bộ Y tế, NIH, USDA, Harvard, Mayo Clinic, NHS). KHÔNG viết bài. Trả về ghi chú ngắn gọn, tối đa 350 từ, đúng khuôn:
Chuyên mục: <mã chuyên mục, chỉ khi được yêu cầu chọn>
Ý định tìm kiếm: <1 câu>
Dàn ý H2: <5-8 dòng, mỗi dòng 1 H2>
Số liệu đã kiểm:
- <số liệu cụ thể> (nguồn: <tên tổ chức / tài liệu>)`,
  ].filter(Boolean).join("\n\n");
}
export const pickCategory = (notes, cats = []) => { const m = String(notes || "").match(/^\s*Chuyên mục:\s*([a-z0-9-]+)/im); return m ? cats.find((c) => c.slug === m[1]) || null : null; };

const vnSlug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");
export const slugOf = vnSlug;

// Tách kết quả AI thành các phần. Chịu được AI bọc **SEO Title:** hoặc thêm khoảng trắng.
export function parseArticle(text) {
  let t = String(text || "").replace(/\r/g, "").replace(/^```[a-z]*\n?|\n?```\s*$/g, "");
  const prompts = [];
  t = t.replace(/^\s*\**Image Prompts\**\s*:\**\s*\n([\s\S]*)$/im, (_, list) => { for (const l of list.split("\n")) { const m = l.match(/^\s*\d+[.)]\s*(.+)/); if (m) prompts.push(m[1].trim()); } return ""; });
  const line = (label) => { const m = t.match(new RegExp(`^\\s*\\**${label}\\**\\s*:\\**\\s*(.+)$`, "im")); return m ? m[1].replace(/\*+$/, "").trim() : ""; };
  const fa = t.search(/^\s*\**Full Article\**\s*:\**/im);
  let body = fa >= 0 ? t.slice(fa).replace(/^\s*\**Full Article\**\s*:\**[^\n]*\n?/i, "") : t;
  let title = "";
  body = body.replace(/^\s*\**Tiêu đề bài viết\**\s*:\**\s*(.+)\n?/im, (_, x) => { title = x.replace(/\*+$/, "").trim(); return ""; });
  body = body.replace(/^#\s+(.+)\n?/m, (_, x) => { if (!title) title = x.trim(); return ""; }); // lỡ có H1 → làm tiêu đề
  const seoTitle = line("SEO Title"), seoDesc = line("SEO Description");
  const slug = vnSlug(line("Slug") || title || seoTitle);
  const cover = line("Ảnh bìa").replace(/^["“”']|["“”']$/g, "");
  return { seoTitle, seoDesc, slug, excerpt: line("Excerpt"), cover, prompts, title: title || seoTitle, md: body.replace(/[—–]/g, ",").trim() };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Chữ trong 1 dòng: **đậm**, *nghiêng*; bỏ link markdown (giữ chữ), bỏ URL trần
export function mdInline(s) {
  return esc(String(s || "").replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1").replace(/https?:\/\/\S+/g, "").replace(/[—–]/g, ","))
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<b>$1</b>").replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<i>$2</i>")
    .replace(/\s+/g, " ").trim();
}
const IMG = /^\s*\[chèn ảnh ở đây:\s*alt ảnh\s*["“”']?(.+?)["“”']?\s*\]\s*$/i;
const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => mdInline(c.trim()));

// Markdown (bộ nhỏ AI hay dùng) → khối của trình soạn bài. Ảnh giữ chỗ → khối ảnh chưa có link (web tự ẩn tới khi có ảnh).
export function mdToBlocks(md) {
  const L = String(md || "").replace(/\r/g, "").split("\n");
  const out = []; let para = [];
  const flush = () => { if (para.length) { const h = mdInline(para.join(" ")); if (h) out.push({ type: "p", html: h }); para = []; } };
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (!l.trim()) { flush(); continue; }
    let m;
    if ((m = l.match(IMG))) { flush(); out.push({ type: "img", url: "", alt: m[1].trim() }); continue; }
    if ((m = l.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/))) { flush(); out.push({ type: "h", level: Math.min(4, Math.max(2, m[1].length)), text: mdInline(m[2].replace(/^\*\*(.+)\*\*$/, "$1")) }); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { flush(); continue; } // đường kẻ: bỏ
    if (/^\s*\|/.test(l)) {
      flush(); const rows = [];
      for (; i < L.length && /^\s*\|/.test(L[i]); i++) if (!/^\s*\|?\s*:?-{2,}/.test(L[i])) rows.push(cells(L[i]));
      i--; if (rows.length) out.push({ type: "table", head: rows[0], rows: rows.slice(1) }); continue;
    }
    if ((m = l.match(/^\s*([-*+]|\d+[.)])\s+(.+)/))) {
      flush(); const ordered = /\d/.test(m[1]); const items = [];
      for (; i < L.length; i++) {
        const x = L[i].match(/^\s*([-*+]|\d+[.)])\s+(.+)/);
        if (x && /\d/.test(x[1]) === ordered) items.push(mdInline(x[2]));
        else if (L[i].trim() && /^\s{2,}\S/.test(L[i]) && items.length) items[items.length - 1] += " " + mdInline(L[i]);
        else break;
      }
      i--; out.push({ type: "list", ordered, items: items.filter(Boolean) }); continue;
    }
    if ((m = l.match(/^\s*>\s?(.*)/))) { flush(); const q = mdInline(m[1]); if (q) out.push({ type: "quote", html: q }); continue; }
    para.push(l.trim());
  }
  flush();
  return out;
}

// Lỗi theo luật đầu ra. hard = phải nhờ AI sửa 1 lần; còn lại chỉ là nhắc.
export function articleIssues(a, blocks, { inlineImages = null } = {}) {
  const hard = [], soft = [];
  if (!a.seoTitle) hard.push("Thiếu SEO Title"); else if (a.seoTitle.length > 70) soft.push(`SEO Title dài ${a.seoTitle.length} ký tự`);
  if (!a.seoDesc) hard.push("Thiếu SEO Description"); else if (a.seoDesc.length > 170) soft.push(`Mô tả dài ${a.seoDesc.length} ký tự`);
  if (!a.title) hard.push("Thiếu tiêu đề bài");
  const h2 = blocks.filter((b) => b.type === "h" && b.level === 2).length; if (h2 < 3) hard.push(`Chỉ có ${h2} mục H2 (cần ít nhất 3)`);
  const first = blocks.find((b) => b.type === "p"); if (!first || !/<b>/.test(first.html)) hard.push("Sapo chưa bôi đậm câu trả lời chính");
  const imgs = blocks.filter((b) => b.type === "img").length;
  if (inlineImages != null && imgs !== inlineImages) soft.push(`Có ${imgs} chỗ ảnh trong bài (cấu hình ${inlineImages})`);
  if (inlineImages != null && !a.cover) soft.push("Thiếu mô tả ảnh bìa");
  return { hard, soft, all: [...hard, ...soft] };
}

// Kết quả AI → bài nháp. imgs: { cover: {url, alt}, inline: [{url, alt}] } (ảnh đã vẽ / dùng lại)
export function articleToPost(a, { keyword = "", termId = null, authorId = null, kind = "post", imgs = null } = {}) {
  const blocks = mdToBlocks(a.md);
  let k = 0;
  if (imgs?.inline?.length) for (const b of blocks) if (b.type === "img" && imgs.inline[k]) { const g = imgs.inline[k++]; if (g?.url) { b.url = g.url; if (g.alt) b.alt = g.alt; } }
  return {
    id: null, kind, title: a.title, slug: a.slug, status: "draft", blocks, excerpt: a.excerpt || "",
    cover_url: imgs?.cover?.url || "", cover_alt: imgs?.cover?.alt || a.cover || (blocks.find((b) => b.type === "img") || {}).alt || "", author_id: authorId, primary_term: termId,
    pinned: false, related: { mode: "auto", ids: [] }, published_at: null, terms: termId ? [termId] : [], template: null,
    seo: { title: a.seoTitle || "", desc: a.seoDesc || "", keyword: String(keyword || "").trim(), ai: true },
  };
}

// Câu vẽ ảnh: khung phong cách cố định cho cả web + nội dung từng ảnh
export const IMG_STYLE = "Realistic editorial food photography, Vietnamese home setting, natural window light, wooden table or light linen, shallow depth of field, appetizing, true-to-life colors. No text, no letters, no watermark, no logo, no collage.";
export const imagePrompt = (subject, alt = "") => `${String(subject || alt || "Vietnamese healthy meal").trim()}. ${IMG_STYLE}`;

// Dùng lại ảnh có sẵn trong Thư viện ảnh: so từ trong mô tả (bỏ dấu, bỏ từ nối, bỏ từ chỉ bát / đĩa / ly…).
// Trùng ≥ 2 từ, điểm = số từ trùng / số từ của bên ít từ hơn ≥ 0,6, và phủ ≥ 1/3 mô tả cần.
const STOP = new Set("anh mot cac nhung va voi cho cua trong tren duoi la co khong de nguoi ban mon an bua giam can cach nen hay khi tai the nay do mau hinh dang duoc rat it nhieu bat dia chen to ly coc phan suat tren ban go".split(" "));
const words = (s) => [...new Set(vnSlug(s).split("-").filter((w) => w.length > 1 && !STOP.has(w)))];
export function matchMedia(alt, media = [], used = []) {
  const want = words(alt); if (want.length < 2) return null;
  let best = null;
  for (const m of media) {
    if (!m?.url || used.includes(m.url)) continue;
    const have = new Set(words(`${m.alt || ""} ${m.name || ""}`));
    const hit = want.filter((w) => have.has(w)).length;
    const score = hit / Math.min(want.length, have.size || 1);
    if (hit >= 2 && score >= 0.6 && hit / want.length >= 1 / 3 && (!best || score > best.score)) best = { ...m, score };
  }
  return best;
}

// Tiền: giá USD / 1 triệu token (đồng bộ với ai-proxy); tra web 0,01 USD / lượt; ảnh theo bảng IMG_PRICE
export const TEXT_PRICE = { "claude-haiku-5-5": { in: 0.10, out: 0.50 }, "claude-sonnet-5-5": { in: 2, out: 10 }, "claude-opus-5-5": { in: 4, out: 20 } };
export const SEARCH_PRICE = 0.01;
export const IMG_PRICE = { flux: 0.003 };
export const textCost = (model, inTok, outTok, searches = 0) => { const p = TEXT_PRICE[model] || TEXT_PRICE["claude-sonnet-5-5"]; return (inTok * p.in + outTok * p.out) / 1e6 + searches * SEARCH_PRICE; };

// Cài đặt mặc định của màn AI viết bài
export const AI_DEFAULTS = { model: "claude-sonnet-5-5", key_mode: "shared", searches: 3, img_on: true, img_provider: "flux", img_inline: 1, img_reuse: true, rate: 26000, daily_cap_usd: 2, rules: null };
export const cfgOf = (data) => ({ ...AI_DEFAULTS, ...(data || {}) });
