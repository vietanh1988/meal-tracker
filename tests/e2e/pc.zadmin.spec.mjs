import { test, expect } from "@playwright/test";
import { login, rest, S } from "./helpers.mjs";

// Quản trị PC (bản vẽ 117–119): Super Admin bấm "Vào Quản trị" → mở từng mục thanh bên, không lỗi trang,
// chụp ảnh từng trang; mở ngăn chi tiết 1 người dùng; mở dòng sửa 1 món trong Kho thực phẩm (không lưu).
// Tạm bật is_admin + admin_role super cho user test, cuối bài trả lại (pc.security kiểm is_admin = false).
// Supabase local chưa có RPC admin_list_users / admin_get_user_detail (chỉ có trên prod) → giả lập 2 RPC này.
const NAV = ["home", "orders", "report_biz", "users", "subscription_settings", "feedback", "notify", "templates", "food_db", "food_cache_pending", "admin", "feature_flags", "ai", "ai_cost", "health", "audit_log", "backup"];

test("Quản trị PC: thanh bên đủ mục, mở từng trang, ngăn người dùng, sửa món tại chỗ", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  const fakeUser = { id: s.uid, username: "e2e_tester", email: s.email, tier: "premium", subscription_end_date: "2099-01-01", is_locked: false, is_admin: true, admin_role: "super", last_sign_in_at: new Date().toISOString(), created_at: new Date().toISOString(), total_count: 2 };
  const other = { id: "00000000-0000-0000-0000-0000000000e2", username: "khach_e2e", email: "khach@test.local", tier: "free", is_locked: false, is_admin: false, admin_role: null, last_sign_in_at: null, created_at: new Date().toISOString(), total_count: 2 };
  await page.route("**/rest/v1/rpc/admin_list_users*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([other, fakeUser]) }));
  await page.route("**/rest/v1/rpc/admin_get_user_detail*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ ...other, admin_notes: "", meal_days_logged: 3, weight_weeks_logged: 1 }]) }));
  try {
    await login(page);
    await page.getByTestId("pc-open-admin").click();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await expect(page.getByTestId("pc-home")).toBeVisible();
    await expect(page.getByTestId("pc-me")).toContainText("Super Admin");
    // Logo thật (ảnh /logo.png đã tải) + mỗi mục thanh bên có icon
    expect(await page.getByTestId("pc-logo").evaluate((img) => img.complete && img.naturalWidth > 0), "logo tải được").toBe(true);
    for (const id of NAV) await expect(page.getByTestId(`pc-nav-ic-${id}`).locator("svg"), `icon ${id}`).toHaveCount(1);

    for (const id of NAV) {
      console.log("BƯỚC: mở", id);
      await page.getByTestId(`pc-nav-${id}`).click();
      await expect(page.getByTestId(`pc-nav-${id}`)).toHaveAttribute("aria-current", "page");
      await expect(page.getByTestId(`pc-page-${id}`)).toBeVisible();
      // Mọi mục là trang PC mới (không còn tab cũ bọc trong thẻ trắng)
      const root = { home: "pc-home", users: "pc-users", food_db: "pc-food", admin: "pc-version" }[id] || `pc-${id}`;
      await expect(page.getByTestId(`pc-page-${id}`).getByTestId(root).first(), `${id}: gốc trang mới`).toBeVisible();
      await expect(page.getByTestId(`pc-sec-${id}`)).toHaveCount(0);
      await page.waitForTimeout(600);
      const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(w, `${id}: tràn ngang`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `shots/pc-admin-${id}.png` });
    }

    // Người dùng → ngăn bên phải
    await page.getByTestId("pc-nav-users").click();
    await page.getByTestId("pc-user-row").first().click();
    const drawer = page.getByTestId("pc-user-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("khach_e2e");
    await expect(drawer).toContainText("GÓI & THỜI HẠN");
    await page.getByTestId("pc-user-delete").click();
    await expect(page.getByTestId("pc-user-delete-ok")).toBeDisabled();
    await page.screenshot({ path: "shots/pc-admin-users-drawer.png" });
    await page.getByTestId("pc-user-delete-cancel").click();
    await page.getByTestId("pc-user-close").click();
    await expect(drawer).toHaveCount(0);

    // Kho thực phẩm → dòng sửa tại chỗ (không lưu)
    await page.getByTestId("pc-nav-food_db").click();
    await page.getByTestId("pc-food-row").first().click();
    await expect(page.getByTestId("pc-food-edit")).toBeVisible();
    await expect(page.getByTestId("pc-food-orig")).toContainText("gốc:");
    for (const k of ["p", "c", "f", "cal"]) await expect(page.getByTestId(`pc-food-in-${k}`)).toBeVisible();
    await page.screenshot({ path: "shots/pc-admin-food-edit.png" });
    await page.getByTestId("pc-food-row").first().click();
    await expect(page.getByTestId("pc-food-edit")).toHaveCount(0);

    // Quay lại app
    await page.getByTestId("pc-open-app").click();
    await expect(page.getByTestId("pc-phone")).toBeVisible();
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
