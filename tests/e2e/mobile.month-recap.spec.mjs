import { test, expect } from "@playwright/test";
import { login, rest, S } from "./helpers.mjs";
import { prevMonth } from "../../src/lib/monthRecap.js";

// Bản vẽ 136b–c: Tiến độ › Nhật ký › Tháng › tháng trước → nút Tổng kết tháng → màn tổng kết → Chia sẻ (ảnh vẽ bằng canvas).
// Dữ liệu giả cho tháng trước: 10 ngày ghi bữa + 2 lần cân; cuối bài xoá đúng phần đã thêm.
test("Tổng kết tháng: mở từ Nhật ký tháng trước, có số liệu, ảnh chia sẻ", async ({ page }) => {
  const s = S();
  const pm = prevMonth(s.today.slice(0, 7));
  const d = (n) => `${pm}-${String(n).padStart(2, "0")}`;
  const wDates = [d(2), d(25)];
  const oldW = await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})&select=*`);
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  let added = [];
  try {
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})`, { method: "DELETE" });
    await rest("weight_logs", { method: "POST", body: JSON.stringify([[wDates[0], 85.0], [wDates[1], 83.8]].map(([dt, kg]) => ({ user_id: s.uid, logged_date: dt, kg, week: 1 }))) });
    const meals = [{ meal_id: "trua", meal_name: "trua", items: [{ food: "Cơm gà", gram: 300, cal: 500, p: 30, c: 60, f: 12 }] }];
    added = await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ user_id: s.uid, log_date: d(n), day_type: "train", meals, eaten_meals: ["trua"], total_cal: 500 }))) });

    await login(page);
    const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
    await nav("Tôi").click();
    await page.getByTestId("me-diary").click();
    await expect(page.getByTestId("seg-diary")).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Tháng", exact: true }).click();
    await page.getByRole("button", { name: "Tháng trước" }).click();
    await page.getByTestId("diary-recap").click();
    await expect(page.getByTestId("recap-screen")).toBeVisible();
    await expect(page.getByTestId("recap-hero")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("recap-delta")).toContainText("−");
    await expect(page.getByTestId("recap-logged")).toContainText(/^.*1\d\//);
    await expect(page.getByTestId("recap-streak")).toContainText(/\d+ ngày/);
    await page.screenshot({ path: "shots/tong-ket-thang.png", fullPage: true });
    await page.getByTestId("recap-to-share").click();
    await expect(page.getByTestId("recap-share-img").locator("img")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("recap-hide-kg").click();
    await expect(page.getByTestId("recap-hide-kg")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/tong-ket-chia-se.png" });
    expect(errs, "không lỗi trang").toEqual([]);
  } finally {
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})`, { method: "DELETE" });
    if (oldW.length) await rest("weight_logs", { method: "POST", body: JSON.stringify(oldW.map(({ id, ...r }) => r)) });
    const ds = (added || []).map((r) => r.log_date);
    if (ds.length) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=in.(${ds.join(",")})`, { method: "DELETE" });
  }
});
