// 31/10 cá tính Pi: chạm Pi liền 5 lần → câu nhột, liền 10 lần → câu dỗi (và 5 giây chạm không phản ứng).
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { login, S, rest, tap } from "./helpers.mjs";

const extra = JSON.parse(readFileSync(new URL("../../src/pi/extraLines.json", import.meta.url), "utf8"));
const texts = (ma) => extra.nhom.find((g) => g.ma === ma).cau.flatMap((c) => [c.text, c.nu]);

test("chạm Pi liền: nhột rồi dỗi", async ({ browser }) => {
  test.setTimeout(90_000);
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    const pi = page.getByTestId("pet-tap");
    if (await page.getByTestId("pet-home").getAttribute("data-sulk")) for (let i = 0; i < 3; i++) await pi.click(); // đang dỗi vì vắng: dỗ cho hết
    await page.waitForTimeout(4500); // ngắt chuỗi chạm trước
    for (let i = 0; i < 5; i++) await pi.click({ delay: 20 });
    const say = page.getByTestId("pet-home-say");
    await expect.poll(async () => texts("cu_nhot").includes((await say.textContent()).trim()), { timeout: 5000 }).toBe(true);
    for (let i = 0; i < 5; i++) await pi.click({ delay: 20 });
    await expect.poll(async () => texts("doi_cham").includes((await say.textContent()).trim()), { timeout: 5000 }).toBe(true);
    await page.screenshot({ path: "shots/pi-doi.png" });
    await ctx.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
  }
});
