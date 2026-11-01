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
    await expect(push.getByTestId("wk-photo")).toBeVisible();
    await push.getByRole("button").first().click();
    await expect(page.getByTestId("wk-ex-detail")).toBeVisible();
    await expect(page.getByTestId("wk-ex-en")).toHaveText("Push-up");
    await expect(page.getByTestId("wk-ex-target-main")).toContainText("Ngực giữa"); // 01/11: khối Tác động vào
    await expect(page.getByTestId("wk-ex-target-sub")).toContainText("Bắp tay sau");
    // ảnh người thật 2 khung tải được (không còn hình nét)
    const big = page.getByTestId("wk-photo-big");
    await expect(big).toBeVisible();
    await expect.poll(() => big.locator("img").first().evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    await big.click();
    await expect(big).toHaveAttribute("data-paused", "1");
    await page.screenshot({ path: "shots/tap-chi-tiet.png" });
    await page.getByTestId("wk-ex-add").click();
    await page.getByTestId("wk-addto-0").click();
    await waitDb(async () => ((await rest(`workout_plans?user_id=eq.${s.uid}&active=is.true&select=days`))[0]?.days?.["0"]?.items || []).some((i) => i.ex === "push-up"), "đã thêm Hít đất vào T2");
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    // bài tự thêm
    await page.getByTestId("wk-custom-open").click();
    await page.getByTestId("wk-custom-vi").fill("Ép ngực máy tự chế");
    await page.getByTestId("wk-custom-en").fill("Homemade Chest Press");
    await page.getByTestId("wk-custom-save").click();
    await page.getByTestId("wk-lib-search").fill("tu che");
    await expect(page.getByTestId("wk-lib-row").filter({ hasText: "Ép ngực máy tự chế" })).toBeVisible();
    await expect(page.getByTestId("wk-lib-row").filter({ hasText: "Ép ngực máy tự chế" }).getByTestId("wk-nophoto")).toBeVisible(); // bài tự thêm: ô nhóm cơ, không ảnh
    await waitDb(async () => (await rest(`user_exercises?user_id=eq.${s.uid}&select=vi`)).length === 1, "bài tự thêm lưu máy chủ");

    // 3 · sửa lịch: đặt 1 ngày thành ngày nghỉ → Lịch tập (gym_days) đổi theo
    await page.getByTestId("wk-tab-plan").click();
    await page.getByTestId(`wk-day-${restDow}`).click();
    await expect(page.getByTestId("wk-day-editor")).toBeVisible();
    // thêm bài từ Thư viện trong Sửa buổi: Chọn bài mở đè, chọn xong quay lại vẫn còn bài vừa thêm
    const nItems = await page.getByTestId("wk-day-item").count();
    await page.getByTestId("wk-day-add").click();
    await page.getByTestId("wk-lib-search").fill("plank");
    await page.locator('[data-testid="wk-lib-row"][data-id="plank"]').getByTestId("wk-lib-add").click();
    await expect(page.getByTestId("wk-day-editor")).toBeVisible();
    await expect(page.getByTestId("wk-day-item")).toHaveCount(nItems + 1);
    const sb = await page.getByTestId("wk-day-save").boundingBox(); // 01/11: nút Lưu ở thanh dưới đáy, rộng hết màn
    expect(sb.y).toBeGreaterThan(844 - 120); expect(Math.round(sb.height)).toBe(50);
    await page.getByTestId("wk-day-save").click();
    await waitDb(async () => ((await rest(`workout_plans?user_id=eq.${s.uid}&active=is.true&select=days`))[0]?.days?.[String(restDow)]?.items || []).some((i) => i.ex === "plank"), "đã thêm Plank vào buổi");
    await page.getByTestId(`wk-day-${restDow}`).click();
    await page.getByTestId("wk-day-rest").click();
    await expect(page.getByTestId(`wk-day-${restDow}`)).toHaveAttribute("data-rest", "1");
    await waitDb(async () => { const g = (await rest(`profiles?id=eq.${s.uid}&select=gym_days`))[0]?.gym_days || []; return g.length === 6 && !g.includes(restDow); }, "Lịch tập bỏ ngày nghỉ", 15_000);

    // 3b · (01/11) Lịch tập đổi ở chỗ khác, cùng số buổi → mở Tập luyện thì giáo án tự xếp lại theo lịch mới
    const planDaysDb = async () => Object.keys((await rest(`workout_plans?user_id=eq.${s.uid}&active=is.true&select=days`))[0]?.days || {}).map(Number).sort();
    const g6 = ((await rest(`profiles?id=eq.${s.uid}&select=gym_days`))[0].gym_days).map(Number).sort();
    const moveOut = g6.find((d) => d !== todayDow);
    const g6b = [...g6.filter((d) => d !== moveOut), restDow].sort();
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ gym_days: g6b }) });
    await page.reload();
    await page.getByTestId("wk-btn").click();
    await expect(page.getByTestId("toast")).toContainText("Đã xếp lại giáo án theo lịch tập mới", { timeout: 15_000 });
    await waitDb(async () => (await planDaysDb()).join() === g6b.join(), "giáo án theo lịch tập mới");
    // bớt 1 ngày → hỏi trước; Giữ → dòng nhắc; Xếp theo lịch tập → giáo án còn 5 buổi
    const drop = g6b.find((d) => d !== todayDow);
    const g5 = g6b.filter((d) => d !== drop);
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ gym_days: g5 }) });
    await page.reload();
    await page.getByTestId("wk-btn").click();
    await expect(page.getByTestId("wk-ask")).toContainText("còn 5 buổi");
    await page.getByTestId("wk-ask-keep").click();
    await expect(page.getByTestId("wk-lag")).toBeVisible();
    expect((await planDaysDb()).length).toBe(6); // Giữ → không tự xoá buổi
    await page.getByTestId("wk-lag-fix").click();
    await waitDb(async () => (await planDaysDb()).join() === g5.join(), "giáo án còn 5 buổi theo lịch");
    await expect(page.getByTestId("wk-lag")).toHaveCount(0);

    // 4 · đầu tab Giáo án có thẻ Buổi tập hôm nay (nút Tập luyện có chấm tím) → ghi 10 hiệp → Xong → +20 Hạt
    await expect(page.getByTestId("wk-card")).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "shots/tap-hom-nay.png" });
    await page.getByTestId("wk-card-start").click();
    await expect(page.getByTestId("wk-session")).toBeVisible();
    const ticks = page.getByTestId("wk-set-tick");
    for (let k = 0; k < 10; k++) { await ticks.nth(k).scrollIntoViewIfNeeded(); await ticks.nth(k).click(); }
    await expect(page.locator('[data-testid="wk-set"][data-done="1"]')).toHaveCount(10);
    await expect(page.getByTestId("wk-rest")).toBeVisible();
    // chạm ảnh bài → xem cách tập (không có nút Thêm), quay lại vẫn còn 10 hiệp đã tick
    await page.getByTestId("wk-ses-photo").first().click();
    await expect(page.getByTestId("wk-ex-detail")).toBeVisible();
    await expect(page.getByTestId("wk-ex-add")).toHaveCount(0);
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await expect(page.getByTestId("wk-ex-detail")).toHaveCount(0);
    await expect(page.locator('[data-testid="wk-set"][data-done="1"]')).toHaveCount(10);
    // Đổi bài cuối: chọn bài khác, các hiệp đã tick giữ nguyên
    const lastEx = page.getByTestId("wk-ses-ex").last();
    const oldName = await lastEx.locator("b").first().textContent();
    await lastEx.getByTestId("wk-ses-swap").click();
    const firstPick = page.getByTestId("wk-lib-row").filter({ hasNotText: oldName }).first();
    const newName = (await firstPick.locator("b").first().textContent()).trim();
    await firstPick.getByTestId("wk-lib-add").click();
    await expect(page.getByTestId("wk-session")).toBeVisible();
    await expect(page.getByTestId("wk-ses-ex").last().locator("b").first()).toHaveText(newName);
    await expect(page.locator('[data-testid="wk-set"][data-done="1"]')).toHaveCount(10);
    await page.getByTestId("wk-rest-skip").click();
    await page.screenshot({ path: "shots/tap-ghi-buoi.png" });
    await page.getByTestId("wk-ses-finish").click();
    await expect(page.getByTestId("wk-done")).toBeVisible();
    // trần Hạt ngày (120) có thể đã đầy do các bài E2E chạy trước trong ngày (Hạt bữa ăn theo giờ) → dọn Hạt hôm nay của tài khoản test
    await rest(`pet_ledger?user_id=eq.${s.uid}&day=gte.${s.today.slice(0, 8)}01&kind=not.in.(onboard,invite,rank,admin)`, { method: "DELETE" });
    const claimRes = page.waitForResponse((r) => r.url().includes("pet_workout_claim"), { timeout: 10_000 }).then((r) => r.text()).catch((e) => `không có phản hồi: ${e.message}`);
    await page.getByTestId("wk-done-claim").click();
    const claimBody = await claimRes;
    const sesDb = (await rest(`workout_sessions?user_id=eq.${s.uid}&select=day,ended_at,items`)).map((x) => ({ day: x.day, ended: !!x.ended_at, done: (x.items || []).flatMap((i) => i.sets || []).filter((st) => st.done).length }));
    expect((() => { try { return JSON.parse(claimBody).ok; } catch { return false; } })(), `máy chủ trả: ${claimBody} · buổi trong DB: ${JSON.stringify(sesDb)} · hôm nay ${s.today}`).toBe(true);
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
