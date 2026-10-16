import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, swipeDown, confirmIfAsked } from "./helpers.mjs";
import { addDays } from "../../src/lib/dateVN.js";

const KEYS = ["thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7", "cn"];
// 0 = T2 … 6 = CN (như gymDays), từ chuỗi ngày YYYY-MM-DD
const idxOf = (d) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

// Tab Thực đơn (bản gọn 13/10): thẻ Hôm nay, Thực đơn của tôi (ngày đã ăn) → dùng cho hôm nay,
// đặt lặp lại hằng tuần → bỏ lặp lại; lặp lại có sẵn của hôm nay → dùng cho hôm nay
test("Thực đơn: ngày đã ăn → dùng hôm nay, lặp lại hằng tuần, bỏ lặp lại", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const ti = idxOf(s.today), other = (ti + 1) % 7;
  const past = addDays(s.today, -3);
  const tpl = async (k) => (await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${k}&select=day_name,meals`))[0] || null;
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  expect(await tpl(KEYS[ti])).not.toBeNull(); // global-setup đã tạo lặp lại cho thứ hôm nay
  await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
  await rest("daily_logs", { method: "POST", body: JSON.stringify({ user_id: s.uid, log_date: past, day_type: "train",
    meals: [
      { meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "phở bò", gram: 400, cal: 340, p: 26, c: 39, f: 8 }] },
      { meal_id: "phu_chieu", meal_name: "Phụ chiều", items: [{ food: "chuối", gram: 120, cal: 107, p: 1, c: 27, f: 0 }] },
    ], eaten_meals: ["sang", "phu_chieu"], total_cal: 447 }) });

  try {
    await login(page);
    await nav("Thực đơn").click();
    await expect(page.getByTestId("menu-today")).toBeVisible();
    await expect(page.getByTestId("menu-ai-card")).toBeVisible();
    await expect(page.getByTestId(`week-day-${ti}`)).toHaveAttribute("data-set", "1");
    await expect(page.getByTestId(`week-day-${other}`)).toHaveAttribute("data-set", "0"); // dải 7 thứ luôn hiện (bản vẽ 90)
    await page.screenshot({ path: "shots/thuc-don.png", fullPage: true });
    // Sheet tuỳ chọn AI (bản vẽ 91): mở từ viên trên thẻ tím, chọn món không ăn bằng chip
    await tap(page.getByTestId("menu-opt-avoid"));
    await expect(page.getByTestId("menu-opt-sheet")).toBeVisible();
    await tap(page.getByTestId("menu-avoid-chip-hải sản"));
    await expect(page.getByTestId("menu-avoid-chip-hải sản")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/thuc-don-tuy-chon.png" });
    await tap(page.getByTestId("menu-avoid-chip-hải sản"));
    await swipeDown(page.getByTestId("menu-opt-sheet")); // vuốt thanh nắm xuống để đóng
    await expect(page.getByTestId("menu-opt-sheet")).toHaveCount(0);

    // Lặp lại có sẵn của thứ hôm nay → dùng cho hôm nay
    await tap(page.getByTestId(`week-day-${ti}`));
    await expect(page.getByText("Bữa sáng").first()).toBeVisible();
    // Màn phụ phải có nền đặc, không lộ màn bên dưới (lỗi 14/10)
    const bg = await page.getByTestId("subpage").last().evaluate((el) => { const s = getComputedStyle(el); return { c: s.backgroundColor, i: s.backgroundImage }; });
    expect(bg.c !== "rgba(0, 0, 0, 0)" || bg.i !== "none", `nền màn phụ trong suốt: ${JSON.stringify(bg)}`).toBe(true);
    expect(bg.i, "màn phụ sáng dùng nền xanh nhạt LT").toMatch(/211, 226, 255/);
    await page.screenshot({ path: "shots/lich-tuan-ngay.png", fullPage: true });
    await tap(page.getByTestId("day-use-today"));
    await confirmIfAsked(page); // 16/10: chỉ hỏi khi thay bữa chưa ăn đang có món
    await waitDb(async () => {
      const ids = ((await todayRow())?.meals || []).filter((m) => (m.items || []).length).map((m) => m.meal_id);
      return ids.includes("sang") && ids.includes("trua");
    }, "áp lặp lại hôm nay");

    // Ngày đã ăn (3 ngày trước) → dùng cho hôm nay: thêm bữa phụ chiều
    await tap(page.getByTestId(`menu-past-${past}`));
    await expect(page.getByText("Phụ chiều").first()).toBeVisible();
    await tap(page.getByTestId("past-use-today"));
    // Bữa sáng hôm nay (nếu chưa ăn, có món từ lặp lại) sẽ bị thay → hỏi "Thay 1 bữa chưa ăn (Sáng) …"
    await confirmIfAsked(page);
    await waitDb(async () => ((await todayRow())?.meals || []).some((m) => m.meal_id === "phu_chieu" && (m.items || []).some((i) => i.food === "chuối")), "dùng ngày đã ăn cho hôm nay");

    // Đặt lặp lại hằng tuần vào thứ kế tiếp (user test tập cả tuần)
    await tap(page.getByTestId(`menu-past-${past}`));
    await tap(page.getByTestId("past-repeat"));
    await tap(page.getByTestId(`save-week-${other}`));
    await tap(page.getByTestId("save-week-confirm"));
    await waitDb(async () => ((await tpl(KEYS[other]))?.meals || []).length === 2, "lặp lại thứ kế");
    await page.getByRole("button", { name: "Quay lại" }).click();

    // Bỏ lặp lại
    await tap(page.getByTestId(`week-day-${other}`));
    await tap(page.getByTestId("day-delete"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => (await tpl(KEYS[other])) === null, "bỏ lặp lại thứ kế");
    await expect(page.getByTestId(`week-day-${other}`)).toHaveAttribute("data-set", "0");
  } finally {
    await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${past}`, { method: "DELETE" });
    await ctx.close();
  }
});
