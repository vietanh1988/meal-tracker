import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, swipeDown } from "./helpers.mjs";
import { addDays, templateKeyOf } from "../../src/lib/dateVN.js";

// Gợi ý món ở thẻ bữa đến giờ (16/10): bấm KHÔNG tự áp nữa — mở sheet ≤5 lựa chọn, chọn rồi mới ghi vào bữa.
test("Hôm nay: Gợi ý món → sheet chọn → ghi vào bữa", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const past = addDays(s.today, -2);
  const key = templateKeyOf(s.today);
  const saved = await todayRow();
  const savedTpl = (await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${key}&select=*`))[0] || null;
  const it = (food, gram, cal, p, c, f) => ({ food, gram, cal, p, c, f });
  const IDS = ["sang", "phu_sang", "trua", "phu_chieu", "pre", "post", "toi"];
  const foods = { sang: [it("phở bò", 400, 340, 26, 39, 8)], phu_sang: [it("chuối", 120, 107, 1, 27, 0)], trua: [it("cơm trắng", 250, 325, 6, 70, 1), it("gà luộc", 150, 250, 38, 0, 10)],
    phu_chieu: [it("sữa chua", 100, 60, 4, 6, 3)], pre: [it("chuối", 150, 134, 2, 34, 0)], post: [it("sữa tươi", 250, 160, 8, 12, 8)], toi: [it("cơm trắng", 200, 260, 5, 56, 1), it("thịt kho", 150, 248, 22, 3, 16)] };
  try {
    // Hôm nay trống (bỏ lặp lại của thứ hôm nay để app không tự chép vào), 2 ngày trước đã ăn đủ các bữa
    if (savedTpl) await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${key}`, { method: "DELETE" });
    if (saved) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({ meals: [], eaten_meals: [], total_cal: 0, total_protein: 0, total_carb: 0, total_fat: 0 }) });
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await rest("daily_logs", { method: "POST", body: JSON.stringify({ user_id: s.uid, log_date: past, day_type: "train",
      meals: IDS.map((id) => ({ meal_id: id, items: foods[id] })), eaten_meals: IDS, total_cal: 2000 }) });

    await login(page);
    // Dải che thanh giờ: màu header khi header còn trên màn, màu nền nhạt khi đã cuộn qua header
    const cover = page.getByTestId("ios-top-cover");
    await expect(cover).toHaveAttribute("data-tone", "header");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(cover).toHaveAttribute("data-tone", "light");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(cover).toHaveAttribute("data-tone", "header");
    const btn = page.getByTestId("focus-suggest");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText("lựa chọn");
    const mealId = await btn.getAttribute("data-meal");
    await tap(btn);
    await expect(page.getByTestId("suggest-sheet")).toBeVisible();
    const n = await page.getByTestId("suggest-opt").count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(5);
    // Mở sheet KHÔNG được tự ghi vào bữa
    expect(((await todayRow())?.meals || []).some((m) => m.meal_id === mealId && (m.items || []).length)).toBe(false);
    // Vuốt xuống để đóng, mở lại
    await swipeDown(page.getByTestId("suggest-sheet"));
    await expect(page.getByTestId("suggest-sheet")).toHaveCount(0);
    await tap(btn);
    await expect(page.getByTestId("suggest-sheet")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "shots/goi-y-mon.png" });
    await tap(page.getByTestId("suggest-apply"));
    await expect(page.getByTestId("suggest-sheet")).toHaveCount(0);
    await waitDb(async () => ((await todayRow())?.meals || []).some((m) => m.meal_id === mealId && (m.items || []).length > 0), "ghi món gợi ý vào bữa");
  } finally {
    if (saved) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({ meals: saved.meals, eaten_meals: saved.eaten_meals, total_cal: saved.total_cal, total_protein: saved.total_protein, total_carb: saved.total_carb, total_fat: saved.total_fat }) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (savedTpl) { const { id, ...row } = savedTpl; void id; await rest("weekly_templates", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) }); }
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await ctx.close();
  }
});
