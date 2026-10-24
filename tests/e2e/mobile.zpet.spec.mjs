// Fipilot Pet (20/10): thẻ Pi trên Hôm nay → máy chủ cộng Hạt đúng việc hôm nay (đúng 1 lần) → mua → mặc → tải lại vẫn mặc.
// Cờ "pet" bật tạm trong bài này rồi trả lại; dữ liệu hôm nay / cân thêm vào được khôi phục cuối bài.
import { test, expect } from "@playwright/test";
import { login, S, rest, waitDb, tap, todayRow } from "./helpers.mjs";

test("Thú cưng Pi: nhận Hạt 1 lần, mua, mặc, giữ sau khi tải lại", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const cfgRow = (await rest("app_settings?key=eq.pet_config&select=value"))[0]; // 23/10: mở bán bộ Halloween trong bài (lịch bán theo dịp)
  const cfg0 = cfgRow?.value ? (typeof cfgRow.value === "string" ? JSON.parse(cfgRow.value) : cfgRow.value) : {};
  const before = await todayRow();
  let weightId = null;
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    await rest("app_settings?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ key: "pet_config", value: JSON.stringify({ ...cfg0, collections: { ...(cfg0.collections || {}), halloween: { mode: "open" } } }) }) });
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
    await expect(page.getByTestId("pet-tap").getByTestId("pet-avatar")).toHaveAttribute("data-mood", /^(cuoilon|nhaymat|haohung|ngacnhien)$/); // 23/10: chạm → nhún + cười lớn / nháy mắt / hào hứng (ngẫu nhiên); CI chạy sau 22h30 Pi đang ngủ → ngacnhien

    // tải lại: không cộng trùng
    await page.reload();
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    expect((await ledger()).length).toBe(rows.length);

    // 23/10: mua Giày nhọn phù thuỷ đen (bộ Halloween, Phổ thông, cấp 1, 80 Hạt, đồ Pi nam) — đủ Hạt từ 100 Hạt hôm nay
    await tap(page.getByTestId("pet-today-card"));
    await tap(page.getByTestId("pet-open-shop"));
    await expect(page.getByTestId("pet-shop")).toBeVisible();
    await expect(page.getByTestId("pet-item-halloween-nu-giay01")).toHaveCount(0); // đồ Pi nữ → không có ở Pi nam
    // 24/10: thử nhiều món 1 lúc — mở áo, chạm giày ở dải dưới → Pi mặc cả áo + giày, áo nằm trong "Đang thử thêm"
    await tap(page.getByTestId("pet-item-halloween-nam-ao02"));
    const tryon = page.getByTestId("pet-tryon");
    await expect(tryon.locator('[data-layer="ao"]').first()).toBeAttached();
    await tryon.getByTestId("pet-tryon-pick-halloween-nam-giay01").click();
    await expect(tryon.getByTestId("pet-trial-halloween-nam-ao02")).toBeVisible();
    await expect(tryon.locator('[data-layer="ao"]').first()).toHaveAttribute("src", /do_halloween_nam_ao02/);
    await expect(tryon.locator('[data-layer="giay"]').first()).toHaveAttribute("src", /do_halloween_nam_giay01/);
    await page.screenshot({ path: "shots/pet-tryon-multi.png" });
    await tryon.getByTestId("pet-trial-clear").click();
    await expect(tryon.getByTestId("pet-trial")).toHaveCount(0);
    await page.getByTestId("pet-buy").click();
    await expect(page.getByTestId("pet-wear")).toContainText("Mặc luôn");
    await page.getByTestId("pet-wear").click();
    await waitDb(async () => (await rest(`pet_equipped?user_id=eq.${s.uid}&slot=eq.giay&select=item_id`))[0]?.item_id === "halloween-nam-giay01", "đã mặc giày");
    await expect(page.locator('[data-layer="giay"]').first()).toHaveAttribute("src", /halloween\/do_halloween_nam_giay01\.webp\?v=[0-9a-f]{10}$/);
    const prof = (await rest(`pet_profiles?user_id=eq.${s.uid}&select=balance`))[0];
    expect(prof.balance).toBe(sum - 80);
    await page.screenshot({ path: "shots/pet-shop.png" });

    // tải lại vẫn đang mặc; tủ đồ tháo được
    await page.reload();
    await tap(page.getByTestId("pet-today-card"));
    await tap(page.getByTestId("pet-open-closet"));
    await expect(page.getByTestId("pet-unequip-giay")).toBeVisible();
    await page.screenshot({ path: "shots/pet-closet.png" });
    await page.getByTestId("pet-unequip-giay").click();
    await waitDb(async () => (await rest(`pet_equipped?user_id=eq.${s.uid}&slot=eq.giay&select=item_id`)).length === 0, "đã tháo giày");

    // 24/10: biểu cảm mặc định "Theo giờ"; chọn mặt cụ thể thì lưu, bấm lại "Theo giờ" là về tự đổi
    await expect(page.getByTestId("pet-face-auto")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("pet-face-buon").click();
    await waitDb(async () => (await rest(`pet_profiles?user_id=eq.${s.uid}&select=settings`))[0]?.settings?.face === "buon", "đã chọn mặt buồn");
    await expect(page.getByTestId("pet-face-buon")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("pet-face-auto").click();
    await waitDb(async () => (await rest(`pet_profiles?user_id=eq.${s.uid}&select=settings`))[0]?.settings?.face === "auto", "về Theo giờ");

    // Hỏi Pi: AI giả (không tốn tiền) trả "[biểu cảm] câu" → câu hiện không kèm thẻ, Pi NÓI (mắt + miệng theo khẩu hình) với mặt hào hứng
    let aiCalls = 0;
    await page.route("**/functions/v1/ai-proxy", (r) => { aiCalls++; return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: "[haohung] Tối nay ăn 150 g ức gà là vừa nha." }) }); });
    await page.goBack();
    // 24/10: bấm câu Pi nói trên màn Thú cưng → Pi nói (có miệng theo khẩu hình)
    await tap(page.getByTestId("pet-say-play"));
    await expect(page.getByTestId("pet-tap").getByTestId("pet-avatar")).toHaveAttribute("data-speaking", "1");
    await expect(page.locator('[data-layer="mieng"]').first()).toBeAttached();
    await page.screenshot({ path: "shots/pet-speaking.png" });
    await tap(page.getByTestId("pet-open-chat"));
    await page.getByTestId("pet-chat-input").fill("Tối nay ăn gì?");
    await expect(page.getByTestId("pet-chat-room").getByTestId("pet-avatar")).toHaveAttribute("data-listening", "1"); // đang gõ → Pi nghe
    await page.getByTestId("pet-chat-send").click();
    await expect(page.getByTestId("pet-chat")).toContainText("150 g ức gà");
    await expect(page.getByTestId("pet-chat")).not.toContainText("[haohung]");
    await expect(page.getByTestId("pet-chat-room").getByTestId("pet-avatar")).toHaveAttribute("data-speaking", "1");
    await expect(page.getByTestId("pet-chat-room").getByTestId("pet-avatar")).toHaveAttribute("data-mood", "haohung");
    await page.screenshot({ path: "shots/pet-chat.png" });
    expect(aiCalls).toBe(1);
    // bị chửi → câu soạn sẵn nhóm bi_chui, KHÔNG gọi AI, không chửi lại
    await expect(page.getByTestId("pet-chat-room").getByTestId("pet-avatar")).not.toHaveAttribute("data-speaking", "1", { timeout: 20000 });
    await page.getByTestId("pet-chat-input").fill("Pi ngu quá");
    await page.getByTestId("pet-chat-send").click();
    await expect(page.getByTestId("pet-chat")).toContainText(/Pi|nha|nè/);
    expect(aiCalls).toBe(1);
    // chán nản / có ý tự hại → câu an ủi có gợi ý đường dây hỗ trợ, không gọi AI
    await expect(page.getByTestId("pet-chat-room").getByTestId("pet-avatar")).not.toHaveAttribute("data-speaking", "1", { timeout: 20000 });
    await page.getByTestId("pet-chat-input").fill("Mình muốn chết");
    await page.getByTestId("pet-chat-send").click();
    await expect(page.getByTestId("pet-chat")).toContainText("đường dây hỗ trợ");
    expect(aiCalls).toBe(1);
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) }).catch(() => {});
    if (cfgRow) await rest("app_settings?key=eq.pet_config", { method: "PATCH", body: JSON.stringify({ value: cfgRow.value }) }).catch(() => {});
    else await rest("app_settings?key=eq.pet_config", { method: "DELETE" }).catch(() => {});
    if (weightId) await rest(`weight_logs?id=eq.${weightId}`, { method: "DELETE" }).catch(() => {});
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before.day_type, meals: before.meals, eaten_meals: before.eaten_meals, water_ml: before.water_ml }) }).catch(() => {});
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" }).catch(() => {});
    await ctx.close();
  }
});
