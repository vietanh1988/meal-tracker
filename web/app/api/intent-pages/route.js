// 06/11: danh sách mọi trang + ý định ngắn cho bộ chặn trùng (lib/intent.js)
import { intentDocs } from "@/lib/intent";

export const revalidate = 604800; // 20/11: 7 ngày (bot vào lại sau 1 giờ làm web dựng lại trang → tốn CPU); sửa nội dung → /api/revalidate làm mới ngay
export async function GET() {
  return new Response(JSON.stringify(await intentDocs()), { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
