// 31/10 (chốt bản vẽ "Cảnh báo ăn uống"): ăn dở mà đã vượt calo → thẻ cảnh báo gọn trên Hôm nay (vàng cam / đỏ), có gợi ý bữa còn lại.
import { test, expect } from "@playwright/test";
import { login, S, rest, todayRow } from "./helpers.mjs";

test("Hôm nay: ăn vượt calo hiện thẻ cảnh báo", async ({ browser }) => {
  test.setTimeout(90_000);
  const s = S();
  const before = await todayRow();
  const put = (row) => rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  try {
    // 1 bữa đã ăn 6.000 kcal → chắc chắn vượt mục tiêu > 20% (đỏ), các bữa khác chưa ăn → thẻ gọn
    await put({ user_id: s.uid, log_date: s.today, day_type: before?.day_type || "train", meals: [{ meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Món thử", gram: 1500, cal: 6000, p: 200, c: 600, f: 300 }] }], eaten_meals: ["sang"], water_ml: before?.water_ml || 0 });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    const card = page.getByTestId("day-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toHaveAttribute("data-full", "0");
    await expect(card).toHaveAttribute("data-tone", "bad");
    await expect(page.getByTestId("day-card-label")).toHaveText(/^ĐÃ VƯỢT [\d.]+ KCAL/);
    // khung thẻ theo bản vẽ: bo 20, ô icon 48
    const look = await card.evaluate((c) => ({ r: getComputedStyle(c).borderRadius, icon: Math.round(c.firstElementChild.firstElementChild.getBoundingClientRect().width), w: Math.round(c.getBoundingClientRect().width) }));
    expect(look.r).toBe("20px");
    expect(look.icon).toBe(48);
    expect(look.w).toBe(390 - 24);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "shots/day-warn.png" });
    await ctx.close();
  } finally {
    if (before) await put({ user_id: s.uid, log_date: s.today, day_type: before.day_type, meals: before.meals, eaten_meals: before.eaten_meals, water_ml: before.water_ml });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
  }
});
