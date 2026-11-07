// 08/11 (chủ dự án duyệt bản vẽ "Pi khoẻ dần lên"): thanh Sức khoẻ Pi trên thẻ Hôm nay theo 14 ngày gần nhất.
// Bỏ bê → nhạt màu + "z z" + câu rủ ghi bữa; chăm đều → lấp lánh + "N ngày khoẻ". Không béo / gầy.
import { test, expect } from "@playwright/test";
import { login, S, rest } from "./helpers.mjs";
import { addDays, todayVN } from "../../src/lib/dateVN.js";

const meal = (id, p = 200) => ({ meal_id: id, meal_name: id, items: [{ food: "Ức gà", gram: 300, cal: 500, p, c: 30, f: 10 }] });
const full = (uid, d) => ({ user_id: uid, log_date: d, day_type: "rest", meals: ["sang", "trua", "toi"].map(meal), eaten_meals: ["sang", "trua", "toi"], total_cal: 1500 });
const one = (uid, d) => ({ user_id: uid, log_date: d, day_type: "rest", meals: [meal("trua", 5)], eaten_meals: ["trua"], total_cal: 500 });

test("Sức khoẻ Pi: bỏ 2 ngày → mệt; chăm 10 ngày → khoẻ rực", async ({ browser }) => {
  test.setTimeout(120_000);
  const s = S();
  const t = todayVN();
  const span = Array.from({ length: 15 }, (_, i) => addDays(t, -i));
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const keep = await rest(`daily_logs?user_id=eq.${s.uid}&log_date=in.(${span.join(",")})&select=*`);
  const put = (rows) => rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
  const wipe = () => rest(`daily_logs?user_id=eq.${s.uid}&log_date=in.(${span.join(",")})`, { method: "DELETE" });
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    // ① 3 ngày trước ghi 1 bữa ít đạm (không cộng), 2 ngày qua bỏ trống, hôm nay chưa ghi → 50 − 20 − 20 = 10%
    await wipe();
    await put([one(s.uid, addDays(t, -3))]);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await login(page);
    const bar = page.getByTestId("pet-health");
    await expect(bar).toHaveAttribute("data-stage", "met", { timeout: 20_000 });
    await expect(bar).toHaveAttribute("data-pct", "10");
    await expect(bar).toContainText("10%");
    await expect(page.getByTestId("pet-health-zz")).toBeVisible();
    await expect(page.getByTestId("pet-health-say")).toContainText("buồn ngủ");
    await expect(page.getByTestId("pet-health-spark")).toHaveCount(0);
    const wrap = await page.getByTestId("pet-today-wrap").boundingBox();
    expect(wrap.x + wrap.width).toBeLessThanOrEqual(390);
    await page.getByTestId("pet-today-wrap").screenshot({ path: "shots/pi-khoe-met.png" });

    // ② 10 ngày liền đủ bữa, đủ đạm + hôm nay đủ → 100%, khoẻ rực, chip "N ngày khoẻ"
    await wipe();
    await put([...Array.from({ length: 10 }, (_, i) => full(s.uid, addDays(t, -10 + i)))]);
    await page.reload();
    await expect(bar).toHaveAttribute("data-stage", "khoe", { timeout: 20_000 });
    await expect(bar).toHaveAttribute("data-pct", "100");
    await expect(page.getByTestId("pet-health-spark")).toBeAttached();
    await expect(page.getByTestId("pet-health-streak")).toContainText("ngày khoẻ");
    await expect(page.getByTestId("pet-health-zz")).toHaveCount(0);
    await page.getByTestId("pet-today-wrap").screenshot({ path: "shots/pi-khoe-ruc.png" });
    expect(errs).toEqual([]);
    await ctx.close();
  } finally {
    await wipe();
    if (keep.length) await put(keep.map(({ id, ...r }) => r));
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
  }
});
