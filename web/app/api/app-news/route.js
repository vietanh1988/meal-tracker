// 06/11: app (nút Pi › Tin giảm cân) lấy danh sách bài + 6 cụm — web tính sẵn (lib/appnews.js), app chỉ hiện
import { latestPosts, allTerms } from "@/lib/content";
import { appNews } from "@/lib/appnews";

export const revalidate = 600;
const H = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };
export async function GET() {
  const [posts, terms] = await Promise.all([latestPosts({ limit: 500 }), allTerms("category")]);
  const now = Date.now();
  return new Response(JSON.stringify(appNews(posts.filter((p) => !p.published_at || Date.parse(p.published_at) <= now), terms)), { headers: H });
}
