import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, kcalRemainMobile, openLogFor, confirmIfAsked } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

// Đo các hành trình chính (16/10): đếm từng thao tác (chạm / gõ) để soát UX, chụp ảnh từng bước vào shots/journey-<n>-*.png,
// cuối mỗi hành trình in 1 dòng `JOURNEY {...}`. Bài chỉ lỗi khi app hỏng thật (không ghi được DB), KHÔNG lỗi vì UX.
// AI bị chặn (login → blockAI). Mọi dữ liệu tạo ra được trả lại như cũ ở cuối từng bài (daily_logs, weight_logs, ai_menu_cache, meal_logs, kg hồ sơ).
const VP = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" };
const TABLES = ["daily_logs", "weight_logs", "ai_menu_cache", "meal_logs"];
const it = (food, gram, cal, p = 0, c = 0, f = 0) => ({ food, gram, cal, p, c, f });
const meal = (r, id) => ((r?.meals) || []).find((m) => (m.meal_id || m.id) === id);

// Chụp lại dữ liệu của user test trước bài → trả lại y nguyên sau bài
async function snapshot() {
  const s = S();
  const out = { profile: (await rest(`profiles?id=eq.${s.uid}&select=kg`))[0] || null };
  for (const t of TABLES) out[t] = await rest(`${t}?user_id=eq.${s.uid}&select=*`);
  return out;
}
async function restore(snap) {
  const s = S();
  for (const t of TABLES) {
    await rest(`${t}?user_id=eq.${s.uid}`, { method: "DELETE" });
    if (snap[t].length) await rest(t, { method: "POST", body: JSON.stringify(snap[t]) });
  }
  if (snap.profile) await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ kg: snap.profile.kg }) });
}
// Đặt nhật ký 1 ngày (dòng luôn tồn tại → app không tự áp Lịch tuần)
async function putDay(date, meals, eaten = []) {
  const s = S();
  const tot = meals.flatMap((m) => m.items).reduce((a, i) => ({ cal: a.cal + i.cal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }), { cal: 0, p: 0, c: 0, f: 0 });
  await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: s.uid, log_date: date, day_type: "train", meals, eaten_meals: eaten, total_cal: tot.cal, total_protein: tot.p, total_carb: tot.c, total_fat: tot.f }) });
}

// Bộ đếm thao tác của 1 hành trình
function journey(no, name, page) {
  const steps = [];
  let taps = 0, k = 0;
  return {
    async act(label, fn) { taps++; steps.push(label); return fn(); },
    look(label) { steps.push(`(xem) ${label}`); },
    async shot(step) { k++; await page.screenshot({ path: `shots/journey-${no}-${String(k).padStart(2, "0")}-${step}.png` }); },
    done(extra = {}) { console.log("JOURNEY " + JSON.stringify({ name, taps, steps, ...extra })); },
  };
}

async function run(browser, fn) {
  const snap = await snapshot();
  const ctx = await browser.newContext(VP);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try { await fn(page); } finally { await ctx.close(); await restore(snap); }
}
const nav = (page, name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

test("J1 · ghi 1 bữa bằng Tìm món: 2 món, chỉnh gram 1 món", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  await putDay(s.today, []);
  await login(page);
  const j = journey(1, "J1 ghi bữa bằng Tìm món", page);
  await j.shot("hom-nay");
  await j.act("Hôm nay: bấm + ở dòng Bữa tối (hoặc Tìm món ở thẻ đến giờ nếu đang là bữa tối)", () => openLogFor(page, "toi"));
  const search = page.getByPlaceholder(/Tìm món/);
  await j.shot("sheet-ghi-bua");
  await j.act("gõ 'thịt heo'", () => search.fill("thịt heo"));
  await j.act("bấm + Thịt heo luộc", () => tap(page.getByRole("button", { name: "Thêm thịt heo luộc" })));
  await j.act("gõ 'cơm trắng' (phải tự xoá chữ cũ)", () => search.fill("cơm trắng"));
  await j.act("bấm + món đầu tiên", () => tap(page.getByTestId("log-add").first()));
  await expect(page.getByTestId("log-tray-row")).toHaveCount(2);
  await j.act("sửa gram thịt heo = 150", () => page.getByLabel("Gram thịt heo luộc").fill("150"));
  await j.shot("gio-mon");
  await j.act("bấm Ghi 2 món", () => tap(page.getByTestId("log-tray-save")));
  await waitDb(async () => {
    const r = await todayRow(); const m = meal(r, "toi");
    return m && m.items.length === 2 && m.items.some((i) => i.food === "thịt heo luộc" && Math.round(i.gram) === 150) && (r.eaten_meals || []).includes("toi");
  }, "J1: bữa tối có 2 món + đã ăn");
  await j.shot("da-ghi");
  j.done();
}));

// 17/10 (bản vẽ 114): món lạ → ô Tự nhập calo ngay trong sheet Ghi bữa (không phải sang màn Kiểm tra calo)
test("J2 · ghi món lạ không có trong kho (tự nhập calo)", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  await putDay(s.today, []);
  await login(page);
  const j = journey(2, "J2 món lạ tự nhập calo", page);
  await j.act("Hôm nay: bấm + ở dòng Bữa tối (hoặc Tìm món ở thẻ đến giờ nếu đang là bữa tối)", () => openLogFor(page, "toi"));
  await j.act("gõ tên món lạ", () => page.getByPlaceholder(/Tìm món/).fill("bánh khọt cô ba qwz"));
  await expect(page.getByTestId("log-manual")).toBeVisible();
  await j.shot("khong-thay");
  await j.act("gõ calo 260", () => page.getByTestId("log-manual-cal").fill("260"));
  await j.shot("tu-nhap");
  await j.act("bấm 'Thêm vào giỏ'", () => tap(page.getByTestId("log-manual-add")));
  await expect(page.getByTestId("log-tray-row")).toHaveCount(1);
  await j.act("bấm 'Ghi 1 món vào bữa tối'", () => tap(page.getByTestId("log-tray-save")));
  await waitDb(async () => (meal(await todayRow(), "toi")?.items || []).some((i) => i.source === "manual" && i.cal === 260), "J2: món tự nhập vào bữa tối");
  await j.shot("da-ghi");
  j.done();
}));

test("J3 · xem còn bao nhiêu calo + Gợi ý món ở thẻ bữa đến giờ", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  const IDS = ["sang", "phu_sang", "trua", "phu_chieu", "pre", "post", "toi"];
  const foods = { sang: [it("phở bò", 400, 340, 26, 39, 8)], phu_sang: [it("chuối", 120, 107, 1, 27, 0)], trua: [it("cơm trắng", 250, 325, 6, 70, 1), it("gà luộc", 150, 250, 38, 0, 10)],
    phu_chieu: [it("sữa chua", 100, 60, 4, 6, 3)], pre: [it("chuối", 150, 134, 2, 34, 0)], post: [it("sữa tươi", 250, 160, 8, 12, 8)], toi: [it("cơm trắng", 200, 260, 5, 56, 1), it("thịt kho", 150, 248, 22, 3, 16)] };
  await putDay(s.today, []);
  await putDay(addDays(s.today, -2), IDS.map((id) => ({ meal_id: id, items: foods[id] })), IDS); // lịch sử để có gợi ý
  await login(page);
  const j = journey(3, "J3 còn bao nhiêu calo + Gợi ý món", page);
  const before = await kcalRemainMobile(page);
  j.look(`còn ${before} kcal ở vòng header (0 thao tác)`);
  await j.shot("con-lai");
  const btn = page.getByTestId("focus-suggest");
  await expect(btn, "thẻ bữa đến giờ có link Xem lựa chọn gợi ý").toBeVisible();
  const mealId = await btn.getAttribute("data-meal");
  await j.act(`bấm 'Xem … lựa chọn' ở thẻ đến giờ (${mealId})`, () => tap(btn));
  await expect(page.getByTestId("suggest-sheet")).toBeVisible();
  j.look(`${await page.getByTestId("suggest-opt").count()} lựa chọn, đã chọn sẵn lựa chọn 1`);
  await j.shot("sheet-goi-y");
  await j.act("bấm 'Ghi · X kcal'", () => tap(page.getByTestId("suggest-apply")));
  await waitDb(async () => (meal(await todayRow(), mealId)?.items || []).length > 0, "J3: ghi món gợi ý");
  await expect.poll(() => kcalRemainMobile(page)).toBeLessThan(before);
  j.look(`còn ${await kcalRemainMobile(page)} kcal sau khi ghi`);
  await j.shot("da-ghi");
  j.done();
}));

test("J4 · AI lên thực đơn từ Hôm nay rồi áp vào ngày", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  await putDay(s.today, []);
  await login(page);
  const j = journey(4, "J4 AI lên thực đơn từ Hôm nay", page);
  const btn = page.getByTestId("today-ai-menu");
  if (!(await btn.count())) { j.look("không có nút AI ở Hôm nay (tài khoản không dùng được AI)"); j.done({ result: "no-button" }); return; }
  j.look(`nhãn nút: ${await btn.innerText()}`);
  await j.act("bấm 'AI lên thực đơn cả ngày'", () => tap(btn));
  await expect(page.getByTestId("ai-total").or(page.getByTestId("ai-error")).or(page.getByTestId("ai-out-of-quota"))).toBeVisible({ timeout: 20_000 });
  await j.shot("ket-qua");
  if (!(await page.getByTestId("ai-apply").count())) {
    j.look(await page.getByTestId("ai-error").or(page.getByTestId("ai-out-of-quota")).innerText().catch(() => "lỗi"));
    j.done({ result: "error" });
    return;
  }
  j.look(`tổng ${await page.getByTestId("ai-total").getAttribute("data-cal")} kcal`);
  await j.act("bấm 'Dùng cho hôm nay'", () => tap(page.getByTestId("ai-apply")));
  await confirmIfAsked(page, 1500); // hôm nay trống → thường không hỏi
  await waitDb(async () => ((await todayRow())?.meals || []).filter((m) => (m.items || []).length).length >= 1, "J4: áp thực đơn AI vào hôm nay");
  await expect(page.getByTestId("kcal-remain")).toBeVisible();
  await j.shot("da-ap");
  j.done({ result: "applied" });
}));

test("J5 · cân nặng hôm nay rồi xem Tiến độ", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  await login(page);
  const j = journey(5, "J5 cân nặng hôm nay + Tiến độ", page);
  // 17/10 (bản vẽ 115): sheet "Cân hôm nay" ngay ở Hôm nay
  await j.act("Hôm nay: bấm thẻ Cân nặng ('Cân hôm nay' / 'Xem')", () => tap(page.getByTestId("weight-tile")));
  await expect(page.getByTestId("weight-sheet")).toBeVisible();
  j.look(`số điền sẵn: ${await page.getByTestId("weight-input").inputValue()}`);
  await j.shot("sheet-can");
  await j.act("gõ 64,6", () => page.getByTestId("weight-input").fill("64,6"));
  await j.act("bấm Lưu", () => tap(page.getByTestId("weight-save")));
  await waitDb(async () => (await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=eq.${s.today}&select=kg`)).some((w) => Number(w.kg) === 64.6), "J5: lưu cân hôm nay");
  await expect(page.getByTestId("weight-sheet")).toHaveCount(0);
  await expect(page.getByTestId("toast")).toContainText("64,6 kg");
  j.look(`toast: ${await page.getByTestId("toast").innerText()}`);
  await j.act("bấm thẻ Cân nặng lại", () => tap(page.getByTestId("weight-tile")));
  await j.act("bấm 'Xem biểu đồ ›'", () => tap(page.getByTestId("weight-chart-link")));
  j.look(`ghi chú biểu đồ: ${await page.getByTestId("wchart-note").innerText()}`);
  await j.shot("da-luu");
  await j.act("bấm tab 'Nhật ký ăn uống'", () => tap(page.getByTestId("seg-diary")));
  await expect(page.getByTestId("diary-summary")).toBeVisible();
  await j.shot("nhat-ky");
  j.done();
}));

test("J6 · đánh dấu đã ăn / sửa gram / xoá món đã ghi", async ({ browser }) => run(browser, async (page) => {
  const s = S();
  await putDay(s.today, [
    { meal_id: "sang", meal_name: "Bữa sáng", items: [it("Phở bò", 400, 400, 20, 50, 10), it("Trứng luộc", 50, 75, 6, 0, 5)] },
    { meal_id: "trua", meal_name: "Bữa trưa", items: [it("Bún chả", 300, 500, 25, 60, 15)] },
  ]);
  await login(page);
  const j = journey(6, "J6 đã ăn / sửa gram / xoá món", page);
  await j.shot("hom-nay");
  await j.act("bấm ✓ ở dòng Bữa sáng", () => tap(page.getByTestId("eat-sang")));
  await waitDb(async () => (await todayRow())?.eaten_meals?.includes("sang"), "J6: đã ăn bữa sáng");
  await j.act("bấm dòng Bữa sáng → Sửa bữa", () => tap(page.getByTestId("meal-foods-sang")));
  await j.shot("sua-bua");
  await j.act("sửa gram phở bò = 200", () => page.getByLabel("Gram phở bò").fill("200"));
  await j.act("bấm Lưu", () => tap(page.getByRole("button", { name: "Lưu", exact: true })));
  await waitDb(async () => { const m = meal(await todayRow(), "sang"); return m && m.items.some((i) => i.food === "Phở bò" && Math.round(i.gram) === 200); }, "J6: sửa gram");
  await j.act("bấm lại dòng Bữa sáng", () => tap(page.getByTestId("meal-foods-sang")));
  await j.act("bấm × Trứng luộc", () => tap(page.getByRole("button", { name: "Xoá trứng luộc" })));
  await j.shot("xoa-mon");
  await j.act("bấm Lưu", () => tap(page.getByRole("button", { name: "Lưu", exact: true })));
  await waitDb(async () => { const r = await todayRow(); const m = meal(r, "sang"); return m && m.items.length === 1 && r.eaten_meals.includes("sang"); }, "J6: xoá món, vẫn đã ăn");
  await expect(page.getByTestId("meal-foods-sang")).toHaveText(/Phở bò/i);
  await j.shot("xong");
  j.done();
}));
