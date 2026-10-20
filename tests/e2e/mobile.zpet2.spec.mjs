// Fipilot Pet (20/10, chủ dự án: "tk user chưa lên à? bên giảm béo check kỹ"): tài khoản KHÁCH THƯỜNG (không admin)
// — cờ "pet" tắt: không thấy thẻ Pi; cờ bật: thấy thẻ Pi ở Hôm nay cả bản Đầy đủ (gym) lẫn bản Gọn (giảm cân), mở được màn Pi + Cửa hàng.
// Hồ sơ (is_admin, ui_mode, goal_type) và cờ trả lại như cũ cuối bài.
import { test, expect } from "@playwright/test";
import { login, S, rest, tap } from "./helpers.mjs";

const KEEP = "is_admin,admin_role,ui_mode,goal_type,goal_kg,exercise_type,cut_pace";

test("Thú cưng Pi: khách thường — cờ tắt không thấy, cờ bật thấy ở bản gym và bản giảm cân", async ({ browser }) => {
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const flags = JSON.parse(flagsRow.value);
  const orig = (await rest(`profiles?id=eq.${s.uid}&select=${KEEP},kg`))[0];
  const setFlag = (on) => rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...flags, pet: on }) }) });
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    await expect(page.getByTestId("today-body")).toBeVisible({ timeout: 20_000 });
    return { ctx, page };
  };
  try {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: false, admin_role: null, ui_mode: "gym", goal_type: "bulk" }) });

    // 1) cờ tắt → khách không thấy Pi
    await setFlag(false);
    { const { ctx, page } = await open();
      await page.waitForTimeout(3_000);
      await expect(page.getByTestId("pet-today-card")).toHaveCount(0);
      await ctx.close(); }

    // 2) cờ bật, bản Đầy đủ (gym) → thấy thẻ Pi, mở màn Pi + Cửa hàng
    await setFlag(true);
    { const { ctx, page } = await open();
      await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
      await tap(page.getByTestId("pet-today-card"));
      await expect(page.getByTestId("pet-home")).toBeVisible();
      await expect(page.getByTestId("pet-actions")).toBeVisible();
      await tap(page.getByTestId("pet-open-shop"));
      await expect(page.getByTestId("pet-shop")).toBeVisible();
      // bộ Halloween (20/10 tối): có thanh bộ sưu tập, bấm vào thấy dòng lịch bán
      await tap(page.getByTestId("pet-col-halloween"));
      await expect(page.getByTestId("pet-col-note")).toBeVisible();
      await expect(page.getByTestId("pet-shop").getByText("Mũ bí ngô")).toBeVisible();
      // Bóng đá (mặc định đóng) + Trung thu (chưa tới rằm): xem được, có dòng chưa mở bán
      for (const k of ["bong-da", "trung-thu"]) {
        await tap(page.getByTestId(`pet-col-${k}`));
        await expect(page.getByTestId("pet-col-note")).toBeVisible();
      }
      await expect(page.getByTestId("pet-shop").getByText("Đèn ông sao")).toBeVisible();
      await page.screenshot({ path: "shots/pet-user-gym.png" });
      await ctx.close(); }

    // 3) cờ bật, bản Gọn (giảm cân) → vẫn thấy thẻ Pi ở Hôm nay, mở được màn Pi
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ui_mode: "loss", goal_type: "cut", exercise_type: "none", cut_pace: "mid", goal_kg: Math.max(45, Math.round(Number(orig.kg || 70) - 6)) }) });
    { const { ctx, page } = await open();
      await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
      await page.screenshot({ path: "shots/pet-user-loss-today.png" });
      await tap(page.getByTestId("pet-today-card"));
      await expect(page.getByTestId("pet-home")).toBeVisible();
      await page.screenshot({ path: "shots/pet-user-loss-pet.png" });
      await ctx.close(); }
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) }).catch(() => {});
    const back = Object.fromEntries(KEEP.split(",").map((k) => [k, orig[k] ?? null]));
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(back) }).catch(() => {});
  }
});
