import { test, expect } from "@playwright/test";
import { login } from "./helpers.mjs";

// Tôi › Giới thiệu: số món đếm từ kho món thật, mở được Điều khoản
test("Giới thiệu: số món thật và điều khoản", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  await login(page);
  // Tôi › Nhật ký ăn uống → mở Tiến độ đúng tab Nhật ký; Đăng xuất nằm trong ô riêng
  await nav("Tôi").click();
  await expect(page.getByTestId("me-logout")).toBeVisible();
  await page.getByTestId("me-diary").click();
  await expect(page.getByTestId("seg-diary")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("diary-summary")).toBeVisible();
  await page.screenshot({ path: "shots/tien-do-nhat-ky.png", fullPage: true });
  await nav("Tôi").click();
  await page.getByRole("button", { name: /Giới thiệu/ }).click();
  await expect(page.getByTestId("about-foods")).toContainText(/[\d.]+ món/);
  await expect(page.getByTestId("about-foods")).toContainText(/\d+ món Việt/);
  await expect(page.getByTestId("about-edit")).toHaveCount(0); // user thường không thấy nút sửa
  await page.screenshot({ path: "shots/gioi-thieu.png", fullPage: true });
  await page.getByTestId("about-terms").click();
  await expect(page.getByTestId("terms-content")).toBeVisible();
  await expect(page.getByText("Điều khoản & chính sách").first()).toBeVisible();
  await page.screenshot({ path: "shots/dieu-khoan.png", fullPage: true });
  await ctx.close();
});
