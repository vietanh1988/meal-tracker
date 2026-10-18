import { test, expect } from "@playwright/test";
import { rest, S, login, waitDb } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

// Bản vẽ 133a–e (18/10): khách giảm cân — tab Thực đơn Hôm nay / Ngày mai, app tự lên thực đơn KHÔNG gọi AI,
// Đổi món (món calo gần bằng từ kho), Món bạn không ăn. Trả lại hồ sơ + xoá dòng ngày mai khi xong.
const KEEP = "goal_kg,goal_type,exercise_type,ui_mode,cut_pace";

test("Giảm cân: Thực đơn ngày mai tự lên (không AI), Đổi món, Món không ăn", async ({ page }) => {
  const s = S();
  const tomorrow = addDays(s.today, 1);
  const orig = (await rest(`profiles?id=eq.${s.uid}&select=${KEEP},kg`))[0];
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${tomorrow}`, { method: "DELETE" });
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ui_mode: "loss", goal_type: "cut", exercise_type: "none", cut_pace: "mid", goal_kg: Math.max(45, Math.round(Number(orig.kg) - 6)) }) });
  const ai = [];
  page.on("request", (r) => { if (r.url().includes("/functions/v1/")) ai.push(r.url()); });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  try {
    await login(page);
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Thực đơn" }).click();
    await expect(page.getByTestId("loss-menu")).toBeVisible();
    await page.getByTestId("loss-menu-tomorrow").click();
    await expect(page.getByTestId("loss-menu-meal").first()).toBeVisible({ timeout: 15_000 });
    const row = await waitDb(async () => {
      const r = (await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${tomorrow}&select=meals,eaten_meals`))[0];
      return r && (r.meals || []).filter((m) => (m.items || []).length).length >= 2 ? r : null;
    }, "ngày mai có thực đơn tự lên");
    expect(row.eaten_meals || []).toEqual([]);
    await page.screenshot({ path: "shots/loss-menu-ngay-mai.png", fullPage: true });

    // Đổi món: bấm Đổi ở bữa đầu tiên → sheet có món thay → đổi → DB đổi món
    const first = page.getByTestId("menu-swap").first();
    const mealId = await first.getAttribute("data-meal");
    const before = JSON.stringify(row.meals.find((m) => m.meal_id === mealId).items.map((i) => i.food));
    await first.click();
    await expect(page.getByTestId("swap-sheet")).toBeVisible();
    await page.screenshot({ path: "shots/loss-doi-mon.png" });
    if (await page.getByTestId("swap-opt").count()) {
      await page.getByTestId("swap-apply").click();
      await expect(page.getByTestId("swap-sheet")).toHaveCount(0);
      await waitDb(async () => {
        const r = (await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${tomorrow}&select=meals`))[0];
        return JSON.stringify((r.meals.find((m) => m.meal_id === mealId)?.items || []).map((i) => i.food)) !== before;
      }, "món đã đổi");
    } else {
      await expect(page.getByTestId("swap-empty")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Đóng" }).click();
    }

    // Món bạn không ăn: chọn Hải sản → lưu → dòng hiện "Hải sản"
    await page.getByTestId("loss-menu-avoid").click();
    await expect(page.getByTestId("avoid-sheet")).toBeVisible();
    await page.getByTestId("avoid-chip-Hải sản").click();
    await expect(page.getByTestId("avoid-chip-Hải sản")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/loss-mon-khong-an.png" });
    await page.getByTestId("avoid-save").click();
    await expect(page.getByTestId("loss-menu-avoid")).toContainText("Hải sản");

    // Bản vẽ 134b: tab Tôi chữ đời thường cho khách giảm cân
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
    await expect(page.getByTestId("me-goals")).toContainText("Mục tiêu & tốc độ giảm");
    await expect(page.getByTestId("me-schedule")).toContainText("Giờ ăn");
    await expect(page.getByTestId("me-schedule")).toContainText(/\d bữa · \d{1,2}:\d{2}–\d{1,2}:\d{2}/);
    await page.screenshot({ path: "shots/loss-toi.png", fullPage: true });
    // 18/10: ghi hành vi (app_events) — mở app, xem thực đơn ngày mai, lưu món không ăn
    await waitDb(async () => {
      const r = await rest(`app_events?user_id=eq.${s.uid}&select=name,mode&order=at.desc&limit=100`);
      const n = new Set(r.map((x) => x.name));
      return n.has("app_open") && n.has("menu_tomorrow") && n.has("avoid_save") && r.every((x) => x.mode === "loss" || x.mode === null) ? r : null;
    }, "app_events có app_open, menu_tomorrow, avoid_save", 15_000);
    expect(ai, "không gọi AI").toEqual([]);
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${tomorrow}`, { method: "DELETE" });
    const { kg, ...back } = orig;
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(back) });
  }
});
