// /llms.txt — bản tóm tắt web cho trợ lý AI (ChatGPT, Perplexity, Claude…) theo chuẩn llmstxt.org.
// Tự sinh từ dữ liệu: chuyên mục, bài mới, bảng calo món, giá gói. Bật / tắt + đoạn giới thiệu thêm ở Quản trị › Cài đặt SEO › Sitemap & robots.
import { getSettings, siteUrl } from "@/lib/site";
import { q } from "@/lib/sb";
import { caloFoods } from "@/lib/calo";
import { mainPortion } from "@/lib/foods";
import { vnd } from "@/lib/plans";

export const revalidate = 3600;
const one = (x) => String(x || "").replace(/\s+/g, " ").trim();

export async function GET() {
  const s = await getSettings();
  if (s.seo?.block_all || s.seo?.llms === false || s.seo?.allow_ai_bots === false) return new Response("Not found", { status: 404 });
  const u = (p) => siteUrl(s, p);
  const name = s.site?.name || "Fipilot AI";
  const [terms, posts, foods] = await Promise.all([
    q("web_terms?kind=eq.category&select=name,slug,description&order=sort,name"),
    q("web_posts?kind=eq.post&status=in.(published,scheduled)&select=title,slug,excerpt,seo&order=published_at.desc&limit=40"),
    caloFoods(),
  ]);
  const P = s.plan || {};
  const L = [];
  L.push(`# ${name}`, "");
  L.push(`> ${one(s.site?.tagline ? `${name} — ${s.site.tagline}.` : "")} App giảm cân bằng món Việt: nhập cân nặng, chiều cao một lần, app tự lên thực đơn món Việt đúng calo mỗi ngày (phở, bún, cơm tấm vẫn ăn được), nhắc giờ ăn, đổi món giữ calo, tổng kết cân nặng mỗi tháng. Dùng trên trình duyệt điện thoại tại ${s.site?.app_url || "https://app.fipilotai.com"}, không cần cài từ kho ứng dụng.`, "");
  if (one(s.seo?.llms_intro)) L.push(one(s.seo.llms_intro), "");
  L.push(`Giá: gói Miễn phí 0đ.${P.month ? ` Premium từ ${vnd(P.month.per)}/tháng${P.cheapest && P.cheapest.m > 1 ? ` (chỉ từ ${vnd(P.cheapest.per)}/tháng khi mua ${P.cheapest.m} tháng)` : ""}.` : ""}${P.trial ? ` Dùng thử ${P.trial} ngày, không cần thẻ.` : ""} Số calo trên web lấy từ kho món của app, chỉ để tham khảo, không thay thế tư vấn bác sĩ.`, "");
  L.push("## Trang chính", "");
  L.push(`- [Trang chủ](${u("/")}): giới thiệu app, tính thử lượng calo cần ăn, bảng giá, hỏi đáp`);
  L.push(`- [Tính calo cần ăn mỗi ngày](${u("/tinh-calo")}): công cụ tính BMR, TDEE, mức calo để giảm cân theo công thức của app`);
  L.push(`- [Bảng calo món ăn Việt Nam](${u("/bang-calo")}): calo theo 100 g và theo khẩu phần thường gặp, kèm đạm, tinh bột, chất béo`);
  L.push(`- [Bảng giá](${u("/bang-gia")}): so sánh gói Miễn phí và Premium, số lượt AI mỗi gói`);
  L.push(`- [Bài viết](${u("/bai-viet")}): kiến thức giảm cân, thực đơn mẫu, calo món Việt`);
  L.push(`- [Cài app lên điện thoại](${u("/cai-app")}): hướng dẫn thêm app vào màn hình chính iPhone / Android`, "");
  if (terms?.length) { L.push("## Chuyên mục", ""); for (const t of terms) L.push(`- [${one(t.name)}](${u(`/chu-de/${t.slug}`)})${t.description ? `: ${one(t.description)}` : ""}`); L.push(""); }
  if (posts?.length) { L.push("## Bài viết mới", ""); for (const p of posts) { if (p.seo?.noindex) continue; const d = one(p.seo?.desc || p.excerpt); L.push(`- [${one(p.title)}](${u(`/${p.slug}`)})${d ? `: ${d.slice(0, 200)}` : ""}`); } L.push(""); }
  const list = (foods || []).filter((f) => !f.page?.noindex);
  if (list.length) {
    L.push("## Calo món Việt", "");
    for (const f of list) { const p = mainPortion(f); L.push(`- [${f.name}](${u(`/calo/${f.slug}`)}): ${p ? `${p.name} ${p.gram} g khoảng ${p.cal} kcal; ` : ""}100 g có ${f.per100.cal} kcal, đạm ${String(f.per100.p).replace(".", ",")} g, tinh bột ${String(f.per100.c).replace(".", ",")} g, chất béo ${String(f.per100.f).replace(".", ",")} g`); }
    L.push("");
  }
  L.push("## Khác", "", `- [Giới thiệu](${u("/gioi-thieu")})`, `- [Liên hệ](${u("/lien-he")})`, `- [Sitemap](${u("/sitemap.xml")})`, "");
  return new Response(L.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" } });
}
