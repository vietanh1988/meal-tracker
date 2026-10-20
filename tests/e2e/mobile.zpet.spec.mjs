// Fipilot Pet (20/10): thẻ Pi trên Hôm nay → máy chủ cộng Hạt đúng việc hôm nay (đúng 1 lần) → mua → mặc → tải lại vẫn mặc.
// Cờ "pet" bật tạm trong bài này rồi trả lại; dữ liệu hôm nay / cân thêm vào được khôi phục cuối bài.
import { test, expect } from "@playwright/test";
import { login, S, rest, waitDb, tap, todayRow } from "./helpers.mjs";

test("Thú cưng Pi: nhận Hạt 1 lần, mua, mặc, giữ sau khi tải lại", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const before = await todayRow();
  let weightId = null;
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    // hôm nay: 4 bữa ≥ 100 kcal đã ăn (1 món chụp) + nước đủ + đã cân → 4×10 + 5 + 20 + 15 + 20 = 100 Hạt
    const meals = ["sang", "trua", "phu_chieu", "toi"].map((id, i) => ({ meal_id: id, meal_name: id, items: [{ food: "Món thử", gram: 200, cal: 300 + i * 10, p: 20, c: 30, f: 8, ...(i === 1 ? { source: "photo" } : {}) }] }));
    await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before?.day_type || "train", meals, eaten_meals: meals.map((m) => m.meal_id), water_ml: 3500 }) });
    const w = await rest("weight_logs", { method: "POST", body: JSON.stringify({ user_id: s.uid, week: 1, kg: 64.4, logged_date: s.today }) });
    weightId = w?.[0]?.id;

    await login(page);
    const card = page.getByTestId("pet-today-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    const ledger = () => rest(`pet_ledger?user_id=eq.${s.uid}&amount=gt.0&select=key,amount`);
    const rows = await waitDb(async () => { const r = await ledger(); return r.length >= 8 ? r : null; }, "đủ 8 dòng Hạt");
    const sum = rows.reduce((a, r) => a + r.amount, 0);
    expect(sum).toBeGreaterThanOrEqual(100); // + chuỗi ngày nếu các bài trước đã ghi đủ 3 ngày liền
    await expect(card).toContainText(String(sum));

    await tap(card);
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await expect(page.getByTestId("pet-today")).toContainText(`+${sum}`);
    await page.getByTestId("pet-tap").click(); // chạm Pi → nảy + cười tít
    await expect(page.getByTestId("pet-tap").getByTestId("pet-avatar")).toHaveAttribute("data-mood", "cuoi");

    // tải lại: không cộng trùng
    await page.reload();
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    expect((await ledger()).length).toBe(rows.length);

    // mua Mũ lưỡi trai đen (Phổ thông, cấp 1, 100 Hạt, đồ Pi nam)
    await tap(page.getByTestId("pet-today-card"));
    await tap(page.getByTestId("pet-open-shop"));
    await expect(page.getByTestId("pet-shop")).toBeVisible();
    await expect(page.getByTestId("pet-item-doi-dau-07")).toHaveCount(0); // nơ hồng là đồ Pi nữ → không có ở Pi nam
    await tap(page.getByTestId("pet-item-doi-dau-02"));
    await page.getByTestId("pet-buy").click();
    await expect(page.getByTestId("pet-wear")).toContainText("Mặc luôn");
    await page.getByTestId("pet-wear").click();
    await waitDb(async () => (await rest(`pet_equipped?user_id=eq.${s.uid}&slot=eq.dau&select=item_id`))[0]?.item_id === "doi-dau-02", "đã mặc mũ");
    const prof = (await rest(`pet_profiles?user_id=eq.${s.uid}&select=balance`))[0];
    expect(prof.balance).toBe(sum - 100);
    await page.screenshot({ path: "shots/pet-shop.png" });

    // tải lại vẫn đang mặc; tủ đồ tháo được
    await page.reload();
    await tap(page.getByTestId("pet-today-card"));
    await tap(page.getByTestId("pet-open-closet"));
    await expect(page.getByTestId("pet-unequip-dau")).toBeVisible();
    await page.screenshot({ path: "shots/pet-closet.png" });
    await page.getByTestId("pet-unequip-dau").click();
    await waitDb(async () => (await rest(`pet_equipped?user_id=eq.${s.uid}&slot=eq.dau&select=item_id`)).length === 0, "đã tháo mũ");

    // Hỏi Pi: AI giả (không tốn tiền) → câu trả lời hiện trong khung chat
    await page.route("**/functions/v1/ai-proxy", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: "Tối nay ăn 150 g ức gà là vừa nha." }) }));
    await page.goBack();
    await tap(page.getByTestId("pet-open-chat"));
    await page.getByTestId("pet-chat-input").fill("Tối nay ăn gì?");
    await page.getByTestId("pet-chat-send").click();
    await expect(page.getByTestId("pet-chat")).toContainText("150 g ức gà");
    await page.screenshot({ path: "shots/pet-chat.png" });
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) }).catch(() => {});
    if (weightId) await rest(`weight_logs?id=eq.${weightId}`, { method: "DELETE" }).catch(() => {});
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before.day_type, meals: before.meals, eaten_meals: before.eaten_meals, water_ml: before.water_ml }) }).catch(() => {});
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" }).catch(() => {});
    await ctx.close();
  }
});
