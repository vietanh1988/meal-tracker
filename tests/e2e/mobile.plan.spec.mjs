import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

const FLAGS_OFF = '{"ai_chat":true,"ai_macro":true,"ai_menu_gen":true,"push":false,"sales_enabled":false,"registration_enabled":true,"template_library":false,"photo_macro":true}';

// Tôi › Lượt AI / Gói cước:
//  - tắt bán hàng: màn "Lượt AI", lượt AI đúng kỳ (ngày UTC như ai-proxy), báo miễn phí, không lộ hạng
//  - bật bán hàng: so sánh gói, chọn 12 tháng → Chuyển khoản → "Tôi đã chuyển khoản" tạo đơn chờ duyệt
test("Gói cước: tắt bán = Lượt AI; bật bán = chọn gói → chuyển khoản → chờ duyệt", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const day = new Date().toISOString().slice(0, 10); // kỳ đếm của ai-proxy là ngày UTC
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ai_chat_count_today: 3, ai_chat_count_reset_at: day, ai_menu_count_today: 9, ai_menu_count_reset_at: "2020-01-01" }) });
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  try {
    await login(page);
    await nav("Tôi").click();
    await expect(page.getByTestId("me-plan")).toContainText("Lượt AI");
    await tap(page.getByTestId("me-plan"));
    await expect(page.getByTestId("quota-chat")).toHaveAttribute("data-used", "3");
    await expect(page.getByTestId("quota-menu")).toHaveAttribute("data-used", "0"); // số kỳ cũ không tính
    await expect(page.getByTestId("plan-free")).toBeVisible();
    await expect(page.getByTestId("plan-tier")).toHaveCount(0);
    await expect(page.getByTestId("plan-buy")).toHaveCount(0);
    await page.screenshot({ path: "shots/goi-cuoc.png", fullPage: true });

    // Tài khoản (email, xoá tài khoản) vẫn mở được từ Tôi
    await page.getByRole("button", { name: "Quay lại" }).click();
    await page.getByRole("button", { name: /Tài khoản/ }).click();
    await expect(page.getByText(s.email).first()).toBeVisible();

    // ---- Bật bán hàng ----
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: FLAGS_OFF.replace('"sales_enabled":false', '"sales_enabled":true') }) });
    await rest("subscription_settings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: 1, price_3m: 150000, price_6m: 270000, price_12m: 480000, bank_name: "NH TEST", bank_account: "0001112223", bank_account_name: "E2E TEST" }) });
    await page.reload();
    await expect(page.getByTestId("kcal-remain").or(page.getByTestId("me-plan"))).toBeVisible({ timeout: 20_000 });
    await nav("Tôi").click();
    await expect(page.getByTestId("me-plan")).toContainText("Gói cước");
    await tap(page.getByTestId("me-plan"));
    await expect(page.getByTestId("plan-compare")).toBeVisible();
    await expect(page.getByTestId("plan-pkg-12m")).toContainText("480.000đ");
    await tap(page.getByTestId("plan-pkg-12m"));
    await page.screenshot({ path: "shots/goi-cuoc-ban.png", fullPage: true });
    await tap(page.getByTestId("plan-buy"));
    await expect(page.getByTestId("pay-account")).toHaveText("0001112223");
    await expect(page.getByTestId("pay-content")).toContainText("FIPILOT");
    await expect(page.getByTestId("pay-content")).toContainText("12T");
    await page.screenshot({ path: "shots/chuyen-khoan.png", fullPage: true });
    await tap(page.getByTestId("pay-done"));
    await waitDb(async () => (await rest(`orders?user_id=eq.${s.uid}&status=eq.pending&select=package,amount`)).some((o) => o.package === "12m" && Number(o.amount) === 480000), "đơn chờ duyệt 12 tháng");
    await expect(page.getByTestId("plan-pending")).toBeVisible();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: FLAGS_OFF }) });
    await rest(`orders?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest("subscription_settings?id=eq.1", { method: "DELETE" });
    await ctx.close();
  }
});
