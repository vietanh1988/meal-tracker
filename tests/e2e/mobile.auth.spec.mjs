import { test, expect } from "@playwright/test";
import { S, blockAI } from "./helpers.mjs";

// Đăng nhập / Đăng ký / Quên mật khẩu (giao diện mới): báo lỗi sai mật khẩu, chưa đồng ý điều khoản, mở màn quên mật khẩu
test("Đăng nhập: báo lỗi rõ, chuyển Đăng ký / Quên mật khẩu", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  await blockAI(page);
  await page.goto("/");
  await expect(page.getByTestId("login-submit")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: "shots/dang-nhap.png", fullPage: true });

  // Sai mật khẩu → báo lỗi, vẫn ở màn đăng nhập
  await page.getByTestId("login-email").fill(s.email);
  await page.getByTestId("login-pass").fill("sai-mat-khau-123");
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("alert")).toContainText("chưa đúng");

  // Quên mật khẩu: email điền sẵn, quay lại được
  await page.getByTestId("forgot-open").click();
  await expect(page.getByTestId("forgot-email")).toHaveValue(s.email);
  await page.screenshot({ path: "shots/quen-mat-khau.png", fullPage: true });
  await page.getByRole("button", { name: "Quay lại đăng nhập" }).click();

  // Đăng ký: chưa tick điều khoản → báo lỗi, không tạo tài khoản
  await page.getByTestId("auth-tab-register").click();
  await page.getByTestId("reg-username").fill(`e2e_new_${Date.now() % 100000}`);
  await page.getByTestId("login-email").fill(`e2e_new_${Date.now()}@test.local`);
  await page.getByTestId("login-pass").fill("matkhau123");
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("alert")).toContainText("đồng ý");
  await page.screenshot({ path: "shots/dang-ky.png", fullPage: true });

  // Đăng nhập đúng → vào app
  await page.getByTestId("auth-tab-login").click();
  await page.getByTestId("login-email").fill(s.email);
  await page.getByTestId("login-pass").fill(s.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await ctx.close();
});
