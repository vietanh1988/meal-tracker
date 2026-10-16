import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Tôi › Nhắc nhở: bật/tắt, đổi giờ, thêm/bỏ bữa, thứ cân, nhắc nước — lưu vào profiles.reminder_settings
test("Nhắc nhở: lưu cài đặt nhắc", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const rs = async () => (await rest(`profiles?id=eq.${s.uid}&select=reminder_settings`))[0].reminder_settings || {};
  const before = await rs();
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  try {
    await login(page);
    await nav("Tôi").click();
    await page.getByRole("button", { name: /Nhắc nhở/ }).click();
    await expect(page.getByText("Nhắc ghi bữa")).toBeVisible();
    await expect(page.getByTestId("rem-slot-trua")).toHaveText("Trưa 11:45");
    await page.screenshot({ path: "shots/nhac-nho.png", fullPage: true });

    // Bật nhắc nước, đổi mỗi 3 giờ
    await tap(page.getByTestId("rem-water"));
    await waitDb(async () => (await rs()).water?.on === true, "water.on");
    await tap(page.getByTestId("rem-water-every"));
    await waitDb(async () => (await rs()).water?.every === 3, "water.every = 3");

    // Đổi giờ nhắc tối 20:00
    await tap(page.getByTestId("rem-slot-toi"));
    await page.getByTestId("rem-slot-toi-input").fill("20:00");
    await page.getByTestId("rem-slot-toi-input").press("Enter");
    await waitDb(async () => ((await rs()).meal?.slots || []).some((x) => x.meal === "toi" && x.time === "20:00"), "toi 20:00");

    // Bỏ trưa, thêm sáng
    await tap(page.getByTestId("rem-slot-del-trua"));
    await waitDb(async () => !((await rs()).meal?.slots || []).some((x) => x.meal === "trua"), "bỏ trua");
    await tap(page.getByTestId("rem-slot-add"));
    await tap(page.getByTestId("rem-slot-add-sang"));
    await waitDb(async () => ((await rs()).meal?.slots || []).some((x) => x.meal === "sang"), "thêm sang");

    // Nhắc cân thứ Tư
    await page.getByTestId("rem-weigh-day").selectOption("2");
    await waitDb(async () => (await rs()).weigh?.weekday === 2, "weigh.weekday = 2");

    // 17/10 (bản vẽ 124): 2 nhóm ĂN UỐNG · CƠ THỂ; "Cân & đo hằng tuần" có ô kèm nhắc đo số đo
    await expect(page.getByTestId("rem-sec-food")).toContainText("Nhắc ghi bữa");
    await expect(page.getByTestId("rem-sec-food")).toContainText("Nhắc uống nước");
    await expect(page.getByTestId("rem-sec-body")).toContainText("Cân & đo hằng tuần");
    await tap(page.getByTestId("rem-weigh-measure"));
    await waitDb(async () => (await rs()).weigh?.measure === true, "weigh.measure = true");
    await expect(page.getByTestId("rem-weigh-measure")).toHaveAttribute("aria-checked", "true");

    // Tắt nhắc bữa
    await tap(page.getByTestId("rem-meal"));
    await waitDb(async () => (await rs()).meal?.on === false, "meal.on = false");
    await page.screenshot({ path: "shots/nhac-nho-sau-sua.png", fullPage: true });

    // Mở lại màn: vẫn giữ cài đặt
    await page.getByRole("button", { name: "Quay lại" }).click();
    await expect(page.getByRole("button", { name: /Nhắc nhở/ })).toContainText("Cân & đo · Nước");
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ reminder_settings: before }) });
    await ctx.close();
  }
});
