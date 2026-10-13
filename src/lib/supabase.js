import { createClient } from "@supabase/supabase-js";

// Mặc định trỏ prod. CI/E2E đặt VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// để trỏ Supabase local (supabase start) — không đụng dữ liệu thật.
export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_S8oHNj-3wZ0ZLs7nD8D5qg_jPcL7vWa";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
