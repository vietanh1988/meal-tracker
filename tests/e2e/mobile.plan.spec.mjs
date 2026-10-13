import { test, expect } from "@playwright/test";
import { login, rest, S } from "./helpers.mjs";

// Tôi › Gói cước: lượt AI đã dùng đúng kỳ (theo ngày UTC như ai-proxy), đang miễn phí, không lộ hạng khi tắt bán hàng
test("Gói cước: lượt AI và trạng thái miễn phí", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const day = new Date().toISOString().slice(0, 10); // kỳ đếm của ai-proxy là ngày UTC
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ai_chat_count_today: 3, ai_chat_count_reset_at: day, ai_menu_count_today: 9, ai_menu_count_reset_at: "2020-01-01" }) });
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  await login(page);
  await nav("Tôi").click();
  await page.getByRole("button", { name: /Gói cước/ }).click();
  await expect(page.getByTestId("quota-chat")).toHaveAttribute("data-used", "3");
  await expect(page.getByTestId("quota-menu")).toHaveAttribute("data-used", "0"); // số kỳ cũ không tính
  await expect(page.getByTestId("plan-free")).toBeVisible();
  await expect(page.getByTestId("plan-tier")).toHaveCount(0);
  await page.screenshot({ path: "shots/goi-cuoc.png", fullPage: true });

  // Tài khoản (email, xoá tài khoản) vẫn mở được từ Tôi
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("button", { name: /Tài khoản/ }).click();
  await expect(page.getByText(s.email).first()).toBeVisible();
  await ctx.close();
});
