import { test, expect } from "@playwright/test";
import { S, rest, blockAI, waitDb } from "./helpers.mjs";
import { usernameFromEmail } from "../../src/lib/onboardingCheck.js";

const VIEW = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" };

// Đăng nhập / Đăng ký / Quên mật khẩu: báo lỗi sai mật khẩu, mở màn quên mật khẩu, màn Đăng ký gọn (bản vẽ 109)
test("Đăng nhập: báo lỗi rõ, chuyển Đăng ký / Quên mật khẩu", async ({ browser }) => {
  const ctx = await browser.newContext(VIEW);
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

  // Đăng ký gọn: chỉ Email + Mật khẩu, không còn ô Tên hiển thị / ô tích đồng ý — thay bằng dòng chữ có link
  await page.getByTestId("auth-tab-register").click();
  await expect(page.getByTestId("auth-reg-email")).toBeVisible();
  await expect(page.getByTestId("auth-reg-pass")).toBeVisible();
  await expect(page.getByTestId("reg-username")).toHaveCount(0);
  await expect(page.getByTestId("reg-terms")).toHaveCount(0);
  await expect(page.getByTestId("reg-terms-note")).toContainText("Bấm Đăng ký là bạn đồng ý Điều khoản và Chính sách bảo mật");
  await page.getByTestId("reg-terms-note").getByRole("button", { name: "Điều khoản" }).click();
  await page.getByText("✕", { exact: true }).last().click();
  // Mật khẩu ngắn → báo lỗi, không tạo tài khoản
  await page.getByTestId("auth-reg-email").fill(`e2e_short_${Date.now()}@test.local`);
  await page.getByTestId("auth-reg-pass").fill("123");
  await page.getByTestId("auth-reg-submit").click();
  await expect(page.getByRole("alert")).toContainText("ít nhất 8 ký tự");
  // 18/10: đủ 8 ký tự nhưng toàn số → báo cần cả chữ và số
  await page.getByTestId("auth-reg-pass").fill("12345678");
  await page.getByTestId("auth-reg-submit").click();
  await expect(page.getByRole("alert")).toContainText("cả chữ và số");
  await page.screenshot({ path: "shots/dang-ky.png", fullPage: true });

  // Đăng nhập đúng → vào app
  await page.getByTestId("auth-tab-login").click();
  await page.getByTestId("login-email").fill(s.email);
  await page.getByTestId("login-pass").fill(s.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await ctx.close();
});

// Đăng ký xong vào thẳng màn Chào (không tải lại trang); tên lấy từ phần trước @, trùng thì thêm số
test("Đăng ký: tên từ email, trùng thêm số, vào thẳng onboarding", async ({ browser }) => {
  const local = `e2ereg${Date.now()}`;
  const base = usernameFromEmail(`${local}@test.local`);
  const register = async (email) => {
    const ctx = await browser.newContext(VIEW);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
    await blockAI(page);
    await page.goto("/");
    await page.getByTestId("auth-tab-register").click();
    await page.evaluate(() => { window.__fpNoReload = true; });
    await page.getByTestId("auth-reg-email").fill(email);
    await page.getByTestId("auth-reg-pass").fill("matkhau123");
    await page.getByTestId("auth-reg-submit").click();
    await expect(page.getByTestId("onboarding")).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => window.__fpNoReload === true), "không tải lại trang sau đăng ký").toBe(true);
    return { ctx, page };
  };

  const a = await register(`${local}@test.local`);
  // Hồ sơ mới: ô cơ thể để trống (không điền sẵn mặc định)
  await a.page.getByTestId("onb-start").click();
  await expect(a.page.getByTestId("onb-height")).toHaveValue("");
  await expect(a.page.getByTestId("onb-weight")).toHaveValue("");
  await expect(a.page.getByTestId("onb-year")).toHaveValue("");
  await a.page.screenshot({ path: "shots/dang-ky-xong.png" });
  await a.ctx.close();
  await waitDb(async () => (await rest(`profiles?username=eq.${base}&select=id`)).length === 1, `profile ${base}`);

  const b = await register(`${local}@example.com`);
  await b.ctx.close();
  await waitDb(async () => (await rest(`profiles?username=eq.${base}2&select=id`)).length === 1, `profile ${base}2 (trùng thêm số)`);
});
