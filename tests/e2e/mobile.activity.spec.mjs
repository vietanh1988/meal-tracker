import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, kcalRemainMobile } from "./helpers.mjs";

// Vận động thêm (bản vẽ 130a–b): khách Tăng cơ thêm Đi bộ 45 phút → mục tiêu hôm nay + đúng số kcal ước tính,
// header ghi "X + Y vận động", lưu bảng activity_logs, tải lại vẫn còn; × xoá → mục tiêu về như cũ.
test("Vận động thêm: đi bộ 45 phút cộng vào mục tiêu (tăng cơ), lưu, xoá", async ({ page }) => {
  const s = S();
  const t = s.today;
  const [before] = await rest(`profiles?id=eq.${s.uid}&select=goal_type,exercise_type`);
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  try {
    await rest(`activity_logs?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ goal_type: "bulk", exercise_type: "gym" }) });
    await login(page);
    const remain0 = await kcalRemainMobile(page);
    await expect(page.getByTestId("activity-row")).toBeVisible();
    await tap(page.getByTestId("activity-add"));
    await expect(page.getByTestId("activity-sheet")).toBeVisible();
    await page.getByTestId("activity-type-walk").click();
    await page.getByTestId("activity-min-45").click();
    const kcal = Number(await page.getByTestId("activity-result").getAttribute("data-kcal"));
    expect(kcal).toBeGreaterThan(80);
    await expect(page.getByTestId("activity-result")).toContainText("Tăng cơ: cộng vào mục tiêu");
    await page.screenshot({ path: "shots/activity-sheet.png" });
    await page.getByTestId("activity-save").click();
    await expect(page.getByTestId("activity-sheet")).toHaveCount(0);
    await expect(page.getByTestId("activity-sub")).toContainText(`Đi bộ 45 phút · +${kcal} kcal`);
    await expect(page.getByTestId("goal-sub")).toContainText(`+ ${kcal} vận động`);
    await expect.poll(() => kcalRemainMobile(page)).toBe(remain0 + kcal);
    await waitDb(async () => { const r = await rest(`activity_logs?user_id=eq.${s.uid}&log_date=eq.${t}&select=items`); return r[0] && r[0].items.length === 1 && r[0].items[0].kcal === kcal; }, "activity_logs có 1 dòng");
    await page.screenshot({ path: "shots/activity-today.png" });

    await page.reload();
    await expect(page.getByTestId("activity-sub")).toContainText("Đi bộ 45 phút", { timeout: 20_000 });

    await tap(page.getByTestId("activity-clear"));
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("activity-add")).toBeVisible();
    await expect.poll(() => kcalRemainMobile(page)).toBe(remain0);
    await waitDb(async () => (await rest(`activity_logs?user_id=eq.${s.uid}&log_date=eq.${t}&select=items`)).length === 0, "đã xoá dòng vận động");
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`activity_logs?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(before) });
  }
});
