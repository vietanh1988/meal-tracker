import { getSettings, siteUrl } from "@/lib/site";
export const revalidate = 600;
const AI = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "anthropic-ai", "Google-Extended", "PerplexityBot", "CCBot"];
export default async function robots() {
  const s = await getSettings();
  const extra = String(s.seo?.robots_extra || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const disallow = extra.filter((l) => /^disallow:/i.test(l)).map((l) => l.replace(/^disallow:\s*/i, "")).filter((p) => p && p !== "/");
  const rules = [{ userAgent: "*", allow: "/", disallow: ["/api/", ...disallow] }];
  if (s.seo?.allow_ai_bots === false) rules.push({ userAgent: AI, disallow: "/" });
  // Bảo trì: không đổi robots.txt (file cache 10 phút, chặn lâu hơn cần) — middleware đã trả 503 cho mọi trang
  // Chặn công cụ tìm kiếm (như WordPress): vẫn cho bot đọc để thấy noindex trên từng trang → Google gỡ link đã có; không khai sitemap
  if (s.seo?.block_all) return { rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }] };
  return { rules, sitemap: siteUrl(s, "/sitemap.xml"), host: siteUrl(s, "") };
}
