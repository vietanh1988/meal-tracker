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
6. Số liệu dinh dưỡng/sức khỏe chỉ nêu khi đã kiểm ở ghi chú tra cứu hoặc là kiến thức phổ biến đã được công nhận (WHO, Viện Dinh dưỡng Quốc gia, Bộ Y tế, NIH, USDA, Harvard T.H. Chan...). Trích nguồn bằng câu tự nhiên kiểu "Theo Tổ chức Y tế Thế giới (WHO), ...", không URL, không link markdown. Không chắc thì nói chung hơn hoặc bỏ. Calo, đạm, tinh bột, béo của món Việt: món có trong BẢNG CALO KHO MÓN FIPILOT thì dùng ĐÚNG số trong bảng đó (đúng khẩu phần, có thể nói "theo bảng calo của Fipilot AI"); món không có trong bảng thì ghi là ước tính và nói rõ khẩu phần.
6a. MỘT SỐ CHÍNH CHO MỖI MÓN: món có trong bảng app thì số app là số chính, dùng ĐÚNG số đó ở mọi chỗ (sapo, thân bài, bảng, FAQ). Số của nguồn khác chỉ nêu khi giải thích vì sao chênh (tô to hơn, nhiều nước béo, thêm quẩy...), tối đa 1 nguồn khác, ghi rõ khẩu phần của nguồn đó. Không rải nhiều khoảng số khác nhau cho cùng một món.
6b. SỐ NÀO CŨNG CÓ NGUỒN CÓ TÊN: mọi con số ngoài bảng app (nhu cầu calo, natri, khối lượng tăng giảm, calo món ăn kèm...) phải có trong ghi chú tra cứu kèm tên tổ chức / tài liệu, hoặc là kiến thức phổ biến của WHO / Bộ Y tế / Viện Dinh dưỡng. Không có thì bỏ số đó, viết định tính. Cấm nguồn mơ hồ: "nhiều trang dinh dưỡng", "thực tế", "theo các chuyên gia", "nghiên cứu cho thấy" không tên. Hai số khác nhau cho cùng một thứ thì phải nói vì sao khác.
6c. SO SÁNH PHẢI KHỚP BẢNG: câu so sánh trong sapo / thân bài ("ngang một bữa cơm", "ít hơn bún bò") phải đúng với số trong bảng của chính bài.
6e. THỰC ĐƠN MẪU / NGÀY MẪU: ghi khẩu phần từng món, tổng kcal mỗi ngày phải khớp mục tiêu bài nêu (lệch tối đa 5%) và KHÔNG dưới sàn bài đã nêu (mặc định 1200 kcal nữ / 1500 kcal nam); thiếu thì tăng khẩu phần hoặc đưa bữa phụ vào thực đơn chính, không để "thêm món phụ cho đủ". Ví dụ cố tình cho thấy một ngày ăn thiếu thì nói rõ ngay câu đó là ví dụ thiếu.
6f. TỐC ĐỘ GIẢM CÂN DÙNG MỨC CỦA APP: 0,25-0,75% cân nặng mỗi tuần (chậm 0,25%, vừa 0,5%, nhanh 0,75%; người 60 kg giảm khoảng 0,15-0,45 kg/tuần). Mức của nguồn khác (ví dụ NIH 0,5-1 kg/tuần) chỉ nêu kèm câu giải thích vì sao app chọn mức thấp hơn. Sàn calo 1200 kcal nữ / 1500 kcal nam.
6d. KHÔNG KHUYÊN ĐIỀU KHÔNG CÓ SỐ: lời khuyên kiểu "chọn X vì ít calo hơn" chỉ viết khi bài có số của X; không có số thì nói đúng mức chắc chắn hoặc bỏ.
7. Chủ đề sức khỏe (YMYL): không hứa kết quả, không khuyên nhịn đói cực đoan, nêu khi nào nên hỏi bác sĩ hoặc chuyên gia dinh dưỡng. Tách nhóm đối tượng cho đúng, không gộp chung một dòng: người có bệnh nền (cao huyết áp, thận, tim mạch, tiểu đường, gan) · phụ nữ mang thai hoặc cho con bú · trẻ em và người dưới 18 tuổi (nhu cầu dinh dưỡng riêng, không áp dụng mức ăn kiêng người lớn). Không đưa mức calo dưới 1200 kcal/ngày cho nữ hoặc 1500 kcal/ngày cho nam mà không có giám sát y tế.
8. Nhắc Fipilot AI tối đa 1-2 lần, ở nửa sau bài, giọng hướng dẫn (ví dụ dùng app để ghi bữa và xem calo còn lại), không tự khen, không hard-sell.
9. Ảnh: số chỗ ảnh theo phần CẤU HÌNH LẦN CHẠY. Mỗi chỗ một dòng riêng, đúng mẫu: [chèn ảnh ở đây: alt ảnh "<mô tả 8-12 từ tiếng Việt>"]. Chỉ mô tả thứ chụp được thật (món ăn, mâm cơm, nguyên liệu, người đang ăn hay đi bộ, cái cân, chai nước), KHÔNG mô tả bảng, biểu đồ, infographic, ảnh có chữ. Mô tả đúng nội dung ảnh ở đoạn đó, không nhồi từ khóa.
10. FAQ chỉ khi có từ 3 câu hỏi riêng đáng giá: "## Câu hỏi thường gặp" rồi mỗi câu là "### <câu hỏi>" kèm trả lời 2-4 câu.
11. Đoạn chốt cuối là một đoạn văn không heading "Kết luận/Tóm lại/Tổng kết", không mở bằng "Tóm lại", "Nhìn chung", "Có thể thấy". Đoạn chốt phải thêm giá trị mới: ai nên/không nên, việc làm tiếp theo, hoặc cảnh báo.
12. Cấm: dấu gạch dài (— hoặc –) và gạch nối tách mệnh đề trong văn, emoji, đường kẻ ngang, nhãn nội bộ (Insight, Trade-off...), "đóng vai trò quan trọng", "giúp nâng cao hiệu quả", "đáp ứng nhu cầu", "trong bối cảnh hiện nay", "Hy vọng bài viết...", nhịp "Thứ nhất/Thứ hai/Thứ ba" máy móc, lạm dụng "Ngoài ra/Bên cạnh đó/Hơn nữa". Cấm văn dịch: "mặc định" (by default), danh từ hoá "sự + tính từ/động từ" ("sự đơn điệu thực phẩm"), "không cấm với ai", "biến X thành Y", "phụ thuộc vào việc", "đóng góp vào", "mang lại", "một cách + tính từ". Không mở nhiều đoạn / mục bằng cùng một kiểu câu (ví dụ "Phở là..." lặp lại).
12a. Đoạn văn ngắn cho dễ đọc trên điện thoại: mỗi đoạn 2-3 câu, tối đa khoảng 50 chữ; ý mới thì xuống đoạn mới.
13. Giọng: tiếng Việt tự nhiên như người Việt nói chuyện, câu chủ động, ngắn gọn, trực diện, như chuyên gia tư vấn thực tế. Ưu tiên rõ ý hơn văn vẻ. Từ khóa chính xuất hiện tự nhiên ở SEO Title, Description, Slug, tiêu đề, sapo và ít nhất 1 H2, không nhồi.`;

// Phần máy tự ghép sau bộ quy tắc: bối cảnh web + khuôn đầu ra + số ảnh (không cho sửa, để máy đọc được kết quả)
export function runConfig({ inlineImages = 1 } = {}) {
  const n = Math.max(0, Math.min(4, inlineImages | 0));
  return `${SITE_CTX}

CẤU HÌNH LẦN CHẠY
- Ảnh bìa: 1 (ghi ở dòng "Ảnh bìa:"), chỗ ảnh trong thân bài: đúng ${n}. Chỗ ảnh đầu tiên đặt sau H2 đầu tiên, không đặt ngay sau sapo (ảnh bìa đã ở đầu bài); các chỗ ảnh rải đều, không liền nhau.

ĐẦU RA (đúng thứ tự, đúng nhãn, không thêm gì khác, không bọc trong khối code):
SEO Title: <50-65 ký tự, chứa từ khóa chính tự nhiên, không "tốt nhất", "mới nhất", "chính xác nhất">
SEO Description: <140-160 ký tự, khớp title và thân bài, không hứa quá>
Slug: <chữ thường không dấu, nối bằng gạch ngang>
Excerpt: <1-2 câu tóm tắt cho thẻ bài, dưới 200 ký tự>
Thẻ: <3-5 thẻ ngắn 1-4 chữ, chữ thường, cách nhau dấu phẩy, đúng chủ đề bài, ví dụ: thâm hụt calo, bữa sáng, món việt>
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

export function buildUserPrompt({ keyword, category = "", notes = "", research = "", related = [], foods = "", links = [], tags = [] } = {}) {
  return [
    `Từ khóa chính: ${String(keyword || "").trim()}`,
    category && `Chuyên mục: ${category}`,
    research && `GHI CHÚ TRA CỨU (đã kiểm trên web, chỉ dùng số liệu ở đây hoặc kiến thức phổ biến chắc chắn):\n${research}`,
    foods && `BẢNG CALO KHO MÓN FIPILOT (số của app, dùng đúng khi nhắc các món này; dòng: món | khẩu phần | gram | kcal | đạm g | tinh bột g | béo g):\n${foods}`,
    related.length ? `Bài đã có trên web (đừng viết trùng ý): ${related.slice(0, 30).join("; ")}` : "",
    links.length ? linkPrompt(links) : "",
    tags.length ? `THẺ ĐÃ CÓ TRÊN WEB (dòng "Thẻ:" ưu tiên chọn ĐÚNG chữ các thẻ này khi hợp chủ đề; chỉ đặt thẻ mới khi không có thẻ nào hợp, không đặt thẻ gần trùng thẻ có sẵn): ${tags.slice(0, 150).join(", ")}` : "",
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
- <số liệu cụ thể> (nguồn: <tên tài liệu, cơ quan, năm> | <URL trang gốc đã mở được>)
Chỉ ghi URL thật của trang đã đọc (không đoán đường dẫn).`,
  ].filter(Boolean).join("\n\n");
}
export const pickCategory = (notes, cats = []) => { const m = String(notes || "").match(/^\s*Chuyên mục:\s*([a-z0-9-]+)/im); return m ? cats.find((c) => c.slug === m[1]) || null : null; };

// ---- Nguồn tham khảo (23/10): máy lấy từ ghi chú tra cứu (tên + URL trang AI đã đọc khi tra web), không cho AI tự bịa link ----
// Chỉ nhận trang của cơ quan / tạp chí uy tín; mục "Nguồn tham khảo" gắn ở cuối bài, link mở tab mới.
export const SOURCE_OK = /(^|\.)(who\.int|nih\.gov|cdc\.gov|fda\.gov|usda\.gov|nal\.usda\.gov|ncbi\.nlm\.nih\.gov|pubmed\.ncbi\.nlm\.nih\.gov|nhs\.uk|nice\.org\.uk|efsa\.europa\.eu|harvard\.edu|mayoclinic\.org|clevelandclinic\.org|heart\.org|diabetes\.org|eatright\.org|acog\.org|viendinhduong\.vn|moh\.gov\.vn|vncdc\.gov\.vn|thelancet\.com|bmj\.com|nejm\.org|nature\.com|sciencedirect\.com|academic\.oup\.com|jamanetwork\.com|wiley\.com|springer\.com|frontiersin\.org|mdpi\.com|fao\.org|unicef\.org)$/i;
export function sourcesFromResearch(research = "") {
  const out = [], seen = new Set();
  for (const line of String(research || "").split("\n")) {
    const m = line.match(/nguồn:\s*([^|()]+?)\s*\|\s*(https?:\/\/[^\s)]+)/i) || line.match(/\(([^()|]{4,140}?)[\s,:-]*(https?:\/\/[^\s)]+)\)/);
    if (!m) continue;
    const name = m[1].replace(/^\s*nguồn:\s*/i, "").trim().replace(/[,;:\s]+$/, ""), url = m[2].replace(/[.,;]+$/, "");
    let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
    if (!SOURCE_OK.test(host) || seen.has(url) || !name) continue;
    seen.add(url); out.push({ name: name.slice(0, 160), url });
    if (out.length >= 8) break;
  }
  return out;
}
const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const sourcesBlocks = (list) => (list?.length ? [{ type: "h", level: 2, text: "Nguồn tham khảo" }, { type: "list", ordered: false, items: list.map((x) => `<a href="${escHtml(x.url)}" target="_blank" rel="noopener">${escHtml(x.name)}</a>`) }] : []);

// ---- Soát bài (bước sau khi viết): 1 lượt AI đọc bài + ghi chú tra cứu + bảng calo app, liệt kê lỗi → AI viết sửa đúng chỗ ----
// Máy gợi ý trước: câu nhắc món có trong bảng app mà số kcal khác mọi khẩu phần của app (chỉ là gợi ý cho bước soát, không tự sửa)
export function caloHints(md, foods = "") {
  const app = {};
  for (const l of String(foods || "").split("\n")) { const c = l.split("|").map((x) => x.trim()); if (c.length >= 4 && c[0]) (app[c[0].toLowerCase()] ||= new Set()).add(Number(c[3])); }
  const out = [];
  for (const sen of String(md || "").replace(/\n+/g, " ").replace(/([.!?])\s+/g, "$1\u0000").split("\u0000")) {
    const low = sen.toLowerCase();
    for (const [name, set] of Object.entries(app)) {
      if (!low.includes(name)) continue;
      const nums = [...low.matchAll(/(\d[\d.]*)\s*(?:đến|-|–)?\s*(\d[\d.]*)?\s*kcal/g)].flatMap((m) => [m[1], m[2]].filter(Boolean)).map((x) => Number(x.replace(/\./g, "")));
      const bad = nums.filter((n) => n > 50 && ![...set].some((v) => Math.abs(v - n) <= 5));
      if (bad.length) out.push(`"${sen.trim().slice(0, 220)}" (số app của ${name}: ${[...set].join(" / ")} kcal)`);
    }
    if (out.length >= 10) break;
  }
  return [...new Set(out)];
}
export function reviewPrompt({ article = "", research = "", foods = "", hints = [] } = {}) {
  return [
    "Bạn là biên tập viên soát bài dinh dưỡng tiếng Việt. ĐỌC bài dưới đây và CHỈ liệt kê lỗi thật, không viết lại bài.",
    `Soát đúng 6 loại lỗi:
1. so-mau-thuan: cùng một món / một thứ mà bài nêu các số khác nhau không giải thích; món có trong BẢNG CALO APP mà bài dùng số khác làm số chính; câu so sánh không khớp số trong bảng của bài.
2. so-khong-nguon: con số không có trong GHI CHÚ TRA CỨU, không phải bảng app và không phải kiến thức phổ biến của tổ chức được nêu tên (WHO, Bộ Y tế, Viện Dinh dưỡng, USDA, NIH...), hoặc nguồn mơ hồ ("nhiều trang", "thực tế", "chuyên gia" không tên). KHÔNG tính là lỗi: calo / đạm món ngoài bảng app đã ghi \"ước tính\" kèm khẩu phần; phép tính suy ra từ số đã có trong bài; ví dụ giả định (người mẫu, thực đơn mẫu).
3. khuyen-khong-so: lời khuyên chọn món / cách ăn dựa trên so sánh mà bài không có số chứng minh.
4. van-dich: câu dịch, danh từ hoá ("sự ..."), "mặc định", "biến X thành", "phụ thuộc vào việc", câu lủng củng, nhiều đoạn mở cùng một kiểu câu.
5. doi-tuong: gộp nhóm đối tượng sai (ví dụ trẻ dưới 18 tuổi chung với người bệnh thận), lời khuyên y tế quá đà.
6. sai-su-that: điều sai với kiến thức dinh dưỡng phổ biến; thực đơn mẫu / ngày mẫu cộng ra dưới sàn calo bài nêu (1200 nữ / 1500 nam) hoặc lệch mục tiêu bài nêu quá 5% mà không nói là ví dụ thiếu; tốc độ giảm cân khác mức 0,25-0,75% cân nặng/tuần của app mà không giải thích.`,
    `Trả lời đúng khuôn, mỗi lỗi 1 dòng, tối đa 15 dòng:
- [loại] "trích NGUYÊN VĂN đoạn lỗi (ngắn)" => cách sửa cụ thể (số đúng lấy từ đâu, hoặc bỏ, hoặc câu viết lại)
Chỉ ghi lỗi chắc chắn cần sửa, không ghi chỗ đã đúng (không ghi dòng kiểu \"khớp\", \"giữ nguyên\"), không bắt bỏ số ước tính hợp lý. Ít lỗi thật hơn nhiều lỗi vụn.
Không có lỗi thì trả đúng 1 dòng: KHÔNG CÓ LỖI`,
    foods && `BẢNG CALO APP (món | khẩu phần | gram | kcal | đạm | tinh bột | béo):\n${foods}`,
    research && `GHI CHÚ TRA CỨU (nguồn hợp lệ duy nhất ngoài bảng app):\n${research}`,
    hints.length && `Máy thấy các câu có thể lệch số app (kiểm lại, chỉ báo nếu đúng là lỗi):\n${hints.map((h) => "- " + h).join("\n")}`,
    `BÀI CẦN SOÁT:\n${article}`,
  ].filter(Boolean).join("\n\n");
}
export function parseReview(text) {
  if (/^\s*KHÔNG CÓ LỖI\s*$/im.test(text) && !/^\s*-\s*\[/m.test(text)) return [];
  return String(text || "").split("\n").map((l) => l.trim()).filter((l) => /^-\s*\[[^\]]+\]/.test(l) && !/=>\s*(khớp|đúng rồi|không cần sửa|giữ nguyên\s*$)/i.test(l)).map((l) => l.replace(/^-\s*/, "").slice(0, 400)).slice(0, 15);
}
export const fixPrompt = (issues, article) => `Bài dưới đây còn các lỗi (mỗi dòng: [loại] "đoạn lỗi" => cách sửa):\n${issues.map((x) => "- " + x).join("\n")}\n\nSửa ĐÚNG các lỗi đó theo cách sửa đã ghi, giữ nguyên phần còn lại (giữ nguyên link nội bộ, chỗ ảnh, bảng), trả lại TOÀN BỘ bài đúng ĐẦU RA.\n\n${article}`;

// ---- Link nội bộ ----
// Danh sách đích được phép (máy lập): trang chủ · chuyên mục · trang liên quan (công cụ, bảng calo, trang calo món) · bài cùng chủ đề.
// AI chỉ được link tới đích trong danh sách; máy kiểm lại khi đổi sang khối (đích lạ, trùng, chữ neo quá dài → bỏ link, giữ chữ).
const SITE_HOST = /^https?:\/\/(www\.)?fipilotai\.com/i;
export const normUrl = (u) => { let x = String(u || "").trim().replace(SITE_HOST, ""); if (!x.startsWith("/")) return ""; x = x.split("#")[0].split("?")[0]; return x.length > 1 ? x.replace(/\/+$/, "") : "/"; };
const wordsOf = (s) => vnSlug(s).split("-").filter((w) => w.length > 1);
export function linkTargets({ keyword = "", cat = null, posts = [], foods = [], selfSlug = "" } = {}) {
  const out = [{ url: "/", kind: "home", title: "Trang chủ Fipilot AI: app ghi bữa ăn món Việt, tự tính calo và macro" }];
  if (cat?.slug) out.push({ url: `/chu-de/${cat.slug}`, kind: "cat", title: `Chuyên mục ${cat.name}` });
  out.push({ url: "/tinh-calo", kind: "page", title: "Công cụ tính calo cần ăn mỗi ngày (BMR, TDEE, mục tiêu giảm/tăng cân)" }, { url: "/bang-calo", kind: "page", title: "Bảng calo món Việt theo khẩu phần" });
  for (const f of foods.filter((f) => f?.s && f?.n).slice(0, 8)) out.push({ url: `/calo/${f.s}`, kind: "page", title: `Calo ${f.n}: calo, đạm, tinh bột, béo theo khẩu phần` });
  const kw = new Set(wordsOf(keyword));
  const ranked = posts.filter((p) => p?.slug && p.slug !== selfSlug).map((p) => ({ p, sc: (cat && p.primary_term === cat.id ? 3 : 0) + wordsOf(`${p.title} ${p.keyword || ""}`).filter((w) => kw.has(w)).length }))
    .sort((a, b) => b.sc - a.sc).slice(0, 12);
  for (const { p } of ranked) out.push({ url: `/${p.slug}`, kind: "post", title: p.title });
  return out;
}
export const linkPrompt = (links) => `LINK NỘI BỘ (chèn bằng markdown [chữ neo](đường dẫn), CHỈ dùng đường dẫn trong danh sách này, không link nơi khác; nguồn trích dẫn vẫn không link):
- Cần có: 1 link về trang chủ (/), 1 link về chuyên mục, 1-3 link trang liên quan (công cụ, bảng calo, trang calo món) nếu bài có nhắc đúng nội dung đó, 3-5 link bài cùng chủ đề nếu có bài hợp.
- Chữ neo là cụm 2-6 từ CÓ SẴN trong câu văn tự nhiên, nói đúng nội dung trang đích (ví dụ câu nhắc "tính calo cần ăn mỗi ngày" thì link /tinh-calo). Không dùng "tại đây", "xem thêm", "click", không viết câu chỉ để chèn link.
- Mỗi đường dẫn tối đa 1 lần. Không link trong sapo, heading, bảng. Mỗi đoạn tối đa 1 link. Link bài cùng chủ đề đặt ở đoạn đang nói đúng ý bài đó.
${links.map((l) => `${l.url} | ${l.title}`).join("\n")}`;
// Thiếu link bắt buộc (trang chủ, chuyên mục; bài cùng chủ đề khi có) → thêm vào danh sách lỗi của bước soát để lượt sửa chèn vào
export function linkIssues(blocks, links = []) {
  if (!links.length) return [];
  const c = linkStats(blocks, links), out = [];
  const need = (kind, what) => { const l = links.find((x) => x.kind === kind); if (l && !c[kind]) out.push(`[thieu-link] "${what}" => thêm 1 link markdown [chữ neo](${l.url}) (${l.title}) vào một câu đang nói đúng ý đó ở thân bài, không ở sapo / heading / bảng`); };
  need("home", "chưa có link về trang chủ");
  need("cat", "chưa có link về chuyên mục");
  const posts = links.filter((x) => x.kind === "post");
  if (posts.length && !c.post) out.push(`[thieu-link] "chưa có link bài cùng chủ đề" => thêm 1-3 link tới bài hợp ý nhất trong: ${posts.slice(0, 6).map((p) => p.url).join(", ")}`);
  return out;
}
// Nối 2 lượt viết: AI hay bỏ dấu cách ở chỗ nối ("Cách" + "chắc" → "Cáchchắc"). Chữ ghép có ≥ 2 cụm nguyên âm = 2 âm tiết tiếng Việt → chèn dấu cách.
const VOW = /[aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]+/gi;
export function joinChunk(prev, next) {
  const a = String(prev || ""), b = String(next || "");
  const ma = a.match(/[\p{L}]+$/u), mb = b.match(/^[\p{L}]+/u);
  if (!ma || !mb) return a + b;
  return (ma[0] + mb[0]).match(VOW)?.length >= 2 && (ma[0].match(VOW) || []).length && (mb[0].match(VOW) || []).length ? `${a} ${b}` : a + b;
}
// ---- Gắn link nội bộ cho bài ĐÃ CÓ (nút "Gắn link" / link ngược): AI chỉ chọn chỗ (đoạn + cụm chữ có sẵn + đích), máy chèn <a>, không viết lại chữ ----
const strip = (h) => String(h || "").replace(/<a\b[^>]*>(.*?)<\/a>/gi, "[$1]").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
// Các chỗ được gắn: đoạn văn (trừ sapo), dòng danh sách, trích dẫn. Trả [{n, bi, ii, text}]
export function relinkUnits(blocks = []) {
  const out = []; let sapo = true;
  blocks.forEach((b, bi) => {
    if (b?.type === "p") { if (sapo) { sapo = false; return; } out.push({ n: out.length + 1, bi, ii: -1, text: strip(b.html) }); }
    else if (b?.type === "quote") out.push({ n: out.length + 1, bi, ii: -1, text: strip(b.html) });
    else if (b?.type === "list") (b.items || []).forEach((it, ii) => out.push({ n: out.length + 1, bi, ii, text: strip(it) }));
  });
  return out;
}
export const linkedUrls = (blocks = []) => new Set((JSON.stringify(blocks).match(/href=\\?"([^"\\]+)\\?"/g) || []).map((h) => normUrl(h.replace(/^href=\\?"/, "").replace(/\\?"$/, ""))));
export function relinkPrompt(units, links, { title = "" } = {}) {
  return `Bài "${title}" dưới đây đã viết xong. Việc của bạn: CHỌN CHỖ gắn link nội bộ, KHÔNG viết lại chữ.
Danh sách trang được link (đường dẫn | nội dung trang):
${links.map((l) => `${l.url} | ${l.title}`).join("\n")}

Luật: chữ neo là cụm 2-6 từ CÓ NGUYÊN VĂN trong đoạn (chép đúng từng chữ, đúng dấu), nói đúng nội dung trang đích; mỗi đường dẫn tối đa 1 lần; mỗi đoạn tối đa 1 link; chữ trong [ngoặc vuông] là link đã có, không dùng lại; chỉ gắn khi thật hợp ngữ cảnh, không hợp thì bỏ.
Ưu tiên: 1 link trang chủ (/) nếu đoạn nào nhắc app / ghi bữa ăn, 1 link chuyên mục, trang liên quan khi đoạn nói đúng nội dung đó, bài cùng chủ đề khi đoạn nói đúng ý bài đó.
Trả lời mỗi link 1 dòng đúng khuôn, không thêm gì khác: <số đoạn> | <chữ neo nguyên văn> | <đường dẫn>
Không có chỗ hợp thì trả: KHÔNG CÓ

CÁC ĐOẠN:
${units.map((u) => `${u.n}. ${u.text}`).join("\n")}`;
}
export function parseRelink(text) {
  return String(text || "").split("\n").map((l) => l.trim().replace(/^[-*]\s*/, "")).map((l) => l.split("|").map((x) => x.trim().replace(/^["“”']|["“”']$/g, ""))).filter((c) => c.length >= 3 && /^\d+$/.test(c[0]) && c[1] && c[2].startsWith("/")).map((c) => ({ n: Number(c[0]), anchor: c[1], url: c[2] }));
}
// Bọc cụm chữ (nằm gọn trong 1 đoạn chữ, ngoài thẻ <a>) bằng <a href>. Không thấy → trả null.
export function insertLink(html, anchor, url) {
  const parts = String(html || "").split(/(<[^>]+>)/); let inA = 0;
  const escA = esc(anchor);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith("<")) { if (/^<a\b/i.test(p)) inA++; else if (/^<\/a>/i.test(p)) inA = Math.max(0, inA - 1); continue; }
    if (inA) continue;
    let k = p.indexOf(escA); if (k < 0) k = p.toLowerCase().indexOf(escA.toLowerCase());
    if (k < 0) continue;
    parts[i] = `${p.slice(0, k)}<a href="${esc(url)}">${p.slice(k, k + escA.length)}</a>${p.slice(k + escA.length)}`;
    return parts.join("");
  }
  return null;
}
export function applyRelink(blocks, picks, links) {
  const allow = new Set(links.map((l) => normUrl(l.url)));
  const used = linkedUrls(blocks), units = relinkUnits(blocks), out = JSON.parse(JSON.stringify(blocks)), added = [], touched = new Set();
  for (const pk of picks) {
    const u = normUrl(pk.url), unit = units.find((x) => x.n === pk.n);
    if (!unit || !allow.has(u) || used.has(u) || touched.has(pk.n) || pk.anchor.split(/\s+/).length > 8 || pk.anchor.length < 3) continue;
    const b = out[unit.bi]; const cur = unit.ii < 0 ? b.html : b.items[unit.ii];
    if ((String(cur).match(/<a\b/gi) || []).length >= 2) continue;
    const nh = insertLink(cur, pk.anchor, u); if (!nh) continue;
    if (unit.ii < 0) b.html = nh; else b.items[unit.ii] = nh;
    used.add(u); touched.add(pk.n); added.push({ n: pk.n, anchor: pk.anchor, url: u });
  }
  return { blocks: out, added };
}
const postScore = (a, b, catId) => (catId && b.primary_term === catId ? 3 : 0) + wordsOf(`${b.title} ${b.keyword || ""}`).filter((w) => new Set(wordsOf(`${a.title} ${a.keyword || ""}`)).has(w)).length;
// Link ngược: bài cũ đã đăng hợp chủ đề nhất với bài mới (chưa link tới bài mới)
export function backlinkCandidates(post, posts = [], n = 2) {
  return posts.filter((p) => p.slug && p.slug !== post.slug && !linkedUrls(p.blocks || []).has(`/${post.slug}`)).map((p) => ({ p, sc: postScore(post, p, post.primary_term) })).filter((x) => x.sc >= 2).sort((a, b) => b.sc - a.sc).slice(0, n).map((x) => x.p);
}

// Đếm link đã chèn trong khối (để hiện ở tiến trình + nhắc thiếu)
export function linkStats(blocks, links = []) {
  const kind = Object.fromEntries(links.map((l) => [l.url, l.kind]));
  const urls = blocks.flatMap((b) => [b.html, ...(b.type === "list" ? b.items || [] : [])].filter(Boolean)).join(" ").match(/href="([^"]+)"/g) || [];
  const got = urls.map((h) => h.slice(6, -1));
  const c = { total: got.length, home: 0, cat: 0, page: 0, post: 0 };
  for (const u of got) if (kind[u]) c[kind[u]]++;
  return c;
}

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
  const tags = [...new Set(line("Thẻ").split(/[,;]/).map((x) => x.replace(/[#*"“”]/g, "").trim().toLowerCase()).filter((x) => x.length >= 2 && x.length <= 40))].slice(0, 5);
  return { seoTitle, seoDesc, slug, excerpt: line("Excerpt"), cover, tags, prompts, title: title || seoTitle, md: body.replace(/[—–]/g, ",").trim() };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Chữ trong 1 dòng: **đậm**, *nghiêng*; bỏ link markdown (giữ chữ), bỏ URL trần
export function mdInline(s, ln = null) {
  const keep = [];
  const raw = String(s || "").replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, txt, href) => {
    const u = normUrl(href), t = txt.replace(/\*+/g, "").trim();
    if (!ln || !u || !ln.allow.has(u) || ln.used.has(u) || ln.para >= 2 || t.split(/\s+/).length > 8) return txt;
    ln.used.add(u); ln.para++; keep.push([u, t]); return `\u0001${keep.length - 1}\u0002`;
  });
  return esc(raw.replace(/https?:\/\/\S+/g, "").replace(/[—–]/g, ","))
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<b>$1</b>").replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<i>$2</i>")
    .replace(/\s+/g, " ").trim()
    .replace(/\u0001(\d+)\u0002/g, (_, i) => `<a href="${esc(keep[i][0])}">${esc(keep[i][1])}</a>`);
}
const IMG = /^\s*\[chèn ảnh ở đây:\s*alt ảnh\s*["“”']?(.+?)["“”']?\s*\]\s*$/i;
const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => mdInline(c.trim()));

// Markdown (bộ nhỏ AI hay dùng) → khối của trình soạn bài. Ảnh giữ chỗ → khối ảnh chưa có link (web tự ẩn tới khi có ảnh).
export function mdToBlocks(md, { links = null } = {}) {
  const L = String(md || "").replace(/\r/g, "").split("\n");
  const out = []; let para = [];
  const ln = links?.length ? { allow: new Set(links.map((l) => normUrl(l.url)).filter(Boolean)), used: new Set(), para: 0 } : null;
  const lk = () => { if (!ln) return null; ln.para = 0; return ln; }; // mỗi đoạn / dòng danh sách: máy giữ tối đa 2 link (lời dặn AI: 1)
  const flush = () => { if (para.length) { const sapo = !out.some((b) => b.type === "p"); const h = mdInline(para.join(" "), sapo ? null : lk()); if (h) out.push({ type: "p", html: h }); para = []; } };
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
        if (x && /\d/.test(x[1]) === ordered) items.push(mdInline(x[2], lk()));
        else if (L[i].trim() && /^\s{2,}\S/.test(L[i]) && items.length) items[items.length - 1] += " " + mdInline(L[i], ln);
        else break;
      }
      i--; out.push({ type: "list", ordered, items: items.filter(Boolean) }); continue;
    }
    if ((m = l.match(/^\s*>\s?(.*)/))) { flush(); const q = mdInline(m[1], lk()); if (q) out.push({ type: "quote", html: q }); continue; }
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
export function articleToPost(a, { keyword = "", termId = null, authorId = null, kind = "post", imgs = null, links = null, sources = null } = {}) {
  const blocks = [...mdToBlocks(a.md, { links }), ...sourcesBlocks(sources)];
  let k = 0;
  if (imgs?.inline?.length) for (const b of blocks) if (b.type === "img" && imgs.inline[k]) { const g = imgs.inline[k++]; if (g?.url) { b.url = g.url; if (g.alt) b.alt = g.alt; } }
  return {
    id: null, kind, title: a.title, slug: a.slug, status: "draft", blocks, excerpt: a.excerpt || "",
    cover_url: imgs?.cover?.url || "", cover_alt: imgs?.cover?.alt || a.cover || (blocks.find((b) => b.type === "img") || {}).alt || "", author_id: authorId, primary_term: termId,
    pinned: false, related: { mode: "auto", ids: [] }, published_at: null, terms: termId ? [termId] : [], template: null,
    seo: { title: a.seoTitle || "", desc: a.seoDesc || "", keyword: String(keyword || "").trim(), ai: true },
  };
}

// Bài đủ điều kiện đăng chưa (dùng chung: tự đăng / đặt lịch ở máy chủ, nút Đăng ở màn AI viết bài, trình soạn)
export function postReady(p) {
  const miss = [];
  if (!String(p?.title || "").trim()) miss.push("tiêu đề");
  if (!p?.cover_url) miss.push("ảnh đại diện");
  const empty = (p?.blocks || []).filter((b) => b?.type === "img" && !b.url).length; if (empty) miss.push(`${empty} ô ảnh trống`);
  if (!p?.primary_term) miss.push("chuyên mục");
  if (Array.isArray(p?.terms) && !p.terms.some((t) => t !== p.primary_term)) miss.push("thẻ");
  if (!String(p?.seo?.title || "").trim() || !String(p?.seo?.desc || "").trim()) miss.push("SEO title / mô tả");
  if (!String(p?.excerpt || "").trim()) miss.push("đoạn trích");
  return { ok: !miss.length, miss };
}

// Giờ đăng kế tiếp còn trống (giờ VN). times: ["08:00","19:00"]; taken: ISO các bài đã hẹn / đã đăng ở các mốc đó
export function nextSlot(times, taken = [], nowMs = Date.now()) {
  const list = [...new Set((times || []).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, "0")))].sort();
  if (!list.length) return null;
  const used = new Set(taken.map((t) => new Date(t).getTime()));
  const vn = new Date(nowMs + 7 * 3600e3);
  for (let d = 0; d < 400; d++) for (const t of list) {
    const [h, m] = t.split(":").map(Number);
    const at = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + d, h, m) - 7 * 3600e3;
    if (at > nowMs + 5 * 60e3 && !used.has(at)) return new Date(at).toISOString();
  }
  return null;
}

// Món trong kho app (API /api/calo-data của web) mà bài sẽ nhắc: tên món xuất hiện trong từ khoá / ghi chú tra cứu / dặn thêm.
// Ít hơn 8 món thì thêm các món phổ biến cho đủ ~15 (để bảng calo trong bài có số của app). Trả bảng chữ gọn cho AI.
const POPULAR = ["phở bò", "bún chả", "cơm tấm sườn", "bánh mì thịt", "cơm trắng", "bún bò huế", "xôi", "cháo", "trứng gà luộc", "ức gà", "gỏi cuốn", "cơm gà", "bánh cuốn", "hủ tiếu", "mì quảng"];
const norm = (s) => String(s || "").normalize("NFC").toLowerCase();
export function pickFoods(foods = [], text = "", max = 25) {
  const t = ` ${norm(text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  const hit = foods.filter((f) => f?.n && t.includes(` ${norm(f.n)} `)).sort((a, b) => b.n.length - a.n.length).slice(0, max);
  if (hit.length < 8) for (const name of POPULAR) { const f = foods.find((x) => norm(x.n) === name); if (f && !hit.includes(f)) hit.push(f); if (hit.length >= 15) break; }
  return hit;
}
export const foodTable = (list = []) => list.flatMap((f) => (f.u || []).slice(0, 2).map(([pn, g, cal, p, c, fat]) => `${f.n} | ${pn} | ${g} | ${cal} | ${p} | ${c} | ${fat}`)).join("\n");

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

// Tiền: giá USD / 1 triệu token (đồng bộ với ai-proxy PRICING, tra 18/10/2026); tra web / ảnh: ƯỚC TÍNH, kiểm lại khi có hoá đơn thật
export const TEXT_PRICE = {
  "claude-haiku-5-5": { in: 0.10, out: 0.50 }, "claude-sonnet-5-5": { in: 2, out: 10 }, "claude-opus-5-5": { in: 4, out: 20 },
  "gemini-3.5-flash-lite": { in: 0.30, out: 2.50 }, "gemini-3.8-flash": { in: 0.75, out: 3.75 }, "gemini-3.1-pro-preview": { in: 2, out: 12 },
  "gpt-6-luna": { in: 0.10, out: 0.50 }, "gpt-6.1-sol": { in: 2, out: 10 }, "gpt-6-astra": { in: 10, out: 50 },
};
export const providerOf = (model) => (/^gemini/.test(model) ? "gemini" : /^gpt/.test(model) ? "gpt" : "claude");
export const SEARCH_PRICE = { claude: 0.01, gemini: 0.014, gpt: 0.01 }; // USD / lượt tra web
export const IMG_PRICE = { flux: 0.003, gemini: 0.039, gpt: 0.006 }; // USD / ảnh (Flux schnell ~1MP; Gemini ảnh; GPT ảnh mini chất lượng thấp)
export const IMG_MODEL = { flux: "fal-ai/flux/schnell", gemini: "gemini-2.5-flash-image", gpt: "gpt-image-1-mini" };
export const textCost = (model, inTok, outTok, searches = 0) => { const p = TEXT_PRICE[model] || TEXT_PRICE["claude-sonnet-5-5"]; return (inTok * p.in + outTok * p.out) / 1e6 + searches * SEARCH_PRICE[providerOf(model)]; };
// Ước tính tiền chữ 1 bài khi chưa có bài thật: ~25 nghìn token vào (quy tắc + ghi chú tra cứu, cả các đoạn viết tiếp), ~8 nghìn token ra
export const estText = (model, searches = 3) => textCost(model, 25000, 8000, searches);
// Ước tính tiền soát 1 bài: đọc ~12 nghìn token (bài + ghi chú + bảng calo), ra ~1,2 nghìn; có lỗi thì cộng 1 lượt viết sửa (~20 nghìn vào, 7 nghìn ra) bằng mô hình viết
export const estReview = (model, writeModel = model) => textCost(model, 12000, 1200) + textCost(writeModel, 20000, 7000);

// Cài đặt mặc định của màn AI viết bài
export const AI_DEFAULTS = { provider: "claude", model: "claude-sonnet-5-5", key_mode: "shared", searches: 3, img_on: true, img_provider: "flux", img_inline: 1, img_reuse: true, rate: 26000, daily_cap_usd: 2, rules: null, publish: "draft", sched_times: ["08:00", "19:00"], review_model: "claude-sonnet-5-5", backlinks: true }; // review_model "" = không soát
export const cfgOf = (data) => { const c = { ...AI_DEFAULTS, ...(data || {}) }; c.provider = providerOf(c.model); return c; };
