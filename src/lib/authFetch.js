// src/lib/authFetch.js — Helper gọi Edge Function kèm JWT token
import { supabase, SUPABASE_URL } from "./supabase";
const BASE = `${SUPABASE_URL}/functions/v1`;

/**
 * Gọi edge function kèm JWT token tự động.
 * Drop-in thay thế fetch() cho các endpoint cần auth.
 */
export async function authFetch(endpoint, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
