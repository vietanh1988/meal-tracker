import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Tôi › Lịch tập & bữa: ngày tập, bật/tắt bữa, đổi giờ bữa, mục tiêu nước — lưu DB và Hôm nay đổi theo
test("Lịch tập & bữa: lưu ngày tập, bữa, giờ, nước", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const prof = async () => (await rest(`profiles?id=eq.${s.uid}&select=gym_days,meal_config,meal_times,water_goal_ml`))[0];
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  await login(page);
  await nav("Tôi").click();
  await page.getByRole("button", { name: /Lịch tập & bữa/ }).click();
  await expect(page.getByText("NGÀY TẬP TRONG TUẦN")).toBeVisible();
  await page.screenshot({ path: "shots/lich-tap.png", fullPage: true });

  // Ngày tập: tắt Thứ 2 rồi bật lại
  await tap(page.getByTestId("sched-day-0"));
  await waitDb(async () => !(await prof()).gym_days.includes(0), "bỏ T2 khỏi gym_days");
  await tap(page.getByTestId("sched-day-0"));
  await waitDb(async () => (await prof()).gym_days.includes(0), "bật lại T2");

  // Bật Phụ sáng cho ngày tập
  await tap(page.getByTestId("sched-meal-phu_sang"));
  await waitDb(async () => ((await prof()).meal_config?.train || []).includes("phu_sang"), "phu_sang trong meal_config.train");
  await expect(page.getByTestId("sched-meal-phu_sang")).toHaveAttribute("aria-pressed", "true");

  // Đổi giờ bữa tối 20:15
  await tap(page.getByTestId("sched-time-toi"));
  await page.getByTestId("sched-time-input-toi").fill("20:15");
  await page.getByTestId("sched-time-input-toi").press("Enter");
  await waitDb(async () => (await prof()).meal_times?.toi === "20:15", "meal_times.toi = 20:15");
  await expect(page.getByTestId("sched-time-toi")).toHaveText("20:15");

  // Nước: +250 rồi về tự tính
  await tap(page.getByTestId("water-goal-plus"));
  await waitDb(async () => (await prof()).water_goal_ml > 0, "water_goal_ml đặt tay");
  await tap(page.getByTestId("water-goal-auto"));
  await waitDb(async () => (await prof()).water_goal_ml == null, "water_goal_ml về tự tính");

  // Về Hôm nay: dòng thời gian có Phụ sáng (vừa bật), giờ bữa tối 20:15
  await page.getByRole("button", { name: "Quay lại" }).click();
  await nav("Hôm nay").click();
  await expect(page.locator("main")).toContainText("Phụ sáng");
  await expect(page.locator("main")).toContainText("20:15");
  await page.screenshot({ path: "shots/hom-nay-sau-lich-tap.png", fullPage: true });
  await ctx.close();
});
