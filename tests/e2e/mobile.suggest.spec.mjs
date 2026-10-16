import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, swipeDown, openLogFor } from "./helpers.mjs";
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
    // Thanh giờ iPhone: không còn lớp phủ màu riêng (16/10) — hiện đúng nền phía sau
    await expect(page.getByTestId("ios-top-cover")).toHaveCount(0);
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
    // Phần còn lại trong ngày + macro từng lựa chọn + chỉnh khẩu phần
    await expect(page.getByTestId("suggest-day")).toContainText("Còn");
    await expect(page.getByTestId("suggest-macro").first()).toContainText("Đ ");
    const apply = page.getByTestId("suggest-apply");
    const t1 = await apply.innerText();
    await tap(page.getByTestId("suggest-k-1.2"));
    await expect(apply).not.toHaveText(t1);
    await page.screenshot({ path: "shots/goi-y-mon.png" });
    await tap(page.getByTestId("suggest-apply"));
    await expect(page.getByTestId("suggest-sheet")).toHaveCount(0);
    await waitDb(async () => ((await todayRow())?.meals || []).some((m) => m.meal_id === mealId && (m.items || []).length > 0), "ghi món gợi ý vào bữa");

    // Sheet Ghi bữa: khối "Gợi ý cho bữa" (≤3, cùng thuật toán) thay khối "Ăn lại"; bấm + là ghi
    const other = mealId === "toi" ? "sang" : "toi";
    await openLogFor(page, other);
    await expect(page.getByTestId("log-suggest")).toBeVisible();
    expect(await page.getByTestId("log-suggest-add").count()).toBeLessThanOrEqual(3);
    await page.screenshot({ path: "shots/ghi-bua-goi-y.png" });
    await tap(page.getByTestId("log-suggest-add").first());
    // 17/10 (bản vẽ 113): + của Gợi ý cho bữa đưa món vào giỏ, ghi bằng nút Ghi của giỏ
    await expect(page.getByTestId("log-tray-row").first()).toBeVisible();
    expect(((await todayRow())?.meals || []).some((m) => m.meal_id === other && (m.items || []).length > 0)).toBe(false);
    await tap(page.getByTestId("log-tray-save"));
    await waitDb(async () => ((await todayRow())?.meals || []).some((m) => m.meal_id === other && (m.items || []).length > 0), "ghi gợi ý từ sheet Ghi bữa");
  } finally {
    if (saved) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({ meals: saved.meals, eaten_meals: saved.eaten_meals, total_cal: saved.total_cal, total_protein: saved.total_protein, total_carb: saved.total_carb, total_fat: saved.total_fat }) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (savedTpl) { const { id, ...row } = savedTpl; void id; await rest("weekly_templates", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) }); }
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await ctx.close();
  }
});

// Thẻ đến giờ (16/10): bữa chưa có món → hiện sẵn gợi ý hợp nhất + nút "Ghi · X kcal" ghi 1 chạm (có Hoàn tác);
// "Xem … lựa chọn" vẫn mở sheet Gợi ý món.
test("Hôm nay: Ghi gợi ý hợp nhất 1 chạm ở thẻ đến giờ + Hoàn tác", async ({ browser }) => {
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
    if (savedTpl) await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${key}`, { method: "DELETE" });
    if (saved) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({ meals: [], eaten_meals: [], total_cal: 0, total_protein: 0, total_carb: 0, total_fat: 0 }) });
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await rest("daily_logs", { method: "POST", body: JSON.stringify({ user_id: s.uid, log_date: past, day_type: "train",
      meals: IDS.map((id) => ({ meal_id: id, items: foods[id] })), eaten_meals: IDS, total_cal: 2000 }) });

    await login(page);
    const apply = page.getByTestId("focus-suggest-apply");
    await expect(apply).toBeVisible();
    await expect(apply).toContainText(/Ghi · [\d.]+ kcal/);
    await expect(page.getByTestId("focus-suggest-foods")).not.toHaveText("");
    await expect(page.getByTestId("focus-suggest")).toContainText("lựa chọn");
    // Bữa ở thẻ đến giờ: dòng thời gian không còn nút + trùng
    await expect(page.getByTestId("meal-row-now").getByRole("button", { name: /^Ghi / })).toHaveCount(0);
    await page.screenshot({ path: "shots/the-den-gio-goi-y.png" });
    const mealId = await apply.getAttribute("data-meal");
    await tap(apply); // 1 chạm — không mở sheet
    await expect(page.getByTestId("suggest-sheet")).toHaveCount(0);
    await waitDb(async () => { const r = await todayRow(); return ((r?.meals || []).find((m) => m.meal_id === mealId)?.items || []).length > 0 && (r.eaten_meals || []).includes(mealId); }, "ghi gợi ý 1 chạm + đã ăn");
    await expect(page.getByTestId("toast")).toContainText("Đã ghi");
    await tap(page.getByTestId("toast-action"));
    await waitDb(async () => !((await todayRow())?.meals || []).some((m) => m.meal_id === mealId && (m.items || []).length), "Hoàn tác xoá bữa vừa ghi");
  } finally {
    if (saved) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({ meals: saved.meals, eaten_meals: saved.eaten_meals, total_cal: saved.total_cal, total_protein: saved.total_protein, total_carb: saved.total_carb, total_fat: saved.total_fat }) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (savedTpl) { const { id, ...row } = savedTpl; void id; await rest("weekly_templates", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) }); }
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await ctx.close();
  }
});
