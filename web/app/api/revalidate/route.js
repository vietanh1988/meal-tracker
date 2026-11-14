// 14/11: Supabase báo "nội dung web vừa đổi" (lịch web-revalidate mỗi phút, chỉ khi có sửa) → làm mới toàn bộ trang + dữ liệu đã lưu đệm.
// Nhờ vậy trang được để cache theo giờ (đỡ tốn CPU Vercel) mà sửa trong Quản trị vẫn lên web trong ~1 phút.
import { revalidatePath, revalidateTag } from "next/cache";
import { rpc } from "@/lib/sb";

export const dynamic = "force-dynamic";
export async function POST(req) {
  let token = "";
  try { token = String((JSON.parse((await req.text()) || "{}")).token || ""); } catch {}
  if (token.length < 16 || (await rpc("web_revalidate_ok", { p_token: token })) !== true) return new Response(null, { status: 401 });
  revalidateTag("web");
  revalidatePath("/", "layout");
  return Response.json({ ok: true, at: Date.now() });
}
