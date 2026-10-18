// Thay ảnh xem trước khi chia sẻ link (public-assets/og-image.jpg).
// 18/10 rà bảo mật: trước đây KHÔNG kiểm đăng nhập (ai cũng thay được ảnh) → giờ chỉ Super Admin, ảnh ≤ 2 MB, chỉ JPEG / PNG / WebP.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ["https://fipilotai.com", "https://www.fipilotai.com", "https://app.fipilotai.com"];
const cors = (req: Request) => {
  const o = req.headers.get("origin") || "";
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!token) return json(req, { error: "Unauthorized" }, 403);
    const admin = createClient(url, serviceKey);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json(req, { error: "Unauthorized" }, 403);
    const { data: p } = await admin.from("profiles").select("is_admin,admin_role").eq("id", user.id).maybeSingle();
    if (!p?.is_admin || p?.admin_role !== "super") return json(req, { error: "Unauthorized" }, 403);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return json(req, { error: 'No file' }, 400);
    if (file.size > 2 * 1024 * 1024) return json(req, { error: 'Ảnh tối đa 2 MB' }, 400);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json(req, { error: 'Chỉ nhận JPEG / PNG / WebP' }, 400);

    const { error } = await admin.storage.from('public-assets')
      .upload('og-image.jpg', await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (error) return json(req, { error: error.message }, 500);
    const { data: urlData } = admin.storage.from('public-assets').getPublicUrl('og-image.jpg');
    return json(req, { url: urlData.publicUrl });
  } catch (e) {
    return json(req, { error: (e as Error).message }, 500);
  }
});
