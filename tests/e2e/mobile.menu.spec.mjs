import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow } from "./helpers.mjs";

const KEYS = ["thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7", "cn"];
// 0 = T2 … 6 = CN (như gymDays), từ chuỗi ngày YYYY-MM-DD
const idxOf = (d) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

// Tab Thực đơn: thẻ AI, Lịch tuần 7 ngày; dùng mẫu hôm nay, lưu hôm nay vào ngày khác, xoá ngày
test("Thực đơn: Lịch tuần dùng / lưu / xoá", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const ti = idxOf(s.today), other = (ti + 1) % 7;
  const tpl = async (k) => (await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${k}&select=day_name,meals`))[0] || null;
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  expect(await tpl(KEYS[ti])).not.toBeNull(); // global-setup đã tạo Lịch tuần cho hôm nay
  await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });

  try {
    await login(page);
    await nav("Thực đơn").click();
    await expect(page.getByTestId("menu-ai-card")).toBeVisible();
    await expect(page.getByTestId(`week-day-${ti}`)).toContainText("kcal");
    await page.screenshot({ path: "shots/thuc-don.png", fullPage: true });

    // Dùng mẫu của hôm nay → nhật ký hôm nay có bữa sáng + trưa
    await tap(page.getByTestId(`week-day-${ti}`));
    await expect(page.getByText("Bữa sáng").first()).toBeVisible();
    await page.screenshot({ path: "shots/lich-tuan-ngay.png", fullPage: true });
    await tap(page.getByTestId("day-use-today"));
    await waitDb(async () => {
      const ids = ((await todayRow())?.meals || []).filter((m) => (m.items || []).length).map((m) => m.meal_id);
      return ids.includes("sang") && ids.includes("trua");
    }, "áp mẫu hôm nay");

    // Lưu thực đơn hôm nay vào ngày kế tiếp (cùng loại: user test tập cả tuần)
    await tap(page.getByTestId(`week-day-${other}`));
    await tap(page.getByTestId("day-save-today"));
    await waitDb(async () => ((await tpl(KEYS[other]))?.meals || []).length >= 2, "lưu vào ngày kế");

    // Xoá ngày đó
    await page.getByRole("button", { name: "Quay lại" }).click();
    await tap(page.getByTestId(`week-day-${other}`));
    await tap(page.getByTestId("day-delete"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => (await tpl(KEYS[other])) === null, "xoá ngày kế");
    await expect(page.getByTestId(`week-day-${other}`)).toContainText("Chưa có thực đơn");
  } finally {
    await rest(`weekly_templates?user_id=eq.${s.uid}&day_name=eq.${KEYS[other]}`, { method: "DELETE" });
    await ctx.close();
  }
});
