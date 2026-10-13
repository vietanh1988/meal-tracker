import { test, expect } from "@playwright/test";
import { rest, S, blockAI, waitDb } from "./helpers.mjs";

// Thiết lập lần đầu nền tối (bản vẽ 54–59): đi hết các bước, bỏ qua AI → vào Hôm nay, onboarding_done = true.
// Chạy đầu tiên (tên "aonboarding"), giữ nguyên số đo của user test.
test("Onboarding: đi hết các bước rồi vào app", async ({ browser }) => {
  const s = S();
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: false }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try {
    await blockAI(page);
    await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
    await page.goto("/");
    await page.getByTestId("login-email").fill(s.email);
    await page.getByTestId("login-pass").fill(s.password);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("onboarding")).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: "shots/onb-chao.png" });
    await page.getByTestId("onb-start").click();
    await expect(page.getByTestId("onb-cm")).toHaveValue("172");
    await page.screenshot({ path: "shots/onb-co-the.png" });
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-opt-gym")).toBeVisible();
    await page.screenshot({ path: "shots/onb-tap.png" });
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-seg-bulk")).toBeVisible();
    await page.screenshot({ path: "shots/onb-muc-tieu.png" });
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-kcal")).not.toHaveText("0");
    await page.screenshot({ path: "shots/onb-xong.png" });
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-opt-vn")).toBeVisible();
    await page.screenshot({ path: "shots/onb-phong-cach.png" });
    await page.getByRole("button", { name: "Bỏ qua, tự ghi sau" }).click();
    await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
    await waitDb(async () => (await rest(`profiles?id=eq.${s.uid}&select=onboarding_done`))[0]?.onboarding_done === true, "onboarding_done");
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: true }) });
    await ctx.close();
  }
});
