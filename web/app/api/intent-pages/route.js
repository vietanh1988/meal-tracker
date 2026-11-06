// 06/11: danh sách mọi trang + ý định ngắn cho bộ chặn trùng (lib/intent.js)
import { intentDocs } from "@/lib/intent";

export const revalidate = 600;
export async function GET() {
  return new Response(JSON.stringify(await intentDocs()), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
