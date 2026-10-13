import { test, expect } from "@playwright/test";
import { login, S, tap } from "./helpers.mjs";

// Tôi › Tài khoản (bản vẽ 34–35): thẻ hồ sơ có email, đổi mật khẩu gửi link, xoá tài khoản sai mật khẩu thì báo lỗi (không xoá)
test("Tài khoản: thông tin, đổi mật khẩu, xoá tài khoản cần đúng mật khẩu", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  await login(page);
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
  await tap(page.getByTestId("me-account"));
  await expect(page.getByTestId("account-card")).toContainText(s.email);
  await page.screenshot({ path: "shots/tai-khoan.png", fullPage: true });

  // Cập nhật ứng dụng: mở hộp cập nhật kiểu app (bản vẽ 42), Huỷ thì đóng
  await tap(page.getByTestId("account-update"));
  await expect(page.getByTestId("update-flow")).toBeVisible();
  await page.screenshot({ path: "shots/cap-nhat.png" });
  await page.getByTestId("update-later").click();
  await expect(page.getByTestId("update-flow")).toHaveCount(0);

  await tap(page.getByTestId("account-password"));
  await page.getByRole("button", { name: "Đồng ý" }).click();
  await expect(page.getByText(/Đã gửi link đổi mật khẩu|Gửi chưa được/)).toBeVisible();

  await tap(page.getByTestId("account-delete"));
  await expect(page.getByTestId("delete-sheet")).toBeVisible();
  await expect(page.getByTestId("delete-go")).toBeDisabled();
  await page.getByTestId("delete-pass").fill("mat-khau-sai-123");
  await page.getByTestId("delete-confirm-text").fill("xoa");
  await page.getByTestId("delete-go").click();
  await expect(page.getByRole("alert")).toContainText("Sai mật khẩu");
  await ctx.close();
});
