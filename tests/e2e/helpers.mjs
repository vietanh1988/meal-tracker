import { readFileSync } from "fs";
import { expect } from "@playwright/test";

export const S = () => JSON.parse(readFileSync(new URL("./.state.json", import.meta.url)));

// Gọi REST Supabase LOCAL bằng service role (chỉ để chuẩn bị/kiểm dữ liệu test)
export async function rest(path, opts = {}) {
  const s = S();
  const r = await fetch(`${s.url}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`REST ${r.status} ${path}: ${t}`);
  return t ? JSON.parse(t) : null;
}

export async function todayRow() {
  const s = S();
  const rows = await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}&select=*`);
  return rows[0] || null;
}

// Chặn mọi gọi edge function (AI) — test không tốn tiền, trả rỗng
export async function blockAI(page) {
  await page.route("**/functions/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
}

export async function login(page) {
  const s = S();
  await blockAI(page);
  await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
  await page.goto("/");
  await page.getByPlaceholder("email@example.com").first().fill(s.email);
  await page.getByPlaceholder("••••••").fill(s.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
  await expect(page.getByText(/CALO CÒN LẠI/i).first()).toBeVisible({ timeout: 20_000 });
}

// Chờ tới khi điều kiện trên DB đúng (app ghi bất đồng bộ)
export async function waitDb(fn, msg, timeout = 10_000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Hết giờ chờ DB: ${msg}`);
}
