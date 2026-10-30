// 31/10 tiếng + rung: Tôi › Âm thanh & rung bật mặc định, tắt thì lưu fp_sfx = "0", mở lại app vẫn tắt; bấm Đã ăn không lỗi trang.
import { test, expect } from "@playwright/test";
import { login } from "./helpers.mjs";

test("Âm thanh & rung: mặc định bật, tắt được và nhớ", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  let sfxSeen = false; page.on("request", (r) => { if (/\/sfx\/[a-z]+\.mp3/.test(r.url())) sfxSeen = true; });
  await login(page);
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
  const sw = page.getByTestId("me-sound");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => sfxSeen, { timeout: 10_000 }).toBe(true); // lần chạm đầu đã tải sẵn tiếng (mở khoá)
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("fp_sfx"))).toBe("0");
  await page.screenshot({ path: "shots/am-thanh-tat.png" });
  await page.reload();
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
  await expect(page.getByTestId("me-sound")).toHaveAttribute("aria-checked", "false");
  await page.getByTestId("me-sound").click();
  await expect(page.getByTestId("me-sound")).toHaveAttribute("aria-checked", "true");
  expect(errs).toEqual([]);
  await ctx.close();
});
