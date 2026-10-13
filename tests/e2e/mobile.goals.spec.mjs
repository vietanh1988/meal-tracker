import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Tôi › Mục tiêu & macro: đổi mục tiêu, cân mục tiêu, chiều cao, whey, công thức, loại tập — lưu DB, kcal tính lại
test("Mục tiêu & macro: lưu hồ sơ và tính lại kcal", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const prof = async () => (await rest(`profiles?id=eq.${s.uid}&select=goal_type,goal_kg,months,cm,uses_supplements,calorie_mode,exercise_type,diet_strategy`))[0];
  const before = await prof();
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  const cal = async () => Number(await page.getByTestId("goals-macro").getAttribute("data-cal"));

  try {
    await login(page);
    await nav("Tôi").click();
    await page.getByTestId("me-profile-card").click();
    await expect(page.getByText("MỤC TIÊU", { exact: true })).toBeVisible();
    await expect(page.getByText("Tự động lưu")).toBeVisible();
    await page.screenshot({ path: "shots/muc-tieu.png", fullPage: true });
    const calBulk = await cal();
    expect(calBulk).toBeGreaterThan(1000);

    // Giảm mỡ → kcal giảm, hiện dòng Kiểu ăn
    await tap(page.getByTestId("goals-goal-cut"));
    await waitDb(async () => (await prof()).goal_type === "cut", "goal_type = cut");
    await expect.poll(cal).toBeLessThan(calBulk);
    await expect(page.getByTestId("goals-diet")).toBeVisible();

    // Cân mục tiêu 60 kg trong 6 tháng
    await page.getByTestId("goals-goalkg").fill("60");
    await page.getByTestId("goals-goalkg").press("Enter");
    await waitDb(async () => Number((await prof()).goal_kg) === 60, "goal_kg = 60");
    await page.getByTestId("goals-months").fill("6");
    await page.getByTestId("goals-months").press("Enter");
    await waitDb(async () => (await prof()).months === 6, "months = 6");
    await expect(page.getByTestId("goals-speed")).toContainText("g/tuần");

    // Số sai (chiều cao 20) không lưu; 175 thì lưu
    await page.getByTestId("goals-cm").fill("20");
    await page.getByTestId("goals-cm").press("Enter");
    await page.waitForTimeout(600);
    expect((await prof()).cm).toBe(before.cm);
    await page.getByTestId("goals-cm").fill("175");
    await page.getByTestId("goals-cm").press("Enter");
    await waitDb(async () => (await prof()).cm === 175, "cm = 175");

    // Whey + công thức Việt Nam
    await tap(page.getByTestId("goals-whey"));
    await waitDb(async () => (await prof()).uses_supplements === true, "uses_supplements = true");
    const calStd = await cal();
    await tap(page.getByTestId("goals-mode"));
    await tap(page.getByTestId("goals-mode-asian"));
    await waitDb(async () => (await prof()).calorie_mode === "asian", "calorie_mode = asian");
    await expect.poll(cal).toBeLessThan(calStd);

    // Không tập → ẩn Tần suất/Lịch tập, Tăng cơ bị khoá
    await tap(page.getByTestId("goals-exercise"));
    await tap(page.getByTestId("goals-exercise-none"));
    await waitDb(async () => (await prof()).exercise_type === "none", "exercise_type = none");
    await expect(page.getByTestId("goals-freq")).toHaveCount(0);
    await expect(page.getByTestId("goals-goal-bulk")).toBeDisabled();
    await page.screenshot({ path: "shots/muc-tieu-sau-sua.png", fullPage: true });

    // Tập lại Gym → Lịch tập mở được màn Lịch tập & bữa
    await tap(page.getByTestId("goals-exercise"));
    await tap(page.getByTestId("goals-exercise-gym"));
    await waitDb(async () => (await prof()).exercise_type === "gym", "exercise_type = gym");
    await tap(page.getByTestId("goals-schedule"));
    await expect(page.getByText("NGÀY TẬP TRONG TUẦN")).toBeVisible();
  } finally {
    // Trả hồ sơ về như cũ cho các bài test sau
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(before) });
    await ctx.close();
  }
});
