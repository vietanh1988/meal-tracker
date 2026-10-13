import { test, expect } from "@playwright/test";
import { login, todayRow, waitDb, rest, S } from "./helpers.mjs";

// Chạy sau mobile (workers=1, project pc chạy sau) — dữ liệu hôm nay đã có 2 bữa.
test("PC: tick bữa trưa → Nhật ký hiện bữa → Xoá bữa khỏi nhật ký", async ({ page }) => {
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  // Tự chuẩn bị dữ liệu: hôm nay có 2 bữa chưa ăn (không phụ thuộc bài mobile chạy trước)
  const s = S();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({
    meals: [
      { meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Phở bò", gram: 400, cal: 450, p: 25, c: 55, f: 12 }] },
      { meal_id: "trua", meal_name: "Bữa trưa", items: [{ food: "Cơm trắng", gram: 200, cal: 260, p: 5, c: 57, f: 1 }] },
    ], eaten_meals: [] }) });
  await login(page);
  await page.getByRole("button", { name: "✓ Đã ăn" }).first().click();
  await waitDb(async () => (await todayRow())?.eaten_meals?.length === 1, "tick 1 bữa");
  const eatenId = (await todayRow()).eaten_meals[0];

  await page.getByText("Nhật ký", { exact: true }).first().click();
  await expect(page.getByText("📓 Nhật ký bữa ăn")).toBeVisible();
  const name = eatenId === "trua" ? "Bữa trưa" : "Bữa sáng";
  await page.getByText(name, { exact: true }).first().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "🗑 Xoá bữa" }).click();
  await waitDb(async () => { const r = await todayRow(); return r && !r.meals.some((m) => m.meal_id === eatenId) && r.eaten_meals.length === 0; }, "đã xoá bữa");
  const r = await todayRow();
  expect(r.meals.length).toBe(1);
});
