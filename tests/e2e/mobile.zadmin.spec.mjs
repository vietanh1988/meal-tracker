import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Quản trị (bản vẽ 52) + Góp ý admin (53): nền tối, ô đếm việc cần làm, trả lời góp ý.
// Tạm bật is_admin cho user test, cuối bài trả lại (pc.security kiểm is_admin = false).
test("Quản trị: ô đếm + trả lời góp ý", async ({ browser }) => {
  const s = S();
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true }) });
  const [fb] = await rest("user_feedback", { method: "POST", body: JSON.stringify({ user_id: s.uid, username: "e2e_tester", category: "suggestion", content: "E2E admin: thêm biểu đồ nước" }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try {
    await login(page);
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
    await tap(page.getByTestId("me-admin"));
    await expect(page.getByTestId("admin-home")).toBeVisible();
    await expect(page.getByTestId("admin-stat-feedback")).not.toContainText("–");
    const bg = await page.getByTestId("subpage").last().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain("gradient");
    await page.screenshot({ path: "shots/quan-tri.png", fullPage: true });

    await tap(page.getByTestId("admin-stat-feedback"));
    await expect(page.getByTestId("admin-feedback")).toBeVisible();
    const item = page.getByTestId("adm-fb-item").filter({ hasText: "thêm biểu đồ nước" });
    await item.getByTestId("adm-fb-reply").fill("Đã ghi nhận, cảm ơn bạn");
    await page.screenshot({ path: "shots/gop-y-admin.png", fullPage: true });
    await tap(item.getByTestId("adm-fb-send"));
    await waitDb(async () => (await rest(`user_feedback?id=eq.${fb.id}&select=status,admin_reply`))[0]?.status === "replied", "trả lời góp ý");
    await expect(item).toContainText("Bạn đã trả lời");
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: false }) });
    await ctx.close();
  }
});

// 10 trang con Quản trị nền tối (bản vẽ 98–108, 16/10): mở từng trang (Super Admin), không lỗi, có ảnh chụp
test("Quản trị: 10 trang con nền tối", async ({ browser }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  const SCREENS = [["orders", "adm-orders"], ["report_biz", "adm-report"], ["food_cache_pending", "adm-pending"], ["food_db", "adm-food"], ["templates", "adm-tpl"], ["admin", "adm-version"], ["feature_flags", "adm-flags"], ["ai", "adm-ai"], ["ai_cost", "adm-cost"], ["backup", "adm-backup"]];
  try {
    await login(page);
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
    await tap(page.getByTestId("me-admin"));
    await expect(page.getByTestId("admin-home")).toBeVisible();
    for (const [id, root] of SCREENS) {
      console.log("BƯỚC: mở", id);
      await tap(page.getByTestId(`admin-${id}`));
      await expect(page.getByTestId(root)).toBeVisible();
      await expect(page.getByTestId("admin-loading")).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByTestId("admin-error"), `${id}: lỗi tải`).toHaveCount(0);
      const w = await page.evaluate(() => { const sp = [...document.querySelectorAll('[data-testid="subpage"]')].pop(); const c = sp?.querySelector("div[style*='overflow-y']"); return c ? c.scrollWidth - c.clientWidth : 0; });
      expect(w, `${id}: tràn ngang`).toBeLessThanOrEqual(1);
      if (id === "food_db") {
        await page.getByTestId("adm-food-search").fill("ức gà");
        await expect(page.getByTestId("adm-food-row").first()).toBeVisible();
        await tap(page.getByTestId("adm-food-row").first());
        await expect(page.getByTestId("adm-food-edit")).toBeVisible();
      }
      if (id === "templates") {
        await tap(page.getByTestId("adm-tpl-new"));
        await expect(page.getByTestId("adm-tpl-editor")).toBeVisible();
        await page.screenshot({ path: "shots/admin-templates-editor.png", fullPage: true });
        await page.getByRole("button", { name: "Quay lại" }).last().click();
        const ok = page.getByTestId("admin-confirm-ok");
        if (await ok.count()) await ok.click();
      }
      await page.screenshot({ path: `shots/admin-${id}.png`, fullPage: true });
      await page.getByRole("button", { name: "Quay lại" }).last().click();
      await expect(page.getByTestId("admin-home")).toBeVisible();
    }
    expect(errs).toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
    await ctx.close();
  }
});
