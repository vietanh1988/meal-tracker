import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

// Giảm cân (bản vẽ 126–128): thẻ Kiểm tra tuần ở Hôm nay → Bớt 100 kcal (lưu cal_offset), Mục tiêu hiện
// "Điều chỉnh theo tuần" (bấm về 0), chọn Tốc độ giảm; khách Không tập: ô Kế hoạch ở header + thẻ mẹo đi bộ.
// Dữ liệu giả: 3 lần cân 14 ngày gần như đứng yên + 6 ngày ghi bữa; cuối bài trả hồ sơ / xoá dữ liệu đã thêm.
test("Kiểm tra tuần: cân đứng → bớt 100 kcal; tốc độ giảm; không tập", async ({ page }) => {
  const s = S();
  const t = s.today;
  const COLS = "goal_type,goal_kg,kg,exercise_type,cut_pace,cal_offset,cal_offset_date,checkin_date";
  const [before] = await rest(`profiles?id=eq.${s.uid}&select=${COLS}`);
  const wDates = [-13, -7, -1].map((d) => addDays(t, d));
  const oldW = await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})&select=*`);
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  let addedDays = [];
  try {
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})`, { method: "DELETE" });
    await rest("weight_logs", { method: "POST", body: JSON.stringify([[wDates[0], 85.2], [wDates[1], 85.1], [wDates[2], 85.0]].map(([d, kg]) => ({ user_id: s.uid, logged_date: d, kg, week: 1 }))) });
    const meals = [{ meal_id: "trua", meal_name: "trua", items: [{ food: "Cơm gà", gram: 300, cal: 500, p: 30, c: 60, f: 12 }] }];
    addedDays = await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify([2, 3, 4, 5, 6, 7].map((d) => ({ user_id: s.uid, log_date: addDays(t, -d), day_type: "train", meals, eaten_meals: ["trua"], total_cal: 500 }))) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ goal_type: "cut", goal_kg: 75, kg: 85, exercise_type: "gym", cut_pace: "mid", cal_offset: 0, cal_offset_date: null, checkin_date: null }) });
    const prof = async () => (await rest(`profiles?id=eq.${s.uid}&select=${COLS}`))[0];

    await login(page);
    const card = page.getByTestId("checkin-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toHaveAttribute("data-kind", "slow");
    await expect(card).toContainText("Tuần này cân gần như đứng yên");
    await expect(card).toContainText(/[4-7]\/7 ngày/);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "shots/checkin-slow.png" });
    await tap(page.getByTestId("checkin-apply"));
    await waitDb(async () => { const p = await prof(); return p.cal_offset === -100 && p.checkin_date === t; }, "cal_offset = −100, checkin_date = hôm nay");
    await expect(card).toHaveCount(0);

    // Mục tiêu: dòng Điều chỉnh theo tuần + Tốc độ giảm
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
    await tap(page.getByTestId("me-profile-card"));
    await expect(page.getByTestId("goals-offset")).toContainText("−100");
    await expect(page.getByTestId("goals-pace-mid")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("goals-speed")).toContainText("Đạt 75 kg");
    await expect(page.getByTestId("goals-months")).toHaveCount(0);
    await page.screenshot({ path: "shots/goals-pace.png", fullPage: true });
    const cal = async () => Number(await page.getByTestId("goals-macro").getAttribute("data-cal"));
    const calMid = await cal();
    await tap(page.getByTestId("goals-pace-fast"));
    await waitDb(async () => (await prof()).cut_pace === "fast", "cut_pace = fast");
    await expect.poll(cal).toBeLessThan(calMid);
    await tap(page.getByTestId("goals-offset"));
    await waitDb(async () => (await prof()).cal_offset === 0, "cal_offset = 0");
    await expect(page.getByTestId("goals-offset")).toHaveCount(0);

    // Không tập: header bỏ Ngày tập / nghỉ → Kế hoạch; thẻ mẹo đi bộ
    await tap(page.getByTestId("goals-exercise"));
    await tap(page.getByTestId("goals-exercise-none"));
    await waitDb(async () => (await prof()).exercise_type === "none", "exercise_type = none");
    await page.reload();
    // Tải lại vẫn ở tab Tôi → về Hôm nay
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
    await expect(nav.getByRole("button", { name: "Hôm nay" })).toBeVisible({ timeout: 20_000 });
    await nav.getByRole("button", { name: "Hôm nay" }).click();
    await expect(page.getByTestId("plan-card")).toContainText("kg/tuần");
    await expect(page.getByTestId("today-header")).not.toContainText("Ngày nghỉ");
    await expect(page.getByTestId("walk-tip")).toBeVisible();
    await page.screenshot({ path: "shots/today-no-exercise.png" });
    await tap(page.getByTestId("walk-tip-close"));
    await expect(page.getByTestId("walk-tip")).toHaveCount(0);
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(before) });
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=in.(${wDates.join(",")})`, { method: "DELETE" });
    if (oldW.length) await rest("weight_logs", { method: "POST", body: JSON.stringify(oldW.map(({ id, ...r }) => r)) });
    const ds = (addedDays || []).map((r) => r.log_date);
    if (ds.length) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=in.(${ds.join(",")})`, { method: "DELETE" });
  }
});
