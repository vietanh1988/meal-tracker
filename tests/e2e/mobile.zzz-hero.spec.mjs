// 23/11 (chủ dự án: "vẫn 2 màn đó nhưng chụp theo giao diện mới nhất"): chụp màn THẬT cho 2 điện thoại ở banner trang chủ web
// (web/public/img/app-today.webp + app-menu.webp). Chỉ chạy trên nhánh có chữ "hero"; ảnh vào shots/hero/, chép sang web bằng
// scripts/web/hero_shots.py. Dữ liệu giả, trả lại như cũ khi xong.
import { test, expect } from "@playwright/test";
import fs from "fs";
import { login, S, rest, todayRow } from "./helpers.mjs";

const RUN = /hero/.test(process.env.GITHUB_REF_NAME || process.env.HERO_SHOTS || "");
test("Ảnh màn thật cho banner trang chủ web", async ({ browser }) => {
  test.skip(!RUN, "chỉ chạy trên nhánh hero");
  test.setTimeout(120_000);
  const s = S();
  // 9:30 sáng giờ VN: bữa sáng đã ăn, thẻ Pi gợi bữa tiếp theo
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(`${s.today}T09:30:00+07:00`));
  fs.mkdirSync("shots/hero", { recursive: true });
  const admin = (body) => fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { method: "PUT", headers: { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const prof = (await rest(`profiles?id=eq.${s.uid}&select=goal_type,diet_strategy,ui_mode,macro_manual`))[0];
  const meta = (await admin({})).user_metadata || {};
  const before = await todayRow();
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ goal_type: "cut", diet_strategy: "balanced", ui_mode: "loss", macro_manual: null }) });
    await admin({ user_metadata: { ...meta, username: "Lan" } });
    const it = (food, gram, cal, p, c, f) => ({ food, gram, cal, p, c, f });
    const meals = [
      { meal_id: "sang", meal_name: "Bữa sáng", items: [it("Phở bò tái", 450, 420, 24, 52, 11)] },
      { meal_id: "trua", meal_name: "Bữa trưa", items: [it("Cơm gà luộc", 320, 520, 32, 66, 12), it("Canh rau", 200, 40, 2, 6, 1)] },
      { meal_id: "phu_chieu", meal_name: "Phụ chiều", items: [it("Sữa chua", 100, 100, 4, 14, 3)] },
      { meal_id: "toi", meal_name: "Bữa tối", items: [it("Bún cá", 450, 430, 26, 58, 9), it("Rau sống", 80, 20, 1, 3, 0)] },
    ];
    await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before?.day_type || "rest", meals, eaten_meals: ["sang"], water_ml: 750 }) });

    await login(page);
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2500); // Pi + ảnh món tải xong
    await page.screenshot({ path: "shots/hero/app-today.png" });

    await page.getByRole("button", { name: "Thực đơn", exact: true }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "shots/hero/app-menu.png" });
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(prof) });
    await admin({ user_metadata: meta });
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(before) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    await ctx.close();
  }
});
