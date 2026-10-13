import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow } from "./helpers.mjs";

// Thực đơn AI (không gọi AI thật): mở thực đơn AI đã lưu → Đổi món (tính trước kcal) → Lưu mẫu vào Lịch tuần → Áp dụng hôm nay.
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

    // Lên thực đơn: hiện màn đang tạo, Huỷ thì về lại tab (AI bị chặn trong E2E, không tốn tiền)
    await tap(page.getByTestId("menu-generate"));
    await expect(page.getByTestId("ai-loading")).toBeVisible();
    await tap(page.getByTestId("ai-loading").getByRole("button", { name: "Huỷ" }));
    await expect(page.getByTestId("menu-ai-card")).toBeVisible();

    console.log("BƯỚC: Mở thực đơn AI đã lưu");
    // Mở thực đơn AI đã lưu
    await tap(page.getByTestId("menu-latest-ai"));
    await expect(page.getByTestId("ai-meal-trua")).toBeVisible();
    await page.screenshot({ path: "shots/thuc-don-ai.png", fullPage: true });

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

    console.log("BƯỚC: Áp dụng hôm nay");
    // Áp dụng hôm nay → nhật ký hôm nay có 3 bữa, trưa không còn Cá kho tộ
    await tap(page.getByTestId("ai-apply"));
    await waitDb(async () => {
      const ms = ((await todayRow())?.meals || []).filter((m) => (m.items || []).length);
      const trua = ms.find((m) => m.meal_id === "trua");
      return ms.length >= 3 && trua && !trua.items.some((i) => i.food === "cá kho tộ");
    }, "áp thực đơn AI hôm nay");
  } finally {
    await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });
    await ctx.close();
  }
});
