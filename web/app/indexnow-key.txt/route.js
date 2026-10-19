// Khoá IndexNow (Cài đặt SEO › Sitemap & robots › Báo Bing / Cốc Cốc). Khoá công khai theo chuẩn IndexNow, không phải bí mật.
import { getSettings } from "@/lib/site";

export const revalidate = 300;
export async function GET() {
  const s = await getSettings();
  const k = s.seo?.indexnow && /^[a-f0-9]{8,128}$/.test(s.seo?.indexnow_key || "") ? s.seo.indexnow_key : null;
  return new Response(k || "not found", { status: k ? 200 : 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}
