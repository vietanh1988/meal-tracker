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
  await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); localStorage.setItem("fp_onb_push", "1"); } catch (e) {} });
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
  await navNotOverOverlay(locator.page());
  await locator.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await locator.click();
}

// 01/11 (lỗi chủ dự án chụp: nút "Lưu tuỳ chọn & lên thực đơn" bị thanh điều hướng dưới che): khi đang mở sheet / hộp thoại / màn phủ
// (lớp cố định phủ cả màn, z-index ≥ 100), thanh điều hướng dưới KHÔNG được nằm trên lớp đó. Chạy trước mỗi tap() → soát mọi sheet các bài E2E mở.
export async function navNotOverOverlay(page) {
  const bad = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="bottom-nav"]');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    if (!r.height || r.bottom <= 0 || r.top >= innerHeight) return null;
    const vw = innerWidth, vh = innerHeight;
    const isOverlay = (el) => {
      for (let x = el; x && x !== document.body; x = x.parentElement) {
        const cs = getComputedStyle(x);
        if (cs.position !== "fixed") continue;
        const b = x.getBoundingClientRect();
        if (b.left <= 1 && b.top <= 1 && b.right >= vw - 1 && b.bottom >= vh - 1 && (parseInt(cs.zIndex, 10) || 0) >= 100) return x;
      }
      return null;
    };
    const y = r.top + r.height / 2;
    for (const fx of [0.15, 0.5, 0.85]) {
      const stack = document.elementsFromPoint(r.left + r.width * fx, y);
      const i = stack.findIndex((e) => nav.contains(e));
      if (i < 0) continue; // điểm này thanh dưới đã bị che (đúng) hoặc trống
      for (const e of stack.slice(i + 1)) {
        if (nav.contains(e)) continue;
        const ov = isOverlay(e);
        if (ov) return (ov.querySelector("[data-testid]")?.getAttribute("data-testid")) || ov.getAttribute("data-testid") || ov.className || "lớp phủ";
      }
    }
    return null;
  });
  if (bad) throw new Error(`Thanh điều hướng dưới đang che lớp phủ "${bad}" (nút đáy sheet bị che)`);
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
  // 16/10: mọi bữa trống đều có nút + ở dòng thời gian (kể cả bữa đang ở thẻ đến giờ) → luôn bấm nút của dòng
  await expect(page.getByTestId("meal-skeleton")).toHaveCount(0);
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

// Vào Tôi › Quản trị. Quyền admin đọc từ DB lúc mở app — CI đôi khi đọc trước khi bài test bật is_admin xong
// → không thấy nút thì tải lại 1 lần (17/10)
export async function openAdmin(page) {
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await nav.getByRole("button", { name: "Tôi" }).click();
  const btn = page.getByTestId("me-admin");
  try { await btn.waitFor({ state: "visible", timeout: 8_000 }); }
  catch (e) {
    await page.reload();
    await nav.getByRole("button", { name: "Tôi" }).waitFor({ state: "visible", timeout: 20_000 });
    await nav.getByRole("button", { name: "Tôi" }).click();
  }
  await tap(btn);
}

// 26/10: PC — bấm "Vào Quản trị ›". Quyền admin app đọc lúc mở (profiles.is_admin, sau app_settings): trên CI có lúc chậm / lỡ
// → chờ tới 10 s, chưa có thì tải lại trang 1 lần (đăng nhập giữ nguyên) rồi bấm.
export async function openPcAdmin(page) {
  const btn = page.getByTestId("pc-open-admin");
  try { await btn.waitFor({ state: "visible", timeout: 10_000 }); }
  catch (e) { await page.reload(); await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 }); await btn.waitFor({ state: "visible", timeout: 15_000 }); }
  await btn.click();
}

// 06/11: Tin giảm cân — app đọc bài từ fipilotai.com; e2e trả dữ liệu mẫu (chép từ web thật, fixtures/app-*.json), ảnh thay bằng ảnh mẫu
export async function mockNews(page) {
  const news = readFileSync(new URL("./fixtures/app-news.json", import.meta.url), "utf8");
  const posts = JSON.parse(readFileSync(new URL("./fixtures/app-post.json", import.meta.url), "utf8"));
  const jpg = readFileSync(new URL("./fixtures/bua-com-thit-kho.jpg", import.meta.url));
  const H = { "Access-Control-Allow-Origin": "*" };
  await page.route("https://fipilotai.com/api/app-news", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: H, body: news }));
  await page.route("https://fipilotai.com/api/app-post/**", (r) => {
    const slug = decodeURIComponent(new URL(r.request().url()).pathname.split("/").pop());
    const p = posts[slug];
    return r.fulfill({ status: p ? 200 : 404, contentType: "application/json", headers: H, body: JSON.stringify(p || { error: "not_found" }) });
  });
  await page.route(/^https:\/\/fipilotai\.com\/(anh\/|_next\/image|img\/)/, (r) => r.fulfill({ status: 200, contentType: "image/jpeg", headers: H, body: jpg }));
  return { news: JSON.parse(news), posts };
}
