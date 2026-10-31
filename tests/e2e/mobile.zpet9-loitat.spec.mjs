// 31/10 (chốt bản B "Lối tắt"): nút mặt Pi cạnh chuông → menu 4 dòng, mỗi dòng mở đúng chỗ (màn Pi / tab Xếp hạng / tab Bạn bè / tab Khoe + link trang web).
import { test, expect } from "@playwright/test";
import { login, rest, tap } from "./helpers.mjs";

test("Lối tắt Pi ở đầu Hôm nay mở đúng chỗ", async ({ browser }) => {
  test.setTimeout(90_000);
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    const sc = page.getByTestId("pi-shortcut");
    await expect(sc).toBeVisible({ timeout: 20_000 });
    const [a, b] = [await sc.boundingBox(), await page.getByTestId("bell").boundingBox()];
    expect(Math.round(a.width)).toBe(42);
    expect(Math.round(b.x - (a.x + a.width))).toBe(8); // ngay cạnh chuông, khe 8
    const back = () => page.getByRole("button", { name: "Quay lại" }).last().click();
    const openMenu = async () => { await page.evaluate(() => window.scrollTo(0, 0)); await sc.click(); await expect(page.getByTestId("pi-menu")).toBeVisible(); };

    await openMenu();
    for (const k of ["room", "rank", "friends", "khoe"]) await expect(page.getByTestId(`pi-menu-${k}`)).toBeVisible();
    await page.screenshot({ path: "shots/pi-loi-tat.png" });
    await page.getByTestId("pi-menu-rank").click();
    await expect(page.getByTestId("social-tab-rank")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("rank-list")).toBeVisible();
    await back();

    await openMenu();
    await page.getByTestId("pi-menu-friends").click();
    await expect(page.getByTestId("social-tab-friends")).toHaveAttribute("aria-selected", "true");
    await back();

    await openMenu();
    await page.getByTestId("pi-menu-khoe").click();
    await expect(page.getByTestId("social-tab-show")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("show-web")).toBeVisible();
    await back();

    await openMenu();
    await page.getByTestId("pi-menu-room").click();
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await ctx.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
  }
});
