import { test, expect } from "@playwright/test";
import { login, S, waitDb, tap, rest } from "./helpers.mjs";
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

  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Ghi bữa" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/ghi-bua.png" });
  await tap(page.getByTestId("log-tab-calc"));
  await page.getByTestId("calc-text").fill("1 tô phở bò, 2 quả trứng gà luộc");
  await tap(page.getByTestId("calc-run"));
  // phở bò tô vừa 400 g = 340 kcal; 2 trứng 100 g = 155 kcal → 495, không gọi AI
  await expect(page.getByTestId("calc-total")).toHaveAttribute("data-value", "495");
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
