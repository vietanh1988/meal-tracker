// 13/11 (bản vẽ "Chỗ đặt công tắc Chế độ ăn" — cách 2): thẻ Mục tiêu trên Hôm nay bấm được → chọn chế độ ăn.
// Đổi ở đây = đổi profile.dietStrategy (cùng nguồn với Tôi › Mục tiêu & macro); mục tiêu kcal / đạm đổi ngay; header không cao thêm.
import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

test("Công tắc chế độ ăn trên Hôm nay: xem trước số, đổi Nhiều đạm, về Cân bằng", async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  const s = S();
  const prof = async () => (await rest(`profiles?id=eq.${s.uid}&select=goal_type,diet_strategy,ui_mode,macro_manual`))[0];
  const before = await prof();
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  try {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ goal_type: "bulk", diet_strategy: "balanced", ui_mode: "gym", macro_manual: null }) });
    await login(page);
    await nav("Hôm nay").click();
    const pick = page.getByTestId("diet-pick");
    await expect(pick).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("diet-name")).toHaveText("Cân bằng");
    const hdrH = (await page.getByTestId("today-header").boundingBox()).height;
    const b = await pick.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    const calBefore = await pick.getAttribute("aria-label");

    await tap(pick);
    const sheet = page.getByTestId("diet-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("diet-balanced")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("diet-keto")).toBeDisabled(); // tăng cơ: Keto / Ít tinh bột chỉ khi giảm mỡ
    await expect(page.getByTestId("diet-low_carb")).toBeDisabled();
    await expect(page.getByTestId("diet-high_protein")).toContainText("Đ ");
    await expect(page.getByTestId("diet-manual")).toBeVisible();
    await page.screenshot({ path: "shots/che-do-an-sheet.png" });
    await tap(page.getByTestId("diet-high_protein"));
    await waitDb(async () => (await prof()).diet_strategy === "high_protein", "diet_strategy = high_protein");
    await expect(sheet).toHaveCount(0);
    await expect(page.getByText(/Đã đổi sang Nhiều đạm/)).toBeVisible();
    await expect(page.getByTestId("diet-name")).toHaveText("Nhiều đạm");
    expect(Math.abs((await page.getByTestId("today-header").boundingBox()).height - hdrH)).toBeLessThanOrEqual(1); // không cao thêm
    await page.screenshot({ path: "shots/che-do-an-nhieu-dam.png" });

    // Tôi › Mục tiêu & macro thấy cùng chế độ
    await nav("Tôi").click();
    await page.getByTestId("me-profile-card").click();
    await expect(page.getByTestId("goals-diet")).toContainText("Nhiều đạm");

    // về Cân bằng
    await nav("Hôm nay").click().catch(() => {});
    await page.goto("/");
    await nav("Hôm nay").click();
    await tap(page.getByTestId("diet-pick"));
    await tap(page.getByTestId("diet-balanced"));
    await waitDb(async () => (await prof()).diet_strategy === "balanced", "diet_strategy = balanced");
    await expect(page.getByTestId("diet-pick")).toHaveAttribute("aria-label", calBefore);
    expect(errs).toEqual([]);
  } finally {
    await ctx.close().catch(() => {}); // đóng app trước: lượt lưu hồ sơ còn chờ không ghi đè bản khôi phục
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ goal_type: before.goal_type, diet_strategy: before.diet_strategy, ui_mode: before.ui_mode, macro_manual: before.macro_manual }) });
  }
});
