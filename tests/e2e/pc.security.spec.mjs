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

// 18/10 (rà bảo mật): khách không tự tạo đơn "đã duyệt", số tiền theo bảng giá; không đọc món chờ duyệt của người khác;
// khách chưa đăng nhập không gọi được hàm quản trị.
test("bảo mật đơn hàng, món chờ duyệt, hàm quản trị", async () => {
  const s = S();
  const tok = await fetch(`${s.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: s.anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: s.email, password: s.password }),
  }).then((r) => r.json());
  const H = { apikey: s.anon, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const post = (path, body, h = H) => fetch(`${s.url}/rest/v1/${path}`, { method: "POST", headers: h, body: JSON.stringify(body) });
  try {
    const bad = await post("orders", { user_id: s.uid, package: "12m", amount: 1, status: "confirmed" });
    expect(bad.ok, "đơn 'confirmed' do khách tự tạo phải bị chặn").toBe(false);
    const good = await post("orders", { user_id: s.uid, package: "12m", amount: 1, status: "pending" });
    expect(good.ok).toBe(true);
    const [o] = await good.json();
    const [st] = await rest("subscription_settings?id=eq.1&select=price_12m");
    if (st && st.price_12m != null) expect(Number(o.amount)).toBe(Number(st.price_12m));
    expect(o.status).toBe("pending");

    const other = "00000000-0000-0000-0000-0000000000e3";
    await rest("food_cache_pending", { method: "POST", body: JSON.stringify({ food_name: "món người khác e2e", gram: 100, cal: 100, protein: 1, carb: 1, fat: 1, created_by: null }) }).catch(() => {});
    const seen = await fetch(`${s.url}/rest/v1/food_cache_pending?select=created_by`, { headers: H }).then((r) => r.json());
    expect(seen.every((r) => r.created_by === s.uid), "chỉ thấy món chờ duyệt của mình").toBe(true);
    void other;

    const anon = await fetch(`${s.url}/rest/v1/rpc/admin_behavior_users`, { method: "POST", headers: { apikey: s.anon, "Content-Type": "application/json" }, body: "{}" });
    expect(anon.ok, "khách chưa đăng nhập không gọi được hàm quản trị").toBe(false);
  } finally {
    await rest(`orders?user_id=eq.${s.uid}&amount=eq.1`, { method: "DELETE" }).catch(() => {});
    await rest(`orders?user_id=eq.${s.uid}&package=eq.12m&status=eq.pending`, { method: "DELETE" }).catch(() => {});
    await rest("food_cache_pending?food_name=eq.món người khác e2e", { method: "DELETE" }).catch(() => {});
  }
});
