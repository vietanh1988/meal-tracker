import { readFileSync } from "fs";
import { expect } from "@playwright/test";

export const S = () => JSON.parse(readFileSync(new URL("./.state.json", import.meta.url)));

// Gọi REST Supabase LOCAL bằng service role (chỉ để chuẩn bị/kiểm dữ liệu test)
export async function rest(path, opts = {}) {
  const s = S();
  const r = await fetch(`${s.url}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json", Prefer: "return=representation", ...(opts.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`REST ${r.status} ${path}: ${t}`);
  return t ? JSON.parse(t) : null;
}

export async function todayRow() {
  const s = S();
  const rows = await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}&select=*`);
  return rows[0] || null;
}

// Chặn mọi gọi edge function (AI) — test không tốn tiền, trả rỗng
export async function blockAI(page) {
  await page.route("**/functions/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
}

export async function login(page) {
  const s = S();
  await blockAI(page);
  await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
  await page.goto("/");
  await page.getByTestId("login-email").fill(s.email);
  await page.getByTestId("login-pass").fill(s.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
}

// Chờ tới khi điều kiện trên DB đúng (app ghi bất đồng bộ)
export async function waitDb(fn, msg, timeout = 10_000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Hết giờ chờ DB: ${msg}`);
}

// Số kcal còn lại trên header Hôm nay (mobile, âm = vượt)
export async function kcalRemainMobile(page) {
  return Number(await page.getByTestId("kcal-remain").getAttribute("data-value"));
}

// Bấm 1 nút sau khi cuộn nó ra GIỮA màn (tránh bị thanh điều hướng dưới cố định che)
export async function tap(locator) {
  await locator.waitFor({ state: "visible", timeout: 15_000 }); // không chờ tới hết giờ cả bài → báo đúng bước lỗi
  await locator.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await locator.click();
}

// Vuốt xuống trên 1 phần tử (sheet) bằng sự kiện chạm thật của trình duyệt
export async function swipeDown(locator, dy = 220) {
  await locator.evaluate(async (el, dy) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y0 = r.top + 12;
    const mk = (y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(y0)], changedTouches: [mk(y0)], bubbles: true }));
    for (let i = 1; i <= 6; i++) el.dispatchEvent(new TouchEvent("touchmove", { touches: [mk(y0 + (dy * i) / 6)], changedTouches: [mk(y0 + (dy * i) / 6)], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(y0 + dy)], bubbles: true }));
  }, dy);
}

// Mở sheet Ghi bữa cho 1 bữa ở Hôm nay (16/10): bữa đang ở thẻ "đến giờ ăn" không còn nút + ở dòng thời gian
// (trùng với thẻ) → bấm "Tìm món" của thẻ; bữa khác bấm + ở dòng ("Ghi bữa tối"…). Bữa đến giờ phụ thuộc giờ chạy CI.
const ROW_LABEL = { sang: "bữa sáng", phu_sang: "phụ sáng", trua: "bữa trưa", phu_chieu: "phụ chiều", pre: "trước tập", post: "sau tập", toi: "bữa tối" };
export async function focusMealId(page) {
  await expect(page.getByTestId("meal-skeleton")).toHaveCount(0);
  const fc = page.getByTestId("focus-card");
  return (await fc.count()) ? fc.getAttribute("data-meal") : null;
}
export async function openLogFor(page, mealId) {
  if ((await focusMealId(page)) === mealId) return tap(page.getByTestId("focus-card").getByTestId("focus-search"));
  return tap(page.getByRole("button", { name: `Ghi ${ROW_LABEL[mealId]}` }));
}

// Nút + giữa thanh dưới (17/10, bản vẽ 116) mở menu 3 lựa chọn → bấm 1 lựa chọn: "log" | "photo" | "calc"
export async function openPlus(page, which = "log") {
  await page.getByTestId("nav-add").click();
  await expect(page.getByTestId("plus-menu")).toBeVisible();
  await tap(page.getByTestId(`plus-${which}`));
}

// Hộp hỏi trong app (lib/dialog): bấm Đồng ý nếu có hiện trong `ms` (VD áp thực đơn chỉ hỏi khi thay bữa chưa ăn có món)
export async function confirmIfAsked(page, ms = 2500) {
  const ok = page.getByTestId("confirm-ok");
  try { await ok.waitFor({ state: "visible", timeout: ms }); } catch (e) { return false; }
  await ok.click();
  return true;
}
