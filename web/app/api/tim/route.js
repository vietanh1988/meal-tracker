// /api/tim?q=… — tìm nhanh cho ô tìm kiếm trên đầu trang (31/10, chủ dự án: "gõ tới đâu kết quả ra tới đó, không chuyển trang").
// Món: so theo chữ không dấu (giống trang /tim-kiem). Bài viết: searchPosts (tiêu đề / đoạn mở đầu). Tối đa 6 món + 6 bài. Chỉ đọc dữ liệu công khai.
import { searchPosts, catOf } from "@/lib/content";
import { caloFoods } from "@/lib/calo";
import { mainPortion, porName } from "@/lib/foods";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const qs = String(new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  const key = slugify(qs);
  if (key.length < 2) return Response.json({ q: qs, foods: [], posts: [] });
  const [all, posts] = await Promise.all([caloFoods(), searchPosts(qs, 6)]);
  // món bắt đầu bằng từ khoá đứng trước (gõ "pho" → "Phở bò" trước "Bánh phở xào")
  const hit = all.filter((f) => f.slug.includes(key)).sort((a, b) => (b.slug.startsWith(key) ? 1 : 0) - (a.slug.startsWith(key) ? 1 : 0)).slice(0, 6);
  const foods = hit.map((f) => { const p = mainPortion(f); return { n: f.name, s: f.slug, cal: p ? p.cal : f.per100.cal, sub: p ? `${porName(p, true)} ${p.gram} g` : "100 g" }; });
  const out = posts.map((p) => ({ t: p.title, s: p.slug, c: catOf(p)?.name || "", img: p.cover_url || null }));
  return new Response(JSON.stringify({ q: qs, foods, posts: out }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } });
}
