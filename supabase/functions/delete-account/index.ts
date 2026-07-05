// Supabase Edge Function: delete-account
// User tự xoá tài khoản của CHÍNH MÌNH — xác thực qua access_token trong header
// Authorization, không dùng secret chung như send-push (vì đây là hành động cá nhân,
// không phải admin gọi thay).
//
// Sau khi xoá auth.users, toàn bộ dữ liệu liên quan tự động dọn theo ON DELETE CASCADE
// đã cấu hình ở migration đi kèm (profiles, weight_logs, meal_logs, ai_chat_history...).
// Riêng orders/admin_audit_log/notification_batches chỉ SET NULL (giữ lại hồ sơ).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Thiếu access token" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Xác thực token này thực sự thuộc về 1 user đang đăng nhập hợp lệ
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Token không hợp lệ, vui lòng đăng nhập lại" }), { status: 401 });
  }

  const userId = userData.user.id;

  const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
