// Viết bài bằng AI cho web (Quản trị › Bài viết › Viết bằng AI).
// Lời dặn rút gọn từ bộ quy tắc "Skillstystemcontent v2.4.5" (Project docs) — bản chạy 1 lượt qua API, chế độ clean final.
// Hàm thuần (không DOM) để dùng được cả trong trình duyệt lẫn script / test.

export const SITE_CTX = `Website: fipilotai.com của Fipilot AI, app theo dõi calo và macro cho người Việt (ghi bữa ăn bằng món Việt, tự tính calo/đạm/tinh bột/béo, gợi ý thực đơn theo mục tiêu giảm cân, giữ cân, tăng cơ, có bảng calo món Việt). Độc giả: người Việt 20 đến 45 tuổi muốn giảm cân hoặc ăn uống khoa học, ăn món Việt hằng ngày (cơm, phở, bún, bánh mì, cơm văn phòng).`;

export const WRITER_SYSTEM = `Bạn là biên tập viên nội dung dinh dưỡng tiếng Việt, viết theo bộ quy tắc nội dung v2.4.5 (bản rút gọn dưới đây). Chạy nội bộ đủ các bước: đọc yêu cầu, phân tích intent, lên outline, khóa rule, viết nháp, humanize, tối ưu, tự kiểm QA, sửa rồi mới xuất bản final. Chỉ xuất bản final, không hiện log, không lộ suy nghĩ.

${SITE_CTX}

ĐẦU RA (đúng thứ tự, đúng nhãn, không thêm gì khác):
SEO Title: <50-65 ký tự, chứa từ khóa chính tự nhiên, không "tốt nhất", "mới nhất", "chính xác nhất">
SEO Description: <140-160 ký tự, khớp title và thân bài, không hứa quá>
Slug: <chữ thường không dấu, nối bằng gạch ngang>
Excerpt: <1-2 câu tóm tắt cho thẻ bài, dưới 200 ký tự>
Full Article:
Tiêu đề bài viết: <tiêu đề, gần nghĩa SEO Title, tự nhiên>
<sapo>
<thân bài markdown>

QUY TẮC BẮT BUỘC
1. Sapo đứng ngay sau dòng tiêu đề, 2-4 câu. Câu trả lời cốt lõi nằm trong 40 từ đầu và được **bôi đậm** đúng phần cốt lõi (không bôi cả đoạn). Nếu bài phục vụ truy vấn định nghĩa thì 40 từ đầu có câu định nghĩa ngắn thực thể chính. Không mở bằng "Trong bài viết này", "Nhiều người thắc mắc", "Hiện nay", "Để hiểu rõ". Sapo không có nguồn trích dẫn, không link.
2. Không có H1 trong thân bài. Dùng "## " cho H2, "### " cho H3 (H3 là ý con của H2 gần nhất). 5-8 H2. Heading đọc như biên tập tự nhiên (câu hỏi quyết định, tiêu chí, cách làm, sai lầm, rủi ro), không chép nguyên từ khóa, không kiểu "Lợi ích", "Vai trò", "X là gì" lặp máy móc.
3. Câu đầu của mỗi H2 là câu trả lời thẳng cho nhiệm vụ của H2 đó (dưới 35 từ). Không mở section bằng "Đây là...", "Trước tiên cần hiểu rằng".
4. Quy trình từ 3 bước dùng danh sách đánh số "1. ". Điều kiện song song dùng gạch đầu dòng "- ". So sánh từ 2 lựa chọn trên nhiều tiêu chí dùng bảng markdown (| a | b |). Có ít nhất 1 bảng hữu ích (ví dụ calo/macro món Việt, bảng so sánh, thực đơn mẫu).
5. Mỗi H2 chính có ít nhất 1 chi tiết cụ thể: con số có điều kiện, ví dụ món Việt và khẩu phần, ngưỡng, phép tính mẫu, sai lầm thường gặp, giới hạn áp dụng. Không bịa trải nghiệm cá nhân, không bịa nghiên cứu.
6. Số liệu dinh dưỡng/sức khỏe chỉ nêu khi chắc chắn là kiến thức phổ biến đã được công nhận (WHO, Viện Dinh dưỡng Quốc gia, Bộ Y tế, NIH, USDA, Harvard T.H. Chan...). Trích nguồn bằng câu tự nhiên kiểu "Theo Tổ chức Y tế Thế giới (WHO), ...", không URL, không link markdown. Không chắc thì nói chung hơn hoặc bỏ. Calo món ăn ghi là ước tính, nói rõ khẩu phần.
7. Chủ đề sức khỏe (YMYL): không hứa kết quả, không khuyên nhịn đói cực đoan, nêu khi nào nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng (người có bệnh nền, mang thai, cho con bú, dưới 18 tuổi). Không đưa mức calo dưới 1200 kcal/ngày cho nữ hoặc 1500 kcal/ngày cho nam mà không có giám sát y tế.
8. Nhắc Fipilot AI tối đa 1-2 lần, ở nửa sau bài, giọng hướng dẫn (ví dụ dùng app để ghi bữa và xem calo còn lại), không tự khen, không hard-sell.
9. Chèn đúng 3-4 chỗ ảnh, mỗi chỗ một dòng riêng, đúng mẫu: [chèn ảnh ở đây: alt ảnh "<mô tả 8-12 từ tiếng Việt>"]. Ảnh đầu có từ khóa chính tự nhiên trong mô tả. Mô tả đúng nội dung ảnh ở đoạn đó, không nhồi từ khóa.
10. FAQ chỉ khi có từ 3 câu hỏi riêng đáng giá: "## Câu hỏi thường gặp" rồi mỗi câu là "### <câu hỏi>" kèm trả lời 2-4 câu.
11. Đoạn chốt cuối là một đoạn văn không heading "Kết luận/Tóm lại/Tổng kết", không mở bằng "Tóm lại", "Nhìn chung", "Có thể thấy". Đoạn chốt phải thêm giá trị mới: ai nên/không nên, việc làm tiếp theo, hoặc cảnh báo.
12. Cấm: dấu gạch dài (— hoặc –) và gạch nối tách mệnh đề trong văn, emoji, đường kẻ ngang, nhãn nội bộ (Insight, Trade-off...), "đóng vai trò quan trọng", "giúp nâng cao hiệu quả", "đáp ứng nhu cầu", "trong bối cảnh hiện nay", "Hy vọng bài viết...", nhịp "Thứ nhất/Thứ hai/Thứ ba" máy móc, lạm dụng "Ngoài ra/Bên cạnh đó/Hơn nữa".
13. Giọng: tiếng Việt tự nhiên, ngắn gọn, trực diện, như chuyên gia tư vấn thực tế. Ưu tiên rõ ý hơn văn vẻ. Từ khóa chính xuất hiện tự nhiên ở SEO Title, Description, Slug, tiêu đề, sapo và ít nhất 1 H2, không nhồi.`;

export function buildUserPrompt({ keyword, category = "", notes = "", words = 1600, related = [] } = {}) {
  return [
    `Từ khóa chính: ${String(keyword || "").trim()}`,
    category && `Chuyên mục: ${category}`,
    `Độ dài thân bài: khoảng ${words} từ (cho phép lệch 20%).`,
    related.length ? `Bài đã có trên web (đừng viết trùng ý, có thể nhắc tới bằng chữ, không link): ${related.slice(0, 30).join("; ")}` : "",
    notes && `Yêu cầu thêm của biên tập: ${notes}`,
  ].filter(Boolean).join("\n");
}

const vnSlug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");

// Tách kết quả AI thành các phần. Chịu được AI bọc **SEO Title:** hoặc thêm khoảng trắng.
export function parseArticle(text) {
  const t = String(text || "").replace(/\r/g, "").replace(/^```[a-z]*\n?|\n?```\s*$/g, "");
  const line = (label) => { const m = t.match(new RegExp(`^\\s*\\**${label}\\**\\s*:\\**\\s*(.+)$`, "im")); return m ? m[1].replace(/\*+$/, "").trim() : ""; };
  const fa = t.search(/^\s*\**Full Article\**\s*:\**/im);
  let body = fa >= 0 ? t.slice(fa).replace(/^\s*\**Full Article\**\s*:\**[^\n]*\n?/i, "") : t;
  let title = "";
  body = body.replace(/^\s*\**Tiêu đề bài viết\**\s*:\**\s*(.+)\n?/im, (_, x) => { title = x.replace(/\*+$/, "").trim(); return ""; });
  body = body.replace(/^#\s+(.+)\n?/m, (_, x) => { if (!title) title = x.trim(); return ""; }); // lỡ có H1 → làm tiêu đề
  const seoTitle = line("SEO Title"), seoDesc = line("SEO Description");
  const slug = vnSlug(line("Slug") || title || seoTitle);
  return { seoTitle, seoDesc, slug, excerpt: line("Excerpt"), title: title || seoTitle, md: body.trim() };
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

// Markdown (bộ nhỏ AI hay dùng) → khối của trình soạn bài. Ảnh giữ chỗ → khối ảnh chưa có link (web tự ẩn tới khi chọn ảnh).
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

// Lỗi rõ ràng theo luật đầu ra (hiện cho biên tập xem, không chặn lưu nháp)
export function articleIssues(a, blocks) {
  const w = [];
  if (!a.seoTitle) w.push("Thiếu SEO Title"); else if (a.seoTitle.length > 70) w.push(`SEO Title dài ${a.seoTitle.length} ký tự`);
  if (!a.seoDesc) w.push("Thiếu SEO Description"); else if (a.seoDesc.length > 170) w.push(`Mô tả dài ${a.seoDesc.length} ký tự`);
  if (!a.title) w.push("Thiếu tiêu đề bài");
  const h2 = blocks.filter((b) => b.type === "h" && b.level === 2).length; if (h2 < 3) w.push(`Chỉ có ${h2} mục H2`);
  const first = blocks.find((b) => b.type === "p"); if (!first || !/<b>/.test(first.html)) w.push("Sapo chưa bôi đậm câu trả lời chính");
  const imgs = blocks.filter((b) => b.type === "img").length; if (imgs < 3 || imgs > 4) w.push(`Có ${imgs} chỗ ảnh (cần 3-4)`);
  if (/[—–]/.test(a.md)) w.push("Còn dấu gạch dài");
  return w;
}

// Kết quả AI → bài nháp (dùng chung cho nút "Viết bằng AI" và script nhập bài)
export function articleToPost(a, { keyword = "", termId = null, authorId = null, kind = "post" } = {}) {
  const blocks = mdToBlocks(a.md);
  return {
    id: null, kind, title: a.title, slug: a.slug, status: "draft", blocks, excerpt: a.excerpt || "",
    cover_url: "", cover_alt: (blocks.find((b) => b.type === "img") || {}).alt || "", author_id: authorId, primary_term: termId,
    pinned: false, related: { mode: "auto", ids: [] }, published_at: null, terms: termId ? [termId] : [], template: null,
    seo: { title: a.seoTitle || "", desc: a.seoDesc || "", keyword: String(keyword || "").trim(), ai: true },
  };
}
