import { test, expect } from "@playwright/test";
import { login, todayRow, rest, S, waitDb, kcalRemainMobile, tap } from "./helpers.mjs";

test.describe.serial("Mobile — luồng hằng ngày (giao diện app mới)", () => {
  let page;
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
    page.on("dialog", (d) => d.accept());
  });

  test.afterEach(async ({}, info) => {
    if (info.status !== info.expectedStatus && page) {
      const txt = await page.locator("body").innerText().catch(() => "");
      console.log("=== MÀN HÌNH LÚC LỖI ===\n" + txt.slice(0, 1500));
    }
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

  test("dòng thời gian có ĐỦ bữa (kể cả bữa ở thẻ đến giờ), tên có dấu", async () => {
    // meal_config train: sang, trua, phu_chieu, pre, toi → 2 bữa có món + 3 bữa trống có nút Ghi
    for (const id of ["sang", "trua"]) await expect(page.getByTestId(`eat-${id}`)).toHaveCount(1);
    for (const n of ["phụ chiều", "trước tập", "bữa tối"]) await expect(page.getByRole("button", { name: `Ghi ${n}` })).toHaveCount(1);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/\b(trua|phu_chieu|sang|toi)\b/);
  });

  let remainAfterTick;
  test("tick Đã ăn bữa sáng → lưu DB, kcal còn lại giảm đúng 450", async () => {
    const before = await kcalRemainMobile(page);
    await tap(page.getByTestId("eat-sang"));
    await waitDb(async () => (await todayRow())?.eaten_meals?.includes("sang"), "eaten_meals có sang");
    await expect.poll(() => kcalRemainMobile(page)).toBe(before - 450);
    remainAfterTick = before - 450;
  });

  test("Nước: +1 ly rồi Hoàn tác", async () => {
    const plus = page.getByRole("button", { name: "Thêm 1 ly nước 250 ml" });
    await tap(plus);
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
    await tap(page.getByTestId("weight-tile"));
    await page.getByTestId("weight-input").fill("64,8");
    await page.getByTestId("weight-save").click();
    await waitDb(async () => { const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`); return w.length === 1 && Number(w[0].kg) === 64.8; }, "weight 64.8");
    await expect(page.getByTestId("weight-input")).toHaveValue("");   // app xoá ô sau khi lưu xong
    await page.getByTestId("weight-input").fill("64,9");
    await page.getByTestId("weight-save").click();
    await waitDb(async () => { const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`); return w.length === 1 && Number(w[0].kg) === 64.9; }, "weight 64.9, vẫn 1 dòng");
    const w = await rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`);
    expect(w[0].logged_date).toBe(s.today);
    expect(w[0].week).toBe(1);
  });

  test("về Hôm nay, bỏ tick bữa sáng → eaten rỗng, đã ăn về 0", async () => {
    await nav("Hôm nay").click();
    await tap(page.getByTestId("eat-sang"));
    await waitDb(async () => (await todayRow())?.eaten_meals?.length === 0, "eaten rỗng");
    // Cân nặng vừa đổi → mục tiêu kcal đổi theo, nên kiểm "đã ăn 0 / mục tiêu" thay vì số cũ
    await expect(page.getByText(/Ngày (tập|nghỉ) · 0 \//)).toBeVisible();
  });
});
