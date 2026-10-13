import { test, expect } from "@playwright/test";
import { login, todayRow, rest, S, waitDb, kcalRemainMobile } from "./helpers.mjs";

test.describe.serial("Mobile — luồng hằng ngày (giao diện app mới)", () => {
  let page;
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
    page.on("dialog", (d) => d.accept());
  });

  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  test("đăng nhập → Hôm nay tự áp Lịch tuần (đúng 1 lần)", async () => {
    await login(page);
    const row = await waitDb(async () => { const r = await todayRow(); return r && r.meals.length === 2 ? r : null; }, "lịch tuần áp vào daily_logs");
    expect(row.meals.map((m) => m.meal_id)).toEqual(["sang", "trua"]);
    expect(row.total_cal).toBe(960);
    expect(row.eaten_meals).toEqual([]);
    await expect(page.getByText("Bữa trưa").first()).toBeVisible();
  });

  let remainAfterTick;
  test("tick Đã ăn bữa sáng → lưu DB, kcal còn lại giảm đúng 450", async () => {
    const before = await kcalRemainMobile(page);
    await page.getByTestId("eat-sang").click();
    await waitDb(async () => (await todayRow())?.eaten_meals?.includes("sang"), "eaten_meals có sang");
    await expect.poll(() => kcalRemainMobile(page)).toBe(before - 450);
    remainAfterTick = before - 450;
  });

  test("Nước: +1 ly rồi Hoàn tác", async () => {
    const plus = page.getByRole("button", { name: "Thêm 1 ly nước 250 ml" });
    await plus.click();
    await waitDb(async () => (await todayRow())?.water_ml === 250, "water 250");
    await plus.locator("..").getByRole("button", { name: "Hoàn tác" }).click();
    await waitDb(async () => (await todayRow())?.water_ml === 0, "water 0");
  });

  test("tải lại trang: dữ liệu còn, không áp Lịch tuần lần 2", async () => {
    await page.reload();
    await expect(page.getByTestId("kcal-remain")).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => kcalRemainMobile(page)).toBe(remainAfterTick);
    await page.waitForTimeout(1500);
    const row = await todayRow();
    expect(row.meals.length).toBe(2);
    expect(row.eaten_meals).toEqual(["sang"]);
  });

  test("Cân nặng: lưu 64,8 rồi cân lại 64,9 cùng ngày → vẫn 1 dòng", async () => {
    const s = S();
    await page.getByTestId("weight-tile").click();
    await page.getByTestId("weight-input").fill("64,8");
    await page.getByTestId("weight-save").click();
    await waitDb(async () => { const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`); return w.length === 1 && Number(w[0].kg) === 64.8; }, "weight 64.8");
    await page.getByTestId("weight-input").fill("64,9");
    await page.getByTestId("weight-save").click();
    await waitDb(async () => { const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`); return w.length === 1 && Number(w[0].kg) === 64.9; }, "weight 64.9, vẫn 1 dòng");
    const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`);
    expect(w[0].logged_date).toBe(s.today);
    expect(w[0].week).toBe(1);
  });

  test("về Hôm nay, bỏ tick bữa sáng → eaten rỗng, kcal còn lại trở về", async () => {
    await nav("Hôm nay").click();
    await page.getByTestId("eat-sang").click();
    await waitDb(async () => (await todayRow())?.eaten_meals?.length === 0, "eaten rỗng");
    await expect.poll(() => kcalRemainMobile(page)).toBe(remainAfterTick + 450);
  });
});
