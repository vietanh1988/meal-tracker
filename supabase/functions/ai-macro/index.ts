// supabase/functions/ai-macro/index.ts — VÔ HIỆU HOÁ, KHÔNG CÒN DÙNG
// Chức năng tính macro thực tế đã chuyển hẳn sang ai-proxy (feature:
// "macro_lookup") — nơi CÓ đầy đủ quota + tier-gate + log chi phí.
// Function này TRƯỚC ĐÂY chỉ verify JWT, KHÔNG có quota/log gì —
// là lỗ hổng có thể bị gọi trực tiếp né mọi giới hạn. Giữ tên tồn tại
// (không xoá được qua MCP) nhưng luôn từ chối, không gọi AI thật nữa.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://fipilotai.com",
  "https://www.fipilotai.com",
  "https://app.fipilotai.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: "Endpoint đã ngừng hoạt động. Dùng ai-proxy (feature: macro_lookup)." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
