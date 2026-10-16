import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, openLogFor, openPlus } from "./helpers.mjs";

// Ghi bữa (16/10): bấm + nhiều món vào giỏ, chỉnh gram từng món rồi ghi 1 lần; tìm món không ra 2 dòng trùng tên.
test("Ghi bữa: chọn nhiều món + gram, ghi 1 lần", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const before = await todayRow();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
  try {
    await login(page);
    await openLogFor(page, "toi"); // + ở dòng Bữa tối, hoặc Tìm món của thẻ đến giờ nếu đang là bữa tối
    const search = page.getByPlaceholder(/Tìm món/);
    await search.fill("thịt heo");
    const names = await page.getByTestId("log-add").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(new Set(names).size, names.join(" | ")).toBe(names.length);
    await expect(search).toBeFocused(); // mở sheet là con trỏ ở ô tìm (bản vẽ 113)
    await tap(page.getByRole("button", { name: "Thêm thịt heo luộc" }));
    await expect(search).toHaveValue("");   // + xong ô tìm tự xoá chữ, giữ con trỏ
    await expect(search).toBeFocused();
    await search.fill("cơm trắng");
    await tap(page.getByTestId("log-add").first());
    await expect(page.getByTestId("log-tray-row")).toHaveCount(2);
    await page.getByLabel("Gram thịt heo luộc").fill("150");
    await page.screenshot({ path: "shots/ghi-bua-gio-mon.png" });
    await expect(page.getByTestId("log-tray-save")).toContainText("Ghi 2 món");
    await tap(page.getByTestId("log-tray-save"));
    await waitDb(async () => {
      const m = ((await todayRow())?.meals || []).find((x) => x.meal_id === "toi");
      return m && m.items.length === 2 && m.items.some((i) => i.food === "thịt heo luộc" && Math.round(i.gram) === 150);
    }, "ghi 2 món vào bữa tối 1 lần");
    await expect(page.getByTestId("log-tray")).toHaveCount(0);
  } finally {
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (before) await rest("daily_logs", { method: "POST", body: JSON.stringify(before) });
    await ctx.close();
  }
});

// Món lạ (17/10, bản vẽ 114): ô Tự nhập calo ngay dưới kết quả → Thêm vào giỏ → Ghi; không gọi AI
test("Ghi bữa: món lạ tự nhập calo ngay trong sheet → giỏ → ghi", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const before = await todayRow();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
  await rest(`user_foods?user_id=eq.${s.uid}`, { method: "DELETE" }); // món tự nhập lưu máy chủ (16/10) → "món lạ" phải thật sự lạ
  try {
    await login(page);
    let aiCalls = 0;
    await page.route("**/functions/v1/ai-proxy", (route) => { aiCalls++; route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
    await openLogFor(page, "toi");
    const search = page.getByPlaceholder(/Tìm món/);
    await search.fill("bánh khọt cô ba qwz");
    const box = page.getByTestId("log-manual");
    await expect(box).toBeVisible();
    await expect(box).toContainText('Không thấy "bánh khọt cô ba qwz" trong kho món.');
    await expect(page.getByTestId("log-calc-q")).toContainText("Để AI tính");
    await expect(page.getByTestId("log-manual-add")).toBeDisabled();
    await expect(page.getByTestId("log-manual-gram")).toHaveValue("100");
    await page.getByTestId("log-manual-cal").fill("260");
    await tap(page.getByTestId("log-manual-more"));
    await page.getByTestId("log-manual-p").fill("6,5");
    await expect(page.getByTestId("log-manual-add")).toContainText("Thêm vào giỏ · 260 kcal");
    await page.screenshot({ path: "shots/ghi-bua-tu-nhap.png" });
    await tap(page.getByTestId("log-manual-add"));
    await expect(page.getByTestId("log-tray-row")).toHaveCount(1);
    await expect(search).toHaveValue("");
    await expect(page.getByTestId("log-manual")).toHaveCount(0);
    await tap(page.getByTestId("log-tray-save"));
    await waitDb(async () => {
      const m = ((await todayRow())?.meals || []).find((x) => x.meal_id === "toi");
      return m && m.items.length === 1 && m.items[0].source === "manual" && m.items[0].cal === 260 && m.items[0].p === 6.5;
    }, "ghi món tự nhập từ sheet Ghi bữa");
    expect(aiCalls).toBe(0);
    // Lần sau tìm là ra món tự nhập (lưu riêng cho tài khoản)
    await openPlus(page, "log");
    await page.getByPlaceholder(/Tìm món/).fill("bánh khọt cô ba qwz");
    await expect(page.getByRole("button", { name: /^Thêm bánh khọt cô ba qwz/i })).toBeVisible();
    await expect(page.getByTestId("log-manual")).toHaveCount(0);
  } finally {
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (before) await rest("daily_logs", { method: "POST", body: JSON.stringify(before) });
    await ctx.close();
  }
});
