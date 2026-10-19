// /api/calo-data — số calo món Việt của kho món app (giống trang /calo/…), dạng gọn cho hàm AI viết bài (web-writer)
// dùng đúng số khi bài nhắc tới món. Chỉ đọc, không có dữ liệu riêng tư. Làm mới mỗi giờ.
import { caloFoods } from "@/lib/calo";

export const revalidate = 3600;

export async function GET() {
  const foods = await caloFoods();
  const out = foods.filter((f) => f.portions?.length).map((f) => ({
    n: f.name, s: f.slug,
    u: f.portions.slice(0, 3).map((p) => [p.name, p.gram, p.cal, p.p, p.c, p.f]),
  }));
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
