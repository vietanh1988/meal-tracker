import { test, expect } from "@playwright/test";
import { login, todayRow, rest, S, waitDb, kcalRemainMobile, tap, focusMealId } from "./helpers.mjs";

test.describe.serial("Mobile — luồng hằng ngày (giao diện app mới)", () => {
  let page;
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
    page.on("dialog", (d) => d.accept());
  });

  test.afterEach(async ({}, info) => {
    if (info.status !== info.expectedStatus && page) {
      const txt = await page.locator("body").innerText().catch(() => "");
      console.log("=== MÀN HÌNH LÚC LỖI ===\n" + txt.slice(0, 1500));
    }
  });

  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  test("đăng nhập → Hôm nay tự áp Lịch tuần (đúng 1 lần)", async () => {
    await login(page);
    const row = await waitDb(async () => { const r = await todayRow(); return r && r.meals.length === 2 ? r : null; }, "lịch tuần áp vào daily_logs");
    expect(row.meals.map((m) => m.meal_id)).toEqual(["sang", "trua"]);
    expect(row.total_cal).toBe(960);
    expect(row.eaten_meals).toEqual([]);
    await expect(page.getByText("Bữa trưa").first()).toBeVisible();
  });

  test("thân Hôm nay theo bản vẽ 77: nền xanh nhạt, thẻ trắng phẳng, bữa dạng dòng thời gian", async () => {
    const bg = await page.getByTestId("page-bg").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain("linear-gradient");
    expect(bg).toMatch(/211, 226, 255|D3E2FF/i);
    const st = await page.getByTestId("week-card").evaluate((el) => { const s = getComputedStyle(el); return { c: s.backgroundColor, b: s.borderTopWidth, sh: s.boxShadow }; });
    expect(st.c).toBe("rgb(255, 255, 255)");
    expect(st.b).toBe("0px");
    expect(st.sh).toBe("none");
    await expect(page.getByTestId("meal-timeline")).toBeVisible();
    const fc = page.getByTestId("focus-card");
    if (await fc.count()) expect(await fc.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
  });

  test("dòng thời gian có ĐỦ bữa (kể cả bữa ở thẻ đến giờ), tên có dấu", async () => {
    // meal_config train: sang, trua, phu_chieu, pre, toi → 2 bữa có món + 3 bữa trống có nút Ghi
    for (const id of ["sang", "trua"]) await expect(page.getByTestId(`eat-${id}`), `nút tick ${id}`).toHaveCount(1);
    // Mọi bữa trống đều có nút + ở dòng (kể cả bữa đang ở thẻ đến giờ — chủ dự án 16/10)
    for (const [, n] of [["phu_chieu", "phụ chiều"], ["pre", "trước tập"], ["toi", "bữa tối"]]) await expect(page.getByRole("button", { name: `Ghi ${n}` }), `nút Ghi ${n}`).toHaveCount(1);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/\b(trua|phu_chieu|sang|toi)\b/);
    // Dòng bữa hiện luôn tên món; bấm vào → màn Sửa bữa có macro từng món
    await expect(page.getByTestId("meal-foods-trua")).toHaveText("Cơm trắng, Gà luộc");
    await tap(page.getByTestId("meal-foods-trua"));
    await expect(page.getByTestId("edit-item-macro-1")).toContainText("Đ 38 · TB 0 · B 10 g");
    await page.getByRole("button", { name: "Quay lại" }).click();
    await expect(page.getByTestId("kcal-remain")).toBeVisible();
  });

  let remainAfterTick;
  test("tick Đã ăn bữa sáng → lưu DB, kcal còn lại giảm đúng 450", async () => {
    const before = await kcalRemainMobile(page);
    await tap(page.getByTestId("eat-sang"));
    await waitDb(async () => (await todayRow())?.eaten_meals?.includes("sang"), "eaten_meals có sang");
    await expect.poll(() => kcalRemainMobile(page)).toBe(before - 450);
    remainAfterTick = before - 450;
  });

  test("header: dải 4 macro có Đạm/Tinh bột/Béo/Xơ", async () => {
    for (const k of ["p", "c", "f", "fiber"]) await expect(page.getByTestId(`macro-${k}`)).toBeVisible();
    await expect(page.getByTestId("macro-strip")).toContainText("Tinh bột");
    await expect(page.getByTestId("macro-strip")).toContainText("Xơ");
  });

  test("Nước theo cốc: chạm cốc trống +250, chạm cốc xanh thì bỏ; đổi cỡ cốc 500", async () => {
    await tap(page.getByTestId("water-cup-next"));
    await waitDb(async () => (await todayRow())?.water_ml === 250, "water 250");
    await expect(page.getByTestId("water-count")).toHaveAttribute("data-ml", "250");
    await tap(page.getByTestId("water-cup-1"));
    await waitDb(async () => (await todayRow())?.water_ml === 0, "water 0");
    await page.getByTestId("water-cup-size").selectOption("500");
    await tap(page.getByTestId("water-cup-next"));
    await waitDb(async () => (await todayRow())?.water_ml === 500, "water 500 (cốc 500)");
    await tap(page.getByTestId("water-cup-1"));
    await waitDb(async () => (await todayRow())?.water_ml === 0, "water 0 lần 2");
    await page.getByTestId("water-cup-size").selectOption("250");
  });

  test("thẻ Tuần này có mặt", async () => {
    await expect(page.getByTestId("week-card")).toBeVisible();
    await expect(page.getByTestId("week-ok")).toContainText("ngày");
  });

  test("tải lại trang: dữ liệu còn, không áp Lịch tuần lần 2", async () => {
    await page.reload();
    await expect(page.getByTestId("kcal-remain")).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => kcalRemainMobile(page)).toBe(remainAfterTick);
    await page.waitForTimeout(1500);
    const row = await todayRow();
    expect(row.meals.length).toBe(2);
    expect(row.eaten_meals).toEqual(["sang"]);
  });

  // 17/10 (bản vẽ 115): thẻ Cân nặng mở sheet "Cân hôm nay" ngay ở Hôm nay; số điền sẵn, −/+ 0,1 kg; toast + Hoàn tác
  test("Cân nặng: lưu 64,8 rồi cân lại 64,9 cùng ngày → vẫn 1 dòng; Hoàn tác trả số cũ", async () => {
    const s = S();
    const rows = () => rest(`weight_logs?user_id=eq.${s.uid}&select=kg,logged_date,week`);
    await tap(page.getByTestId("weight-tile"));
    await expect(page.getByTestId("weight-sheet")).toBeVisible();
    await expect(page.getByTestId("weight-sub")).toContainText("lần cân đầu tiên");
    await page.getByTestId("weight-input").fill("64,8");
    await expect(page.getByTestId("weight-save")).toContainText("Lưu 64,8 kg");
    await tap(page.getByTestId("weight-save"));
    await waitDb(async () => { const w = await rows(); return w.length === 1 && Number(w[0].kg) === 64.8; }, "weight 64.8");
    await expect(page.getByTestId("weight-sheet")).toHaveCount(0);   // vẫn ở Hôm nay
    await expect(page.getByTestId("weight-tile")).toBeVisible();
    await expect(page.getByTestId("toast")).toContainText("Đã lưu 64,8 kg");
    // Cân lại: số điền sẵn = số hôm nay, + 0,1 kg
    await tap(page.getByTestId("weight-tile"));
    await expect(page.getByTestId("weight-input")).toHaveValue("64,8");
    await tap(page.getByTestId("weight-plus"));
    await expect(page.getByTestId("weight-input")).toHaveValue("64,9");
    await tap(page.getByTestId("weight-save"));
    await waitDb(async () => { const w = await rows(); return w.length === 1 && Number(w[0].kg) === 64.9; }, "weight 64.9, vẫn 1 dòng");
    const w = await rows();
    expect(w[0].logged_date).toBe(s.today);
    expect(w[0].week).toBe(1);
    // Lưu 65,3 rồi Hoàn tác → về 64,9 (vẫn 1 dòng)
    await tap(page.getByTestId("weight-tile"));
    await page.getByTestId("weight-input").fill("65,3");
    await tap(page.getByTestId("weight-save"));
    await waitDb(async () => { const w = await rows(); return w.length === 1 && Number(w[0].kg) === 65.3; }, "weight 65.3");
    await expect(page.getByTestId("toast")).toContainText("Đã lưu 65,3 kg");
    await tap(page.getByTestId("toast-action"));
    await waitDb(async () => { const w = await rows(); return w.length === 1 && Number(w[0].kg) === 64.9; }, "Hoàn tác → 64.9");
    // "Xem biểu đồ ›" trong sheet → Tiến độ › Cân nặng (đường cũ)
    await tap(page.getByTestId("weight-tile"));
    await tap(page.getByTestId("weight-chart-link"));
    await expect(page.getByTestId("weight-chart")).toBeVisible();
    await expect(page.getByTestId("wchart-note")).toContainText("kg");
    await page.screenshot({ path: "shots/tien-do-can-nang.png", fullPage: true });
  });

  test("về Hôm nay, bỏ tick bữa sáng → eaten rỗng, đã ăn về 0", async () => {
    await nav("Hôm nay").click();
    await tap(page.getByTestId("eat-sang"));
    await waitDb(async () => (await todayRow())?.eaten_meals?.length === 0, "eaten rỗng");
    // Cân nặng vừa đổi → mục tiêu kcal đổi theo, nên kiểm "đã ăn 0 / mục tiêu" thay vì số cũ
    await expect(page.getByTestId("kcal-eaten")).toHaveAttribute("data-value", "0");
  });

  test("Thực đơn: user thường bấm Xoá hết bữa hôm nay → Hôm nay trống, mở lại app KHÔNG tự áp lại Lịch tuần", async () => {
    await nav("Thực đơn").click();
    await tap(page.getByTestId("clear-today"));
    await page.getByRole("button", { name: "Đồng ý" }).click();
    await waitDb(async () => (await todayRow())?.meals?.length === 0, "nhật ký hôm nay trống");
    await nav("Hôm nay").click();
    await expect(page.getByTestId("eat-sang")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("kcal-remain")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    expect((await todayRow()).meals.length).toBe(0);
    await expect(page.getByTestId("eat-sang")).toHaveCount(0);
  });
});
