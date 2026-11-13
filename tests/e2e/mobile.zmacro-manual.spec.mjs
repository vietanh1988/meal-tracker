// 13/11 (chủ dự án duyệt bản vẽ "Tự nhập macro theo giai đoạn"): Mục tiêu & macro › Cách đặt macro › Tự nhập số.
// Mẫu Mini cut (tinh bột 0) → calo = tổng 3 chất, Hôm nay dùng số tự nhập + "Mini cut · còn N ngày";
// về App tự tính; hết hạn → hộp hỏi 1 lần, Gia hạn thêm 2 tuần.
import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";
import { todayVN, addDays } from "../../src/lib/dateVN.js";

test("Tự nhập macro: mini cut, về app tự tính, hết hạn thì hỏi gia hạn", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  const s = S();
  const prof = async () => (await rest(`profiles?id=eq.${s.uid}&select=tier,macro_manual,ui_mode`))[0];
  const before = await prof();
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  const today = todayVN();
  try {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ tier: "premium", macro_manual: null, ui_mode: "full" }) });
    await login(page);
    await nav("Tôi").click();
    await page.getByTestId("me-profile-card").click();
    await expect(page.getByTestId("goals-macro-auto")).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
    const autoCal = Number(await page.getByTestId("goals-macro").getAttribute("data-cal"));

    // Tự nhập số → mẫu Mini cut
    await tap(page.getByTestId("goals-macro-manual"));
    await expect(page.getByTestId("mm-screen")).toBeVisible();
    await tap(page.getByTestId("mm-preset-mini_cut"));
    await expect(page.getByTestId("mm-c")).toHaveValue("0");
    await expect(page.getByTestId("mm-crest")).toHaveValue("0");
    const p = Number(await page.getByTestId("mm-p").inputValue());
    const f = Number(await page.getByTestId("mm-f").inputValue());
    expect(p).toBeGreaterThan(80);
    await expect(page.getByTestId("mm-sum")).toHaveAttribute("data-cal", String(p * 4 + f * 9));
    await expect(page.getByTestId("mm-compare")).toContainText(`App gợi ý`);
    await expect(page.getByTestId("mm-until")).toHaveAttribute("aria-pressed", "true");
    const box = await page.getByTestId("mm-save").boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "shots/tu-nhap-macro.png" });
    await tap(page.getByTestId("mm-save"));
    await waitDb(async () => (await prof()).macro_manual?.on === true, "macro_manual.on");
    const mm = (await prof()).macro_manual;
    expect(mm).toMatchObject({ p, f, c: 0, cRest: 0, preset: "mini_cut", until: addDays(today, 41) });

    // Mục tiêu & macro hiện số tự nhập + nhãn
    await expect(page.getByTestId("goals-macro")).toHaveAttribute("data-cal", String(p * 4 + f * 9));
    await expect(page.getByTestId("goals-manual-foot")).toContainText("Mini cut");
    await expect(page.getByTestId("goals-manual-foot")).toContainText(`App gợi ý`);
    await expect(page.getByTestId("goals-macro-manual")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/muc-tieu-tu-nhap.png" });

    // Hôm nay dùng số tự nhập
    await page.goBack().catch(() => {});
    await page.goto("/");
    await nav("Hôm nay").click();
    await expect(page.getByTestId("goal-sub")).toContainText("Mini cut · còn 42 ngày", { timeout: 20_000 });

    // Về app tự tính
    await nav("Tôi").click();
    await page.getByTestId("me-profile-card").click();
    await tap(page.getByTestId("goals-macro-auto"));
    await waitDb(async () => (await prof()).macro_manual?.on === false, "macro_manual.on = false");
    await expect(page.getByTestId("goals-manual-foot")).toHaveCount(0);
    await expect.poll(async () => Number(await page.getByTestId("goals-macro").getAttribute("data-cal"))).toBe(autoCal);

    // Hết hạn → hộp hỏi 1 lần → Gia hạn 2 tuần
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ macro_manual: { ...mm, on: true, until: addDays(today, -1), since: addDays(today, -42) } }) });
    await page.goto("/");
    await expect(page.getByTestId("mm-end-sheet")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("mm-end-sheet")).toContainText("Mini cut");
    await tap(page.getByTestId("mm-end-extend"));
    await waitDb(async () => (await prof()).macro_manual?.until === addDays(today, 13), "gia hạn 2 tuần");
    await expect(page.getByTestId("mm-end-sheet")).toHaveCount(0);
    await expect(page.getByTestId("goal-sub")).toContainText("còn 14 ngày");
    expect(errs).toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ tier: before?.tier ?? "free", macro_manual: before?.macro_manual ?? null, ui_mode: before?.ui_mode ?? null }) });
    await ctx.close();
  }
});
