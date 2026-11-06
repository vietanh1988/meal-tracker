// 06/11: 1 bài cho màn đọc trong app — qua đúng các bước như trang bài (app/[slug]/page.js), rồi đổi sang khối gọn (lib/appnews.js)
import { getPostBySlug, latestPosts, catOf, readMin } from "@/lib/content";
import { prepare } from "@/lib/blocks";
import { addInfographics } from "@/lib/infographic";
import { fixSources } from "@/lib/sources";
import { splitLong } from "@/lib/paras";
import { linkTargets, autoLink } from "@/lib/autolink";
import { postText, foodsInText } from "@/lib/mentions";
import { caloFoods } from "@/lib/calo";
import { mainPortion } from "@/lib/foods";
import { getSettings } from "@/lib/site";
import { CLUSTERS } from "@/lib/clusters";
import { exBySlug } from "@/lib/workout";
import { toAppBlocks, appCard, WEB_ORIGIN } from "@/lib/appnews";

export const revalidate = 300;
const H = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: H });
export async function GET(_req, { params }) {
  const p = await getPostBySlug(params.slug);
  if (!p || p.kind !== "post" || (p.published_at && Date.parse(p.published_at) > Date.now())) return json({ error: "not_found" }, 404);
  const s = await getSettings();
  let blocks = await prepare(p.blocks);
  blocks = addInfographics(blocks, p);
  blocks = fixSources(blocks);
  blocks = splitLong(blocks);
  if (!p.seo?.no_autolink) blocks = autoLink(blocks, await linkTargets(), `/${p.slug}`);
  const cat = catOf(p);
  const foods = foodsInText(postText(blocks), (await caloFoods()).map((f) => ({ key: f.key, name: f.name, slug: f.slug, noindex: !!f.page?.noindex, por: mainPortion(f) })), 8)
    .map((f) => ({ key: f.key, name: f.name, slug: f.slug, por: f.por ? { name: f.por.name, gram: f.por.gram || null, cal: f.por.cal } : null }));
  // Bài tiếp: bài trụ của cụm (nếu chưa phải bài này), rồi bài mới nhất cùng cụm
  const pool = cat ? await latestPosts({ limit: 12, termId: cat.id, exclude: [p.id] }) : [];
  const star = CLUSTERS[cat?.slug]?.star;
  const now = Date.now();
  const next = [...pool].filter((x) => !x.published_at || Date.parse(x.published_at) <= now).sort((a, b) => (b.slug === star) - (a.slug === star)).slice(0, 3).map(appCard);
  return json({
    slug: p.slug, title: p.title, cover: p.cover_url ? (p.cover_url.startsWith("/") ? WEB_ORIGIN + p.cover_url : p.cover_url) : null, cover_alt: p.cover_alt || p.title,
    cat: cat ? { slug: cat.slug, name: cat.name } : null, at: p.published_at, updated: p.updated_at, min: readMin(p.word_count),
    author: p.author?.name || null, blocks: toAppBlocks(blocks, { plan: s?.plan, exId: (sl) => exBySlug(sl)?.id || null }), foods, next,
  });
}
