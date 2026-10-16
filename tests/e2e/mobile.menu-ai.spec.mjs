import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, confirmIfAsked } from "./helpers.mjs";

// Thực đơn AI (không gọi AI thật): mở thực đơn AI đã lưu → Đổi món (tính trước kcal) → Lưu mẫu vào Lịch tuần → Dùng cho hôm nay.
// Nút "Lên thực đơn ngay": chỉ kiểm màn đang tạo + Huỷ (AI bị chặn trong E2E).
const it = (food, gram, cal, role, p = 0, c = 0, f = 0) => ({ food, gram, cal, role, unit: "g", qty: 1, p, c, f, fiber: 0 });
const TEMPLATE = {
  day_type: "train",
  meals: [
    { meal_id: "sang", meal_name: "Bữa sáng", items: [it("phở bò", 450, 480, "carb", 25, 60, 12)] },
    { meal_id: "trua", meal_name: "Bữa trưa", items: [it("cơm trắng", 250, 325, "carb", 6, 70, 1), it("cá kho tộ", 220, 290, "protein", 30, 8, 14), it("canh rau dền", 100, 20, "fixed", 2, 3, 0)] },
    { meal_id: "toi", meal_name: "Bữa tối", items: [it("cơm trắng", 220, 286, "carb", 5, 62, 1), it("thịt rang cháy cạnh", 140, 287, "protein", 25, 4, 19), it("su su xào", 100, 58, "fixed", 1, 6, 3)] },
  ],
};
const KEYS = ["thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7", "cn"];
const idxOf = (d) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

test("Thực đơn AI: đổi món, lưu mẫu, áp dụng hôm nay", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const other = (idxOf(s.today) + 2) % 7;
  await rest(`ai_menu_cache?user_id=eq.${s.uid}`, { method: "DELETE" });
  await rest("ai_menu_cache", { method: "POST", body: JSON.stringify({ user_id: s.uid, menu_date: s.today, template: TEMPLATE }) });
  const wk = async (k) => (await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${k}&select=day_name,meals`))[0] || null;
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  try {
    await login(page);
    await nav("Thực đơn").click();

    console.log("BƯỚC: Mở thực đơn AI đã lưu");
    // Mở thực đơn AI đã lưu
    await tap(page.getByTestId("menu-latest-ai"));
    await expect(page.getByTestId("ai-meal-trua")).toBeVisible();
    await page.screenshot({ path: "shots/thuc-don-ai.png", fullPage: true });

    // Thiếu/dư mục tiêu: nút Cân lại (không tốn lượt) chỉ hiện khi kéo được gần mục tiêu hơn
    const rb = page.getByTestId("ai-rebalance");
    if (await rb.count()) {
      const before = Number(await page.getByTestId("ai-total").getAttribute("data-cal"));
      await tap(rb);
      await expect.poll(async () => Number(await page.getByTestId("ai-total").getAttribute("data-cal"))).not.toBe(before);
    }
    console.log("BƯỚC: Đổi Cá kho tộ");
    // Đổi Cá kho tộ: sheet hiện ứng viên kèm kcal, chọn món đầu → bữa trưa không còn Cá kho tộ
    await tap(page.getByTestId("swap-trua-cá kho tộ"));
    await expect(page.getByTestId("swap-sheet")).toBeVisible();
    await expect(page.getByTestId("swap-opt").first()).toContainText("kcal");
    await page.screenshot({ path: "shots/doi-mon.png" });
    await tap(page.getByTestId("swap-confirm"));
    await expect(page.getByTestId("swap-sheet")).toHaveCount(0);
    await expect(page.getByTestId("ai-meal-trua")).not.toContainText("Cá kho tộ");

    console.log("BƯỚC: Lưu mẫu vào 1 ngày khác");
    // Lưu mẫu vào 1 ngày khác (cùng loại: user test tập cả tuần)
    await tap(page.getByTestId("ai-save-week"));
    await tap(page.getByTestId(`save-week-${other}`));
    await tap(page.getByTestId("save-week-confirm"));
    await waitDb(async () => ((await wk(KEYS[other]))?.meals || []).length === 3, "lưu Lịch tuần");

    console.log("BƯỚC: Dùng cho hôm nay");
    // Dùng cho hôm nay → nhật ký hôm nay có 3 bữa, trưa không còn Cá kho tộ
    await expect(page.getByTestId("ai-apply")).toContainText("Dùng cho hôm nay");
    await tap(page.getByTestId("ai-apply"));
    await confirmIfAsked(page); // hỏi khi hôm nay có bữa chưa ăn đang có món (tuỳ bài chạy trước)
    await waitDb(async () => {
      const ms = ((await todayRow())?.meals || []).filter((m) => (m.items || []).length);
      const trua = ms.find((m) => m.meal_id === "trua");
      return ms.length >= 3 && trua && !trua.items.some((i) => i.food === "cá kho tộ");
    }, "áp thực đơn AI hôm nay");

    // Lên thực đơn mới: mở màn Thực đơn AI (AI bị chặn trong E2E, không tốn tiền). Để CUỐI bài vì quay lại
    // tab Thực đơn sẽ tải lại "Thực đơn của tôi" (lần tạo có thể ghi đè thực đơn AI hôm nay).
    await nav("Thực đơn").click();
    await tap(page.getByTestId("menu-generate"));
    // AI bị chặn có thể báo lỗi ngay hoặc sau vài giây → chấp nhận cả 3 màn, rồi bấm Quay lại
    await expect(page.getByTestId("ai-loading").or(page.getByTestId("ai-error")).or(page.getByTestId("ai-out-of-quota"))).toBeVisible();
    await page.getByRole("button", { name: "Quay lại" }).click();
    await expect(page.getByTestId("menu-ai-card")).toBeVisible();

  } finally {
    await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });
    await ctx.close();
  }
});

// Đã ăn bữa sáng → nút Hôm nay "AI lên thực đơn các bữa còn lại" chỉ lên các bữa chưa ăn, mục tiêu = cả ngày − đã ăn (16/10).
// AI bị chặn (trả rỗng) → máy tự chọn món trong kho hoặc báo lỗi; nếu ra kết quả thì không có bữa sáng.
test("AI lên thực đơn các bữa còn lại: không tạo lại bữa đã ăn", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const s = S();
  const before = await todayRow();
  const sang = { meal_id: "sang", meal_name: "Bữa sáng", items: [it("phở bò", 450, 480, "carb", 25, 60, 12)] };
  const body = { user_id: s.uid, log_date: s.today, day_type: "train", meals: [sang], eaten_meals: ["sang"], total_cal: 480, total_protein: 25, total_carb: 60, total_fat: 12 };
  await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) });
  try {
    await login(page);
    // Tab Thực đơn: có lựa chọn "N bữa còn lại / Cả ngày", mặc định bữa còn lại
    const navB = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
    await navB("Thực đơn").click();
    await expect(page.getByTestId("menu-opt-scope")).toContainText("còn lại");
    await navB("Hôm nay").click();
    const btn = page.getByTestId("today-ai-menu");
    await expect(btn).toContainText("còn lại");
    await tap(btn);
    await expect(page.getByTestId("ai-total").or(page.getByTestId("ai-error")).or(page.getByTestId("ai-out-of-quota"))).toBeVisible({ timeout: 20_000 });
    if (await page.getByTestId("ai-total").count()) {
      await expect(page.getByTestId("ai-total")).toContainText("Các bữa còn lại");
      await expect(page.getByTestId("ai-meal-sang")).toHaveCount(0);
      await expect(page.getByTestId("ai-save-week")).toHaveCount(0);
      await page.screenshot({ path: "shots/thuc-don-ai-con-lai.png", fullPage: true });
    }
  } finally {
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(before) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    await ctx.close();
  }
});

// Áp thực đơn cả ngày (16/10): thay bữa chưa ăn đang có món → hỏi trước (Huỷ = không đổi gì); áp xong toast Hoàn tác
// trả lại đúng các bữa cũ (bữa trưa cũ quay lại, bữa tối thực đơn mới thêm bị xoá, bữa sáng đã ăn không bị đụng).
test("Áp thực đơn AI: hỏi trước khi thay bữa chưa ăn + Hoàn tác trả lại ngày cũ", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const before = await todayRow();
  const meal = (r, id) => (r?.meals || []).find((m) => m.meal_id === id);
  const sang = { meal_id: "sang", meal_name: "Bữa sáng", items: [it("bánh mì trứng", 200, 420, "carb", 15, 50, 16)] };
  const trua = { meal_id: "trua", meal_name: "Bữa trưa", items: [it("bún chả", 350, 520, "carb", 25, 60, 18)] };
  const body = { user_id: s.uid, log_date: s.today, day_type: "train", meals: [sang, trua], eaten_meals: ["sang"], total_cal: 940, total_protein: 40, total_carb: 110, total_fat: 34 };
  await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) });
  await rest(`ai_menu_cache?user_id=eq.${s.uid}`, { method: "DELETE" });
  await rest("ai_menu_cache", { method: "POST", body: JSON.stringify({ user_id: s.uid, menu_date: s.today, template: TEMPLATE }) });
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  try {
    await login(page);
    await nav("Thực đơn").click();
    await tap(page.getByTestId("menu-latest-ai"));
    await expect(page.getByTestId("ai-meal-trua")).toBeVisible();
    // Huỷ ở hộp hỏi → vẫn ở màn Thực đơn AI, DB không đổi
    await tap(page.getByTestId("ai-apply"));
    await expect(page.getByTestId("app-dialog")).toContainText("Thay 1 bữa chưa ăn (Trưa)");
    await page.screenshot({ path: "shots/ap-thuc-don-hoi.png" });
    await tap(page.getByTestId("confirm-cancel"));
    await expect(page.getByTestId("ai-meal-trua")).toBeVisible();
    await page.waitForTimeout(600);
    expect((meal(await todayRow(), "trua")?.items || []).map((i) => i.food)).toEqual(["bún chả"]);
    // Đồng ý → trưa + tối theo thực đơn, sáng (đã ăn) giữ nguyên
    await tap(page.getByTestId("ai-apply"));
    await tap(page.getByTestId("confirm-ok"));
    await waitDb(async () => { const r = await todayRow(); return (meal(r, "trua")?.items || []).some((i) => i.food === "cá kho tộ") && meal(r, "toi") && (meal(r, "sang")?.items || [])[0]?.food === "bánh mì trứng" && (r.eaten_meals || []).includes("sang"); }, "áp thực đơn: thay trưa, thêm tối, giữ sáng");
    await expect(page.getByTestId("toast")).toContainText("Đã áp thực đơn · bấm ✓ khi ăn xong từng bữa");
    await page.screenshot({ path: "shots/ap-thuc-don-hoan-tac.png" });
    // Hoàn tác → trưa về bún chả, không còn bữa tối, sáng vẫn đã ăn
    await tap(page.getByTestId("toast-action"));
    await waitDb(async () => {
      const r = await todayRow();
      const t = (meal(r, "trua")?.items || []).map((i) => i.food);
      return t.length === 1 && t[0] === "bún chả" && !((meal(r, "toi")?.items || []).length) && !((meal(r, "phu_chieu")?.items || []).length) && (meal(r, "sang")?.items || [])[0]?.food === "bánh mì trứng" && (r.eaten_meals || []).includes("sang") && !(r.eaten_meals || []).includes("trua");
    }, "Hoàn tác trả lại ngày cũ");
  } finally {
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(before) });
    else await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    await ctx.close();
  }
});
