import { test, expect } from "@playwright/test";
import { login, S, waitDb, tap, rest, openPlus } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

// Kiểm tra calo: gõ món → kho món tính ngay; món lạ → AI giả (không tốn tiền) → ghi vào Bữa tối của 2 ngày trước
// (không đụng nhật ký hôm nay — bài core chạy sau cần hôm nay trống để thử tự áp Lịch tuần)
const AI_TEXT = '[{"name":"bánh bao xá xíu siêu cay","gram":150,"cal":330,"p":10,"c":50,"f":10,"fiber":2}]';

test("Kiểm tra calo: kho món + AI tính món lạ → ghi vào bữa tối", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const day = addDays(s.today, -2);
  const dayRow = async () => (await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${day}&select=*`))[0] || null;
  await login(page);
  let aiCalls = 0;
  await page.route("**/functions/v1/ai-proxy", (route) => { aiCalls++; route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: AI_TEXT }) }); });

  await openPlus(page, "log");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/ghi-bua.png" });
  await tap(page.getByTestId("log-tab-calc"));
  await page.getByTestId("calc-text").fill("1 tô phở bò, 2 quả trứng gà luộc");
  await tap(page.getByTestId("calc-run"));
  // phở bò tô vừa 400 g = 340 kcal; 2 trứng 100 g = 166 kcal (bảng Viện Dinh dưỡng, 23/10) → 506, không gọi AI
  await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "506");
  expect(aiCalls).toBe(0);
  // tăng trứng 2 → 3 quả: +77/78 kcal
  await tap(page.getByRole("button", { name: /^Tăng Trứng/ }));
  await expect(page.getByTestId("calc-item-1")).toContainText("3 quả");
  await page.screenshot({ path: "shots/kiem-tra-calo.png", fullPage: true });

  // Sửa chữ: thêm món lạ → phải bấm AI tính mới ghi được
  await tap(page.getByTestId("calc-edit"));
  await page.getByTestId("calc-text").fill("1 tô phở bò, 1 cái bánh bao xá xíu siêu cay");
  await tap(page.getByTestId("calc-run"));
  await expect(page.getByTestId("calc-unknown-1")).toBeVisible();
  await expect(page.getByTestId("calc-save")).toBeDisabled();
  await tap(page.getByTestId("calc-ai"));
  await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "670");
  expect(aiCalls).toBe(1);

  await page.getByTestId("calc-date").selectOption(day);
  await page.getByTestId("calc-meal").selectOption("toi");
  await tap(page.getByTestId("calc-save"));
  await waitDb(async () => {
    const r = await dayRow();
    const m = (r?.meals || []).find((x) => x.meal_id === "toi");
    return m && m.items.some((i) => i.food === "phở bò" && i.gram === 400) && m.items.some((i) => i.source === "ai" && i.cal === 330) && (r.eaten_meals || []).includes("toi");
  }, "ghi bữa tối từ Kiểm tra calo");
  // món AI vào hàng chờ duyệt của chính user (lần sau không tốn lượt)
  await waitDb(async () => (await rest(`food_cache_pending?created_by=eq.${s.uid}&select=food_name`)).some((x) => x.food_name === "bánh bao xá xíu siêu cay"), "food_cache_pending có món AI");
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${day}`, { method: "DELETE" });
  await ctx.close();
});

// Tự nhập calo (16/10): món lạ không cần AI — nhập kcal (+ macro tuỳ chọn) → ghi được; lần sau tìm món là ra
test("Kiểm tra calo: tự nhập calo món lạ → ghi, lần sau tìm thấy", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const day = addDays(s.today, -3);
  const dayRow = async () => (await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${day}&select=*`))[0] || null;
  await login(page);
  let aiCalls = 0;
  await page.route("**/functions/v1/ai-proxy", (route) => { aiCalls++; route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  try {
    await openPlus(page, "log");
    await tap(page.getByTestId("log-tab-calc"));
    await page.getByTestId("calc-text").fill("2 cái bánh khọt cô ba qwz");
    await tap(page.getByTestId("calc-run"));
    await expect(page.getByTestId("calc-save")).toBeDisabled();
    await tap(page.getByTestId("calc-manual-0"));
    await expect(page.getByTestId("calc-manual-use")).toBeDisabled();
    await page.getByTestId("calc-manual-cal").fill("260");
    await page.getByTestId("calc-manual-p").fill("6,5");
    await page.screenshot({ path: "shots/tu-nhap-calo.png", fullPage: true });
    await tap(page.getByTestId("calc-manual-use"));
    await expect(page.getByTestId("calc-manual-tag")).toBeVisible();
    await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "260");
    expect(aiCalls).toBe(0);
    await page.getByTestId("calc-date").selectOption(day);
    await page.getByTestId("calc-meal").selectOption("toi");
    await tap(page.getByTestId("calc-save"));
    await waitDb(async () => {
      const m = ((await dayRow())?.meals || []).find((x) => x.meal_id === "toi");
      return m && m.items.some((i) => i.source === "manual" && i.cal === 260 && i.p === 6.5);
    }, "ghi món tự nhập");
    // Lần sau: tìm món ra ngay món tự nhập
    await openPlus(page, "log");
    await page.getByPlaceholder(/Tìm món/).fill("bánh khọt cô ba qwz");
    await expect(page.getByRole("button", { name: /^Thêm bánh khọt cô ba qwz/i })).toBeVisible();
    // Món tự nhập lưu lên máy chủ (user_foods) theo 1 cái → đổi máy / xoá trình duyệt không mất
    await waitDb(async () => {
      const r = await rest(`user_foods?user_id=eq.${s.uid}&food_name=eq.${encodeURIComponent("bánh khọt cô ba qwz")}&select=data`);
      return r?.[0]?.data?.cal === 130;
    }, "user_foods có món tự nhập");
    await page.evaluate(() => { Object.keys(localStorage).filter((k) => k.startsWith("fp_my_foods")).forEach((k) => localStorage.removeItem(k)); });
    await page.reload();
    await openPlus(page, "log");
    await page.getByPlaceholder(/Tìm món/).fill("bánh khọt cô ba qwz");
    await expect(page.getByRole("button", { name: /^Thêm bánh khọt cô ba qwz/i }), "máy mới vẫn có món tự nhập").toBeVisible();
  } finally {
    await rest(`user_foods?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${day}`, { method: "DELETE" });
    await ctx.close();
  }
});

// 17/10 (bản vẽ 113 / 113b / 116): nút + giữa → menu 3 lựa chọn; ô tìm Ghi bữa gõ cả bữa → thẻ "≈ X kcal cho N món" → Tính calo cả bữa;
// + › Kiểm tra calo: nút chính "Chỉ xem". Không ghi dữ liệu nào.
test("Nút + giữa: menu 3 lựa chọn, gõ cả bữa ở ô tìm ra thẻ tính calo, Kiểm tra calo nút chính Chỉ xem", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await login(page);
  let aiCalls = 0;
  await page.route("**/functions/v1/ai-proxy", (route) => { aiCalls++; route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  try {
    // Menu: 3 thẻ, nút + thành ×, thanh dưới vẫn hiện; bấm × hoặc chạm ngoài để đóng
    await page.getByTestId("nav-add").click();
    await expect(page.getByTestId("plus-menu")).toBeVisible();
    await expect(page.getByTestId("plus-menu").getByRole("menuitem")).toHaveCount(3);
    await expect(page.getByTestId("plus-photo")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    await expect(page.getByTestId("nav-add")).toHaveAttribute("aria-label", "Đóng menu");
    await page.screenshot({ path: "shots/nut-cong-menu.png" });
    await page.getByTestId("nav-add").click();
    await expect(page.getByTestId("plus-menu")).toHaveCount(0);
    await page.getByTestId("nav-add").click();
    await page.mouse.click(195, 120); // chạm vùng mờ phía trên
    await expect(page.getByTestId("plus-menu")).toHaveCount(0);

    // Ghi bữa: con trỏ ở ô tìm, tab đổi tên + dòng mô tả; gõ cả bữa → thẻ tính calo (kho món, không gọi AI)
    await openPlus(page, "log");
    const search = page.getByPlaceholder(/Tìm món/);
    await expect(search).toBeFocused();
    await expect(page.getByTestId("log-tab-calc")).toHaveText("Tính calo cả bữa");
    await expect(page.getByTestId("log-tab-hint")).toBeVisible();
    await search.fill("1 tô phở bò, 2 quả trứng gà luộc");
    await expect(page.getByTestId("log-smart")).toBeVisible();
    await expect(page.getByTestId("log-smart-title")).toHaveAttribute("data-cal", "506");
    await expect(page.getByTestId("log-smart-title")).toContainText("506 kcal cho 2 món");
    await expect(page.getByTestId("log-manual")).toHaveCount(0);
    await page.screenshot({ path: "shots/ghi-bua-the-tinh-calo.png" });
    await tap(page.getByTestId("log-smart"));
    await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "506");
    expect(aiCalls).toBe(0);
    await expect(page.getByTestId("calc-save")).toHaveAttribute("data-primary", "1");
    await page.getByTestId("calc-close").click();
    await expect(page.getByTestId("calc-total")).toHaveCount(0);

    // + › Kiểm tra calo: màn trống, kết quả có "Chỉ xem" là nút chính, "Ghi vào …" là nút phụ
    await openPlus(page, "calc");
    await expect(page.getByTestId("calc-text")).toHaveValue("");
    await page.getByTestId("calc-text").fill("1 tô phở bò");
    await tap(page.getByTestId("calc-run"));
    await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "340");
    await expect(page.getByTestId("calc-close")).toHaveText("Chỉ xem");
    await expect(page.getByTestId("calc-close")).toHaveAttribute("data-primary", "1");
    await expect(page.getByTestId("calc-save")).not.toHaveAttribute("data-primary", "1");
    await expect(page.getByTestId("calc-save")).toContainText("Ghi vào");
    await page.screenshot({ path: "shots/kiem-tra-calo-chi-xem.png" });
    await page.getByTestId("calc-close").click();
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    expect(aiCalls).toBe(0);
  } finally {
    await ctx.close();
  }
});
