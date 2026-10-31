// 01/11 (chốt bản vẽ "Tập luyện"): chọn giáo án mẫu → Thư viện (tên Việt + tên Anh, tìm không dấu, bài tự thêm) → sửa lịch (đặt ngày nghỉ, Lịch tập đổi theo)
// → Hôm nay có thẻ Buổi tập → ghi 10 hiệp → Xong → Pi +20 Hạt (máy chủ chấm) → Nhật ký.
import { test, expect } from "@playwright/test";
import { login, S, rest, waitDb, tap } from "./helpers.mjs";

test("Tập luyện: giáo án, thư viện, sửa lịch, ghi buổi tập, thưởng Hạt", async ({ browser }) => {
  test.setTimeout(150_000);
  const s = S();
  const prof0 = (await rest(`profiles?id=eq.${s.uid}&select=gym_days`))[0];
  const clean = async () => {
    await rest(`workout_sessions?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`workout_plans?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`user_exercises?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.workout`, { method: "DELETE" });
  };
  const todayDow = (new Date(`${s.today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const restDow = (todayDow + 1) % 7;
  try {
    await clean();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);

    // 1 · nút Tập luyện cạnh chuông (không có thẻ ở Hôm nay) → chưa có giáo án → chọn mẫu Đẩy · Kéo · Chân
    await expect(page.getByTestId("wk-card-invite")).toHaveCount(0);
    const [wb, bell] = [await page.getByTestId("wk-btn").boundingBox(), await page.getByTestId("bell").boundingBox()];
    expect(Math.round(wb.width)).toBe(42);
    expect(wb.x).toBeLessThan(bell.x);
    await page.getByTestId("wk-btn").click();
    await expect(page.getByTestId("wk-plan-empty")).toBeVisible();
    await page.getByTestId("wk-tpl-day-keo-chan").click();
    await expect(page.getByTestId("wk-plan")).toBeVisible();
    await waitDb(async () => (await rest(`workout_plans?user_id=eq.${s.uid}&active=is.true&select=name`))[0]?.name === "Đẩy · Kéo · Chân", "giáo án đang dùng");
    await expect(page.getByTestId("wk-day-0")).toContainText("Ngực – Vai – Tay sau");
    await page.screenshot({ path: "shots/tap-giao-an.png" });

    // 2 · Thư viện: tìm tên Anh / không dấu, chi tiết có tên Anh, thêm vào buổi
    await page.getByTestId("wk-tab-lib").click();
    await page.getByTestId("wk-lib-search").fill("bench press");
    const bench = page.locator('[data-testid="wk-lib-row"][data-id="barbell-bench-press"]');
    await expect(bench).toContainText("(Barbell Bench Press)");
    await page.getByTestId("wk-lib-search").fill("hit dat");
    const push = page.locator('[data-testid="wk-lib-row"][data-id="push-up"]');
    await expect(push).toBeVisible();
    await push.getByRole("button").first().click();
    await expect(page.getByTestId("wk-ex-detail")).toBeVisible();
    await expect(page.getByTestId("wk-ex-en")).toHaveText("Push-up");
    await page.screenshot({ path: "shots/tap-chi-tiet.png" });
    await page.getByTestId("wk-ex-add").click();
    await page.getByTestId("wk-addto-0").click();
    await waitDb(async () => ((await rest(`workout_plans?user_id=eq.${s.uid}&active=is.true&select=days`))[0]?.days?.["0"]?.items || []).some((i) => i.ex === "push-up"), "đã thêm Hít đất vào T2");
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    // bài tự thêm
    await page.getByTestId("wk-custom-open").click();
    await page.getByTestId("wk-custom-vi").fill("Đẩy ngực máy Smith");
    await page.getByTestId("wk-custom-en").fill("Smith Machine Press");
    await page.getByTestId("wk-custom-save").click();
    await page.getByTestId("wk-lib-search").fill("smith");
    await expect(page.getByTestId("wk-lib-row").filter({ hasText: "Đẩy ngực máy Smith" })).toBeVisible();
    await waitDb(async () => (await rest(`user_exercises?user_id=eq.${s.uid}&select=vi`)).length === 1, "bài tự thêm lưu máy chủ");

    // 3 · sửa lịch: đặt 1 ngày thành ngày nghỉ → Lịch tập (gym_days) đổi theo
    await page.getByTestId("wk-tab-plan").click();
    await page.getByTestId(`wk-day-${restDow}`).click();
    await expect(page.getByTestId("wk-day-editor")).toBeVisible();
    await page.getByTestId("wk-day-rest").click();
    await expect(page.getByTestId(`wk-day-${restDow}`)).toHaveAttribute("data-rest", "1");
    await waitDb(async () => { const g = (await rest(`profiles?id=eq.${s.uid}&select=gym_days`))[0]?.gym_days || []; return g.length === 6 && !g.includes(restDow); }, "Lịch tập bỏ ngày nghỉ", 15_000);

    // 4 · đầu tab Giáo án có thẻ Buổi tập hôm nay (nút Tập luyện có chấm tím) → ghi 10 hiệp → Xong → +20 Hạt
    await expect(page.getByTestId("wk-card")).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "shots/tap-hom-nay.png" });
    await page.getByTestId("wk-card-start").click();
    await expect(page.getByTestId("wk-session")).toBeVisible();
    const ticks = page.getByTestId("wk-set-tick");
    for (let k = 0; k < 10; k++) { await ticks.nth(k).scrollIntoViewIfNeeded(); await ticks.nth(k).click(); }
    await expect(page.locator('[data-testid="wk-set"][data-done="1"]')).toHaveCount(10);
    await expect(page.getByTestId("wk-rest")).toBeVisible();
    await page.getByTestId("wk-rest-skip").click();
    await page.screenshot({ path: "shots/tap-ghi-buoi.png" });
    await page.getByTestId("wk-ses-finish").click();
    await expect(page.getByTestId("wk-done")).toBeVisible();
    await page.getByTestId("wk-done-claim").click();
    await expect(page.getByTestId("wk-done-claim")).toHaveText("Đã nhận +20 Hạt", { timeout: 10_000 });
    await waitDb(async () => (await rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.workout&select=amount`))[0]?.amount === 20, "Hạt buổi tập");
    const ses = (await rest(`workout_sessions?user_id=eq.${s.uid}&select=sets_done,ended_at,day`))[0];
    expect(ses.sets_done).toBe(10); expect(ses.ended_at).toBeTruthy(); expect(ses.day).toBe(s.today);
    await page.screenshot({ path: "shots/tap-xong.png" });
    await page.getByTestId("wk-done-log").click();
    await expect(page.getByTestId("wk-log-row")).toHaveCount(1);
    await page.getByTestId("wk-tab-plan").click();
    await expect(page.getByTestId("wk-card-done")).toBeVisible();
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await expect(page.getByTestId("wk-btn")).toBeVisible();
    await expect(page.getByTestId("wk-btn-dot")).toHaveCount(0); // đã tập xong hôm nay → hết chấm
    await ctx.close();
  } finally {
    await clean().catch(() => {});
    if (prof0) await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ gym_days: prof0.gym_days }) }).catch(() => {});
  }
});
