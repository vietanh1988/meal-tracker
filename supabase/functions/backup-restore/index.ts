// Quản trị › Sao lưu / Khôi phục (src/pc/PcBackup.jsx, src/mobile/admin/BackupScreen.jsx).
// 18/10 rà bảo mật: CHỈ Super Admin; file sao lưu KHÔNG chứa 3 khoá AI; khôi phục không ghi đè khoá AI
// và không đổi quyền admin của ai (is_admin / admin_role giữ như hiện tại).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const ALLOWED_ORIGINS = [
  "https://fipilotai.com", "https://www.fipilotai.com", "https://app.fipilotai.com",
];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const ALL_TABLES = [
  "profiles", "meal_logs", "daily_logs", "weekly_templates", "weekly_bundles",
  "weight_logs", "food_cache", "food_cache_pending", "food_overrides",
  "ai_usage_log", "ai_chat_history", "ai_menu_cache",
  "app_settings", "subscription_settings", "orders",
  "notifications", "notification_batches", "push_subscriptions",
  "user_feedback", "feature_ratings", "admin_audit_log", "admin_stats_snapshots", "client_errors",
];
const SECRET_KEYS = ["claude_key", "gpt_key", "gemini_key"];
const PROTECTED_PROFILE_COLS = ["is_admin", "admin_role"];

async function verifySuperAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: profile } = await admin.from("profiles").select("is_admin,admin_role").eq("id", user.id).single();
  if (!profile?.is_admin || profile?.admin_role !== "super") return null;
  return user;
}

// Bỏ khoá AI khỏi app_settings; bỏ cột quyền admin khỏi profiles (khi khôi phục)
function cleanRows(table: string, rows: any[], forRestore: boolean) {
  if (table === "app_settings") return rows.filter((r) => !SECRET_KEYS.includes(r?.key));
  if (table === "profiles" && forRestore) {
    return rows.map((r) => { const o = { ...r }; PROTECTED_PROFILE_COLS.forEach((c) => delete o[c]); return o; });
  }
  return rows;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await verifySuperAdmin(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, tables, data } = await req.json();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "backup") {
      const backup: Record<string, any[]> = {};
      const meta: Record<string, number> = {};
      for (const table of ALL_TABLES) {
        try {
          const { data: rows, error } = await admin.from(table).select("*");
          backup[table] = error ? [] : cleanRows(table, rows || [], false);
          meta[table] = backup[table].length;
        } catch (e) {
          backup[table] = [];
          meta[table] = 0;
        }
      }
      return new Response(JSON.stringify({
        ok: true, backup, meta,
        created_at: new Date().toISOString(),
        version: "1.1",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === "restore") {
      if (!tables || !data) {
        return new Response(JSON.stringify({ error: "Thieu tables hoac data" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const results: Record<string, { success: boolean; count: number; error?: string }> = {};
      for (const table of tables) {
        if (!ALL_TABLES.includes(table)) {
          results[table] = { success: false, count: 0, error: "Bang khong hop le" };
          continue;
        }
        const raw = data[table];
        if (!raw || !Array.isArray(raw) || raw.length === 0) {
          results[table] = { success: true, count: 0 };
          continue;
        }
        const rows = cleanRows(table, raw, true);
        try {
          const pk = table === "app_settings" ? "key" : "id";
          const batchSize = 500;
          let total = 0;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await admin.from(table).upsert(batch, { onConflict: pk, ignoreDuplicates: false });
            if (error) throw error;
            total += batch.length;
          }
          results[table] = { success: true, count: total };
        } catch (e: any) {
          results[table] = { success: false, count: 0, error: e.message || String(e) };
        }
      }
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === "list") {
      const meta: Record<string, number> = {};
      for (const table of ALL_TABLES) {
        try {
          const { count } = await admin.from(table).select("*", { count: "exact", head: true });
          meta[table] = count || 0;
        } catch { meta[table] = 0; }
      }
      return new Response(JSON.stringify({ ok: true, meta }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "action phai la backup/restore/list" }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});
