import { test, expect } from "@playwright/test";
import { rest, S, blockAI, waitDb } from "./helpers.mjs";

// Thiết lập lần đầu nền tối (bản vẽ 54–59 + 110–112): ô cơ thể để trống + báo số vô lý, chọn ngày tập T2…CN,
// chặn mục tiêu ngược hướng, macro 1 dòng ở đầu màn Phong cách ăn → bỏ qua AI → vào Hôm nay, onboarding_done = true.
// Chạy đầu tiên (tên "aa-onboarding"). Cuối bài trả lại nguyên số đo / lịch tập của user test cho các bài sau.
const KEEP = "cm,kg,birth_year,goal_kg,goal_type,months,gender,exercise_type,frequency,gym_days,diet_strategy,cut_pace,ui_mode";

test("Onboarding: nhập số đo, chọn ngày tập, chặn mục tiêu ngược rồi vào app", async ({ browser }) => {
  const s = S();
  const orig = (await rest(`profiles?id=eq.${s.uid}&select=${KEEP}`))[0];
  // Hồ sơ chưa có số đo (như user mới) → các ô phải TRỐNG, không điền sẵn 172/63/1987
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: false, cm: null, kg: null, birth_year: null, goal_kg: null, gym_days: [0, 1, 2, 3, 4, 5, 6], goal_type: "bulk", exercise_type: "gym" }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try {
    await blockAI(page);
    await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
    await page.goto("/");
    await page.getByTestId("login-email").fill(s.email);
    await page.getByTestId("login-pass").fill(s.password);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("onboarding")).toBeVisible({ timeout: 20_000 });
    // 18/10 (bản vẽ 131a): màn chào hỏi "Bạn muốn gì?" — mặc định Giảm cân; bài này đi đường Tập gym (Bước 1–3 cũ)
    await expect(page.getByTestId("onb-opt-mode-loss")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/onb-chao.png" });
    await page.getByTestId("onb-opt-mode-gym").click();
    await page.getByTestId("onb-start").click();

    // B1 Cơ thể: trống, chữ gợi ý, nút Tiếp mờ tới khi đủ 3 ô hợp lệ
    await expect(page.getByTestId("onb-height")).toHaveValue("");
    await expect(page.getByTestId("onb-weight")).toHaveValue("");
    await expect(page.getByTestId("onb-year")).toHaveValue("");
    await expect(page.getByTestId("onb-height")).toHaveAttribute("placeholder", "VD 165");
    await expect(page.getByTestId("onb-height")).toHaveAttribute("inputmode", "numeric");
    await expect(page.getByTestId("onb-weight")).toHaveAttribute("inputmode", "decimal");
    await expect(page.getByTestId("onb-next")).toBeDisabled();
    await page.screenshot({ path: "shots/onb-co-the.png" });
    await page.getByTestId("onb-height").fill("119");
    await expect(page.getByTestId("onb-height-err")).toBeVisible();
    await page.getByTestId("onb-height").fill("172");
    await expect(page.getByTestId("onb-height-err")).toHaveCount(0);
    await page.getByTestId("onb-weight").fill("64,4");
    await page.getByTestId("onb-year").fill("2020");
    await expect(page.getByTestId("onb-year-err")).toBeVisible(); // 6 tuổi < 13
    await expect(page.getByTestId("onb-next")).toBeDisabled();
    await page.screenshot({ path: "shots/onb-co-the-loi.png" });
    await page.getByTestId("onb-year").fill("1988");
    await expect(page.getByTestId("onb-year-err")).toHaveCount(0);
    await expect(page.getByTestId("onb-next")).toBeEnabled();
    await page.getByTestId("onb-next").click();

    // B2 Tập luyện: chọn ngày T2…CN (0 = T2 … 6 = CN), Không tập thì ẩn hàng ngày
    await expect(page.getByTestId("onb-opt-gym")).toBeVisible();
    await expect(page.getByTestId("onb-opt-gym_cardio")).toBeVisible();
    await expect(page.getByTestId("onb-day-6")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("onb-day-6").click();
    await expect(page.getByTestId("onb-day-6")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Ngày tập trong tuần · 6 buổi")).toBeVisible();
    await page.getByTestId("onb-opt-none").click();
    await expect(page.getByTestId("onb-day-0")).toHaveCount(0);
    await page.getByTestId("onb-opt-gym").click();
    await expect(page.getByTestId("onb-day-0")).toBeVisible();
    await page.screenshot({ path: "shots/onb-tap.png" });
    await page.getByTestId("onb-next").click();

    // B3 Mục tiêu: Giảm mỡ mà mục tiêu ≥ cân hiện tại → báo đỏ, nút Tính macro mờ
    await expect(page.getByTestId("onb-seg-bulk")).toBeVisible();
    await page.getByTestId("onb-seg-cut").click();
    await expect(page.getByTestId("onb-goalKg")).toHaveValue("");
    await page.getByTestId("onb-goalKg").fill("66");
    await expect(page.getByTestId("onb-goal-err")).toContainText("Giảm mỡ thì cân mục tiêu phải nhỏ hơn cân hiện tại (64,4 kg)");
    await expect(page.getByTestId("onb-next")).toBeDisabled();
    await page.screenshot({ path: "shots/onb-muc-tieu-loi.png" });
    // Giảm mỡ: chọn Tốc độ giảm thay cho số tháng (bản vẽ 126), mặc định Vừa
    await page.getByTestId("onb-goalKg").fill("60");
    await expect(page.getByTestId("onb-months")).toHaveCount(0);
    await expect(page.getByTestId("onb-pace-mid")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("onb-speed")).toContainText("Đạt 60 kg");
    await page.getByTestId("onb-pace-slow").click();
    await expect(page.getByTestId("onb-pace-slow")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/onb-toc-do.png" });
    await page.getByTestId("onb-goalKg").fill("66");
    await page.getByTestId("onb-seg-maintain").click();
    await expect(page.getByTestId("onb-goalKg")).toHaveCount(0);
    await page.getByTestId("onb-seg-bulk").click();
    await expect(page.getByTestId("onb-goal-err")).toHaveCount(0);
    await expect(page.getByTestId("onb-next")).toBeEnabled();
    await expect(page.getByTestId("onb-macro")).toContainText(/kcal\s*· Đạm \d+\s*· TB \d+\s*· Béo \d+/);
    await expect(page.getByTestId("onb-kcal")).not.toHaveText("0");
    await expect(page.getByTestId("onb-next")).toHaveText("Bắt đầu");
    await page.screenshot({ path: "shots/onb-muc-tieu.png" });
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-ai")).toHaveCount(0);

    // 17/10: bỏ bước AI lên thực đơn — bấm Bắt đầu ở bước Mục tiêu là vào app (macro 1 dòng ngay bước Mục tiêu)

    await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
    await waitDb(async () => {
      const r = (await rest(`profiles?id=eq.${s.uid}&select=onboarding_done,cm,kg,birth_year,goal_kg,goal_type,frequency,gym_days`))[0];
      return r?.onboarding_done === true && Number(r.cm) === 172 && Number(r.kg) === 64.4 && Number(r.birth_year) === 1988
        && Number(r.goal_kg) === 66 && r.goal_type === "bulk" && r.frequency === "frequent" && JSON.stringify(r.gym_days) === "[0,1,2,3,4,5]";
    }, "onboarding lưu số đo + 6 ngày tập (frequent)");
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ...orig, onboarding_done: true }) });
    await ctx.close();
  }
});

// Bản vẽ 131a–d: flow giảm cân — 1 màn hỏi (cân · cao · năm sinh · muốn giảm bao nhiêu) → lời hứa → Hôm nay bản giảm cân
test("Onboarding giảm cân: 3 màn rồi vào Hôm nay bản gọn", async ({ browser }) => {
  const s = S();
  const orig = (await rest(`profiles?id=eq.${s.uid}&select=${KEEP}`))[0];
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: false, cm: null, kg: null, birth_year: null, goal_kg: null, goal_type: "bulk", exercise_type: "gym", ui_mode: null }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  try {
    await blockAI(page);
    await page.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
    await page.goto("/");
    await page.getByTestId("login-email").fill(s.email);
    await page.getByTestId("login-pass").fill(s.password);
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("onboarding")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("onb-start").click(); // mặc định Giảm cân
    await expect(page.getByTestId("onb-next")).toBeDisabled();
    await page.getByTestId("onb-weight").fill("85");
    await page.getByTestId("onb-height").fill("170");
    await page.getByTestId("onb-year").fill("1990");
    await expect(page.getByTestId("onb-chip-loss-10")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("onb-loss-goal")).toContainText("75 kg");
    // 18/10: 61 kg · 160 cm không được gợi ý −10 kg; tự nhập 51 kg (BMI < 20) → cảnh báo vàng
    await page.getByTestId("onb-weight").fill("61");
    await page.getByTestId("onb-height").fill("160");
    await expect(page.getByTestId("onb-chip-loss-2")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("onb-chip-loss-10")).toHaveCount(0);
    await page.getByTestId("onb-chip-loss-x").click();
    await page.getByTestId("onb-goalKg").fill("51");
    await expect(page.getByTestId("onb-loss-goal")).toHaveAttribute("data-tone", "warn");
    await page.screenshot({ path: "shots/onb-loss-canh-bao.png" });
    await page.getByTestId("onb-weight").fill("85");
    await page.getByTestId("onb-height").fill("170");
    await page.getByTestId("onb-chip-loss-10").click();
    await expect(page.getByTestId("onb-loss-goal")).toContainText("75 kg");
    await page.screenshot({ path: "shots/onb-loss-hoi.png" });
    await page.getByTestId("onb-chip-loss-x").click();
    await page.getByTestId("onb-goalKg").fill("90");
    await expect(page.getByTestId("onb-goal-err")).toContainText("nhỏ hơn");
    await expect(page.getByTestId("onb-next")).toBeDisabled();
    await page.getByTestId("onb-chip-loss-10").click();
    await page.getByTestId("onb-next").click();
    await expect(page.getByTestId("onb-promise")).toContainText("75 kg");
    await expect(page.getByTestId("onb-promise")).toContainText("vào khoảng tháng");
    await expect(page.getByTestId("onb-chip-ex-no")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/onb-loss-hua.png" });
    await page.getByTestId("onb-loss-start").click();
    await expect(page.getByTestId("loss-status")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("macro-strip")).toHaveCount(0);
    await expect(page.getByTestId("today-photo-big")).toBeVisible();
    await expect(page.getByTestId("plan-card")).toContainText("kg/tuần");
    await page.screenshot({ path: "shots/loss-today.png", fullPage: true });
    await waitDb(async () => {
      const r = (await rest(`profiles?id=eq.${s.uid}&select=onboarding_done,ui_mode,goal_type,goal_kg,cut_pace,exercise_type,kg`))[0];
      return r?.onboarding_done === true && r.ui_mode === "loss" && r.goal_type === "cut" && Number(r.goal_kg) === 75 && r.cut_pace === "mid" && r.exercise_type === "none" && Number(r.kg) === 85;
    }, "onboarding giảm cân lưu ui_mode = loss, cut, 75 kg, Vừa, không tập");
    // Tiến độ › Kết quả
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tiến độ" }).click();
    await expect(page.getByTestId("loss-result")).toBeVisible();
    await expect(page.getByTestId("seg-result")).toHaveAttribute("aria-selected", "true");
    await page.screenshot({ path: "shots/loss-ket-qua.png", fullPage: true });
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ ...orig, onboarding_done: true }) });
    await ctx.close();
  }
});
