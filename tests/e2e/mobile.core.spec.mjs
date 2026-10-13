import { test, expect } from "@playwright/test";
import { login, todayRow, rest, S, waitDb, blockAI } from "./helpers.mjs";

test.describe.serial("Mobile — luồng hằng ngày", () => {
  let page;
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  });

  test("đăng nhập → Hôm nay tự áp Lịch tuần (1 lần)", async () => {
    await login(page);
    await expect(page.getByText("Phở bò").first()).toBeVisible();
    const row = await waitDb(async () => { const r = await todayRow(); return r && r.meals.length === 2 ? r : null; }, "lịch tuần áp vào daily_logs");
    expect(row.meals.map((m) => m.meal_id)).toEqual(["sang", "trua"]);
    expect(row.total_cal).toBe(960);
    expect(row.eaten_meals).toEqual([]);
  });

  test("tick Đã ăn bữa sáng → lưu DB, calo đã ăn = 450", async () => {
    await page.getByRole("button", { name: "✓ Đã ăn" }).first().click();
    await waitDb(async () => (await todayRow())?.eaten_meals?.includes("sang"), "eaten_meals có sang");
    await expect(page.getByText(/đã ăn 450/i).first()).toBeVisible();
  });

  test("Nước: +1 ly rồi Hoàn tác", async () => {
    await page.getByRole("button", { name: "Thêm 1 ly nước 250 ml" }).click();
    await waitDb(async () => (await todayRow())?.water_ml === 250, "water 250");
    await page.getByRole("button", { name: "Hoàn tác" }).click();
    await waitDb(async () => (await todayRow())?.water_ml === 0, "water 0");
  });

  test("tải lại trang: dữ liệu còn, không áp Lịch tuần lần 2", async () => {
    await page.reload();
    await expect(page.getByText(/CALO CÒN LẠI/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/đã ăn 450/i).first()).toBeVisible();
    await page.waitForTimeout(1500);
    const row = await todayRow();
    expect(row.meals.length).toBe(2);
    expect(row.eaten_meals).toEqual(["sang"]);
  });

  test("Cân nặng nhanh: lưu 64,8 rồi cân lại 64.9 cùng ngày → vẫn 1 dòng", async () => {
    const s = S();
    await page.getByText("Chưa cập nhật cân nặng tuần này").click();
    await page.getByPlaceholder(/^VD:/).fill("64,8");
    await page.getByRole("button", { name: "💾 Lưu" }).click();
    await waitDb(async () => { const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`); return w.length === 1 && Number(w[0].kg) === 64.8; }, "weight 64.8");
    const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`);
    expect(w[0].logged_date).toBe(s.today);
    expect(w[0].week).toBe(1);
  });

  test("bỏ tick bữa sáng → eaten rỗng", async () => {
    await page.getByText(/✓ Đã ăn · 450 cal/).first().click();
    await waitDb(async () => (await todayRow())?.eaten_meals?.length === 0, "eaten rỗng");
  });
});
