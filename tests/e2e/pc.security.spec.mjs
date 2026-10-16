import { test, expect } from "@playwright/test";
import { S, rest, login } from "./helpers.mjs";

// User thường KHÔNG được tự nâng quyền / gói cước / reset bộ đếm AI qua API.
test("bảo mật hồ sơ: user không tự sửa is_admin / tier / bộ đếm AI, vẫn sửa được cm", async () => {
  const s = S();
  expect(s.anon, "thiếu E2E_ANON_KEY").toBeTruthy();
  const tok = await fetch(`${s.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: s.anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: s.email, password: s.password }),
  }).then((r) => r.json());
  expect(tok.access_token).toBeTruthy();
  const asUser = (body) => fetch(`${s.url}/rest/v1/profiles?id=eq.${s.uid}`, {
    method: "PATCH",
    headers: { apikey: s.anon, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });

  for (const body of [{ is_admin: true }, { tier: "free" }, { subscription_end_date: "2099-01-01" }, { ai_menu_count_today: 0, ai_menu_count_reset_at: "2099-01-01" }, { admin_role: "super" }]) {
    const r = await asUser(body);
    expect(r.ok, `phải bị chặn: ${JSON.stringify(body)}`).toBe(false);
  }
  const [p] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,tier,admin_role,subscription_end_date`);
  expect(p.is_admin).toBe(false);
  expect(p.tier).toBe("premium");
  expect(p.admin_role).toBeNull();

  const ok = await asUser({ cm: 173 });
  expect(ok.ok).toBe(true);
  const [p2] = await rest(`profiles?id=eq.${s.uid}&select=cm`);
  expect(p2.cm).toBe(173);
  await asUser({ cm: 172 });
});

// Bản vẽ 117–120: khung Quản trị PC chỉ dành cho admin — user thường không có nút "Vào Quản trị",
// kể cả khi tự ghi localStorage fp_pc_mode=admin rồi tải lại trang.
test("PC: user thường không vào được khung Quản trị", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("pc-phone")).toBeVisible();
  await expect(page.getByTestId("pc-open-admin")).toHaveCount(0);
  await page.evaluate(() => { localStorage.setItem("fp_pc_mode", "admin"); localStorage.setItem("fp_pc_admin_sec", "users"); });
  await page.reload();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pc-phone")).toBeVisible();
  await expect(page.getByTestId("pc-admin")).toHaveCount(0);
  await expect(page.getByTestId("pc-sidebar")).toHaveCount(0);
  await expect(page.getByTestId("pc-users")).toHaveCount(0);
});
