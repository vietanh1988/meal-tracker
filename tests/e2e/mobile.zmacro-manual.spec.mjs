// 13/11 (chủ dự án duyệt bản vẽ "Tự nhập macro theo giai đoạn"): Mục tiêu & macro › Cách đặt macro › Tự nhập số.
// 14/11: bỏ mẫu nhanh — gõ số kiểu mini cut (tinh bột 0) → calo = tổng 3 chất, Hôm nay "Tự nhập · còn N ngày";
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
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ tier: "premium", macro_manual: null, ui_mode: "gym" }) });
    await login(page);
    await nav("Tôi").click();
    await page.getByTestId("me-profile-card").click();
    await expect(page.getByTestId("goals-macro-auto")).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
    const autoCal = Number(await page.getByTestId("goals-macro").getAttribute("data-cal"));

    // Tự nhập số → mở ngay trong danh sách chế độ ăn (không sang màn khác), gõ số kiểu mini cut
    await tap(page.getByTestId("goals-macro-manual"));
    await expect(page.getByTestId("diet-sheet")).toBeVisible();
    await expect(page.getByTestId("mm-block")).toBeVisible();
    await expect(page.getByTestId("diet-keto")).toHaveCount(0); // tăng cơ: Keto ẩn khi đang mở tự nhập
    await expect(page.getByTestId("mm-preset-mini_cut")).toHaveCount(0); // 14/11: bỏ mẫu nhanh, chỉ khung nhập
    expect(Number(await page.getByTestId("mm-p").inputValue())).toBeGreaterThan(0); // mở sẵn số app tính
    const p = 195, f = 90;
    await page.getByTestId("mm-p").fill(String(p));
    await page.getByTestId("mm-f").fill(String(f));
    await page.getByTestId("mm-c").fill("0");
    await page.getByTestId("mm-crest").fill("0");
    await expect(page.getByTestId("mm-sum")).toHaveAttribute("data-cal", String(p * 4 + f * 9));
    await expect(page.getByTestId("mm-compare")).toContainText("App gợi ý");
    // 14/11: thời hạn = Luôn luôn / 4 tuần / 8 tuần / Chọn ngày (lịch tự vẽ tô cả khoảng)
    const dm = (d) => `${d.slice(8)}/${d.slice(5, 7)}`;
    const span = (d) => `${dm(today)} → ${dm(d)}`;
    await expect(page.getByTestId("mm-w4")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("mm-until")).toContainText(span(addDays(today, 27)));
    await tap(page.getByTestId("mm-w8"));
    await expect(page.getByTestId("mm-until")).toContainText(span(addDays(today, 55)));
    await tap(page.getByTestId("mm-always"));
    await expect(page.getByTestId("mm-until")).toHaveText("Không hết hạn");
    const goMonth = async (d) => { // lịch mở ở tháng của ngày kết thúc; lật tới tháng có ngày d
      for (let k = 0; k < 4; k++) {
        const m = await page.getByTestId("mm-cal-month").getAttribute("data-month");
        if (m === d.slice(0, 7)) return;
        await tap(page.getByRole("button", { name: m < d.slice(0, 7) ? "Tháng sau" : "Tháng trước" }));
      }
    };
    await tap(page.getByTestId("mm-pick"));
    await expect(page.getByTestId("mm-cal")).toBeVisible();
    await goMonth(today);
    if (today.slice(8) !== "01") await expect(page.getByTestId(`mm-cal-${addDays(today, -1)}`)).toBeDisabled(); // ngày đã qua không chọn được
    const end = addDays(today, 9);
    await goMonth(end);
    await tap(page.getByTestId(`mm-cal-${end}`));
    await expect(page.getByTestId("mm-until")).toContainText(`${span(end)} · 10 ngày`);
    await expect(page.getByTestId(`mm-cal-${end}`)).toHaveAttribute("aria-pressed", "true");
    await tap(page.getByTestId("mm-w4"));
    await expect(page.getByTestId("mm-cal")).toHaveCount(0);
    await tap(page.getByTestId("mm-pick"));
    const t41 = addDays(today, 41);
    await goMonth(t41);
    await tap(page.getByTestId(`mm-cal-${t41}`));
    await expect(page.getByTestId("mm-until")).toContainText(`${span(addDays(today, 41))} · 42 ngày`);
    const box = await page.getByTestId("mm-save").boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "shots/tu-nhap-macro.png" });
    await tap(page.getByTestId("mm-save"));
    await waitDb(async () => (await prof()).macro_manual?.on === true, "macro_manual.on");
    await expect(page.getByTestId("diet-sheet")).toHaveCount(0);
    const mm = (await prof()).macro_manual;
    expect(mm).toMatchObject({ p, f, c: 0, cRest: 0, preset: "custom", until: addDays(today, 41) });

    // Mục tiêu & macro hiện số tự nhập + nhãn
    await expect(page.getByTestId("goals-macro")).toHaveAttribute("data-cal", String(p * 4 + f * 9));
    await expect(page.getByTestId("goals-manual-foot")).toContainText("Tự nhập");
    await expect(page.getByTestId("goals-manual-foot")).toContainText(`App gợi ý`);
    await expect(page.getByTestId("goals-macro-manual")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/muc-tieu-tu-nhap.png" });

    // Hôm nay dùng số tự nhập
    await page.goBack().catch(() => {});
    await page.goto("/");
    await nav("Hôm nay").click();
    await expect(page.getByTestId("diet-name")).toHaveText("Tự nhập macro", { timeout: 20_000 }); // viên chế độ ăn
    await expect(page.getByTestId("goal-sub")).toContainText("42 ngày");
    await expect(page.getByTestId("diet-pick")).toHaveAttribute("aria-label", /còn 42 ngày/);
    await expect(page.getByTestId("focus-suggest-foods")).toHaveCount(0); // tự nhập số → Hôm nay không gợi ý món
    await expect(page.getByTestId("today-ai-menu")).toHaveCount(0); // không có nút AI lên thực đơn

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
    await expect(page.getByTestId("mm-end-sheet")).toContainText("tự nhập macro");
    await tap(page.getByTestId("mm-end-extend"));
    await waitDb(async () => (await prof()).macro_manual?.until === addDays(today, 13), "gia hạn 2 tuần");
    await expect(page.getByTestId("mm-end-sheet")).toHaveCount(0);
    await nav("Hôm nay").click(); // app nhớ tab cuối (Tôi) → về Hôm nay
    await expect(page.getByTestId("goal-sub")).toContainText("14 ngày");
    expect(errs).toEqual([]);
  } finally {
    await ctx.close().catch(() => {}); // đóng app trước: lượt lưu hồ sơ còn chờ không ghi đè bản khôi phục
    const back = { tier: before?.tier ?? "free", macro_manual: before?.macro_manual ?? null, ui_mode: before?.ui_mode ?? null };
    for (let k = 0; k < 3; k++) { // khôi phục chắc chắn: bài sau (zedit, zy-journeys…) cần hồ sơ thường, không ở chế độ tự nhập
      await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(back) });
      await new Promise((r) => setTimeout(r, 800));
      if (!(await prof()).macro_manual?.on) break;
    }
  }
});
