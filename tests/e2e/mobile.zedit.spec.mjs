import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

// Sửa / xoá / chuyển bữa (14/10): sửa gram, xoá món, xoá bữa, chuyển sang bữa khác (gộp, không ghi đè), chuyển sang ngày khác.
// Dùng dữ liệu HÔM NAY rồi trả lại như cũ ở cuối (các bài sau tự chuẩn bị dữ liệu riêng).
test("Sửa bữa: gram, xoá món, xoá bữa, chuyển bữa + chuyển ngày gộp món", async ({ browser }) => {
  const s = S();
  const y = addDays(s.today, -1);
  const row = async (d) => (await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${d}&select=meals,eaten_meals`))[0] || null;
  const meal = (r, id) => (r?.meals || []).find((m) => (m.meal_id || m.id) === id);
  const keepToday = await row(s.today);
  const keepY = await row(y);
  const put = async (d, body) => {
    if (await row(d)) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${d}`, { method: "PATCH", body: JSON.stringify(body) });
    else await rest("daily_logs", { method: "POST", body: JSON.stringify({ user_id: s.uid, log_date: d, day_type: "train", ...body }) });
  };
  await put(s.today, { eaten_meals: ["sang"], meals: [
    { meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Phở bò", gram: 400, cal: 400, p: 20, c: 50, f: 10 }, { food: "Trứng luộc", gram: 50, cal: 75, p: 6, c: 0, f: 5 }] },
    { meal_id: "trua", meal_name: "Bữa trưa", items: [{ food: "Bún chả", gram: 300, cal: 500, p: 25, c: 60, f: 15 }] },
    { meal_id: "toi", meal_name: "Bữa tối", items: [{ food: "Cơm trắng", gram: 200, cal: 260, p: 5, c: 57, f: 1 }] },
  ] });
  // Hôm qua: bữa tối đã có 1 món → chuyển sang phải GỘP, không mất món này
  await put(y, { eaten_meals: [], meals: [{ meal_id: "toi", meal_name: "Bữa tối", items: [{ food: "Canh chua", gram: 250, cal: 90, p: 6, c: 10, f: 2 }] }] });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try {
    await login(page);
    // 1) Sửa gram + xoá món
    await page.getByTestId("meal-foods-sang").click();
    await page.getByLabel("Gram phở bò").fill("200");
    await page.getByRole("button", { name: "Xoá trứng luộc" }).click();
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await waitDb(async () => { const m = meal(await row(s.today), "sang"); return m && m.items.length === 1 && Math.round(m.items[0].gram) === 200 && Math.round(m.items[0].cal) === 200; }, "sửa gram + xoá món");

    // 2) Xoá bữa
    await page.getByTestId("meal-foods-trua").click();
    await page.getByRole("button", { name: /Thêm tuỳ chọn/ }).click();
    await tap(page.getByTestId("edit-delete"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => !meal(await row(s.today), "trua"), "xoá bữa trưa");

    // 3) Chuyển Bữa sáng → Bữa tối cùng ngày: gộp với cơm, giữ "đã ăn" của bữa sáng
    await page.getByTestId("meal-foods-sang").click();
    await page.getByRole("button", { name: /Thêm tuỳ chọn/ }).click();
    await tap(page.getByTestId("edit-move-open"));
    await expect(page.getByTestId("move-sheet")).toBeVisible();
    await page.screenshot({ path: "shots/chuyen-bua.png" });
    await tap(page.getByTestId("move-meal-toi"));
    await tap(page.getByTestId("move-go"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => { const r = await row(s.today); const t = meal(r, "toi"); return !meal(r, "sang") && t && t.items.length === 2 && r.eaten_meals.includes("toi"); }, "gộp sáng vào tối");

    // 4) Chuyển Bữa tối hôm nay → hôm qua (đã có canh chua): gộp, không ghi đè
    await page.getByTestId("meal-foods-toi").click();
    await page.getByRole("button", { name: /Thêm tuỳ chọn/ }).click();
    await tap(page.getByTestId("edit-move-open"));
    await tap(page.getByTestId(`move-date-${y}`));
    await tap(page.getByTestId("move-go"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => {
      const t = meal(await row(y), "toi");
      const foods = (t?.items || []).map((i) => i.food).sort();
      return !meal(await row(s.today), "toi") && foods.join("|") === ["Canh chua", "Cơm trắng", "Phở bò"].sort().join("|");
    }, "chuyển sang hôm qua giữ cả 3 món");
  } finally {
    // Trả dữ liệu như cũ
    if (keepToday) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify(keepToday) });
    if (keepY) await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${y}`, { method: "PATCH", body: JSON.stringify(keepY) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${y}`, { method: "DELETE" });
    await ctx.close();
  }
});
