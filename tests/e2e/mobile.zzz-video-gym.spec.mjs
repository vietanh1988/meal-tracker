// 01/11 (chủ dự án: "video mkt cho giáo án tập gym, đăng TikTok"): chụp màn THẬT của Tập luyện cho scripts/pi/gymvid.py.
// Chỉ chạy trên nhánh có chữ "video" (không làm chậm CI thường). Ảnh 390×844 ×2 + toạ độ nút: shots/gymvid/<tên>.png + .json.
// Ảnh bài tập 2 khung: chụp 2 bản (…-a khung bắt đầu, …-b khung kết thúc) để video tự đổi như app. Dữ liệu trả lại khi xong.
import { test, expect } from "@playwright/test";
import fs from "fs";
import { login, S, rest, waitDb } from "./helpers.mjs";

const RUN = /video/.test(process.env.GITHUB_REF_NAME || process.env.VIDEO_SHOTS || "");

test("Ảnh màn thật cho video TikTok Tập luyện", async ({ browser }) => {
  test.skip(!RUN, "chỉ chạy trên nhánh video");
  test.setTimeout(240_000);
  const s = S();
  const h = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  const D = "shots/gymvid";
  fs.mkdirSync(D, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const boxesOf = async (ids) => {
    const boxes = {};
    for (const id of ids) { const l = page.getByTestId(id).first(); if (await l.count()) { const b = await l.boundingBox(); if (b) boxes[id] = b; } }
    return boxes;
  };
  const shot = async (name, ids = [], pair = false) => {
    await page.waitForTimeout(700);
    fs.writeFileSync(`${D}/${name}.json`, JSON.stringify(await boxesOf(ids)));
    if (!pair) { await page.screenshot({ path: `${D}/${name}.png` }); return; }
    for (const [k, op] of [["a", 0], ["b", 1]]) {
      await page.evaluate((o) => { let st = document.getElementById("vid-freeze"); if (!st) { st = document.createElement("style"); st.id = "vid-freeze"; document.head.appendChild(st); } st.textContent = `.fp-exph img+img{animation:none!important;opacity:${o}!important}.fp-exlb i{animation:none!important}`; }, op);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${D}/${name}-${k}.png` });
    }
    await page.evaluate(() => document.getElementById("vid-freeze")?.remove());
  };
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const prof0 = (await rest(`profiles?id=eq.${s.uid}&select=gym_days`))[0];
  const pet0 = (await rest(`pet_profiles?user_id=eq.${s.uid}&select=name,balance,xp`))[0];
  const user0 = await (await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { headers: h })).json();
  const clean = async () => {
    await rest(`workout_sessions?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`workout_plans?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.workout`, { method: "DELETE" });
  };
  const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const todayDow = (new Date(`${s.today}T00:00:00Z`).getUTCDay() + 6) % 7;
  try {
    await clean();
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { method: "PUT", headers: h, body: JSON.stringify({ user_metadata: { ...(user0.user_metadata || {}), full_name: "Minh Anh", username: "Minh Anh" } }) });
    if (pet0) await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ name: "Pi", balance: 260, xp: 1400 }) });
    // Lịch tập 5 buổi/tuần, hôm nay là ngày tập (buổi đầu tiên của giáo án)
    // 5 ngày tập có hôm nay, xếp sao cho hôm nay rơi vào buổi Ngực – Vai – Tay sau (vị trí chia hết cho 3 → có mức tạ đẹp)
    const combos = []; for (let m = 0; m < 128; m++) { const a = [0, 1, 2, 3, 4, 5, 6].filter((d) => m & (1 << d)); if (a.length === 5 && a.includes(todayDow)) combos.push(a); }
    const gd = combos.find((a) => a.indexOf(todayDow) % 3 === 0) || combos[0];
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ gym_days: gd }) });
    // 8 buổi cũ (2 tháng): mức tạ tăng dần → Nhật ký có "Đang tăng tạ", buổi hôm nay điền sẵn mức tạ lần trước
    const S8 = [[-52], [-45], [-38], [-31], [-19], [-12], [-6], [-3]];
    const lift = { "barbell-bench-press": [55, 62.5], "incline-dumbbell-press": [16, 20], "dumbbell-shoulder-press": [14, 18], "lateral-raise": [6, 8], "triceps-pushdown": [20, 25], "overhead-triceps-extension": [14, 18],
      "pull-up": [0, 0], "barbell-row": [45, 55], "seated-cable-row": [40, 50], "face-pull": [15, 20], "dumbbell-curl": [10, 12.5], "hammer-curl": [10, 12.5],
      "barbell-back-squat": [70, 85], "romanian-deadlift": [60, 75], "leg-press": [120, 150], "hip-thrust": [60, 80], "leg-extension": [35, 45], "standing-calf-raise": [40, 50] };
    const DAYS = [["Ngực – Vai – Tay sau", ["barbell-bench-press", "incline-dumbbell-press", "dumbbell-shoulder-press", "lateral-raise", "triceps-pushdown", "overhead-triceps-extension"]],
      ["Lưng – Tay trước", ["pull-up", "barbell-row", "seated-cable-row", "face-pull", "dumbbell-curl", "hammer-curl"]], ["Chân – Mông", ["barbell-back-squat", "romanian-deadlift", "leg-press", "hip-thrust", "leg-extension", "standing-calf-raise"]]];
    const rows = [];
    S8.forEach(([off], i) => {
      for (const [title, exs] of DAYS) {
        const day = addDays(s.today, off - DAYS.findIndex((x) => x[0] === title));
        const items = exs.map((ex) => { const [a, b] = lift[ex]; const kg = Math.round((a + ((b - a) * i) / (S8.length - 1)) * 2) / 2; /* tăng đều tới mức gần nhất */ return { ex, sets: [0, 1, 2].map(() => ({ kg: Math.max(0, kg), reps: 10, done: true })) }; });
        const vol = items.reduce((t, it) => t + it.sets.reduce((u, x) => u + x.kg * x.reps, 0), 0);
        rows.push({ user_id: s.uid, day, title, items, started_at: `${day}T11:00:00Z`, ended_at: `${day}T11:52:00Z`, minutes: 52, sets_done: 18, volume: vol });
      }
    });
    await rest("workout_sessions", { method: "POST", body: JSON.stringify(rows) });

    await page.clock.install({ time: new Date() }); // tua giờ cho buổi tập ra 52 phút như thật
    await login(page);
    // 1 · Hôm nay: nút Tập luyện cạnh nút Pi
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("g01-home", ["wk-btn", "bell"]);
    await page.getByTestId("wk-btn").click();
    await expect(page.getByTestId("wk-plan-empty")).toBeVisible();
    await shot("g02-chon-mau", ["wk-tpl-day-keo-chan"]);
    await page.getByTestId("wk-tpl-day-keo-chan").click();
    await expect(page.getByTestId("wk-plan")).toBeVisible();
    await expect(page.getByTestId("wk-card")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(4800); // hết thông báo
    await shot("g03-giao-an", ["wk-card-start", "wk-plan"]);
    await page.getByTestId("wk-plan").evaluate((e) => e.scrollIntoView({ block: "start" }));
    await shot("g04-7-ngay", ["wk-plan"]);
    // 2 · Thư viện: ảnh động tác, tìm theo cơ
    await page.evaluate(() => document.querySelector('[data-testid="subpage-scroll"]')?.scrollTo(0, 0));
    await page.getByTestId("wk-tab-lib").click();
    await shot("g05-thu-vien", ["wk-lib-search", "wk-lib-row"], true);
    await page.getByTestId("wk-lib-search").fill("mông");
    await shot("g06-tim-mong", ["wk-lib-search", "wk-lib-row"], true);
    await page.getByTestId("wk-lib-search").fill("gánh tạ");
    await page.locator('[data-testid="wk-lib-row"][data-id="barbell-back-squat"]').getByRole("button").first().click();
    await expect(page.getByTestId("wk-ex-detail")).toBeVisible();
    await page.waitForTimeout(800);
    await shot("g07-chi-tiet", ["wk-ex-targets"], true);
    await page.getByTestId("wk-ex-targets").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("g08-tac-dong", ["wk-ex-targets"], true);
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    // 3 · Sửa buổi
    await page.getByTestId("wk-tab-plan").click();
    await page.getByTestId(`wk-day-${todayDow}`).scrollIntoViewIfNeeded();
    await page.getByTestId(`wk-day-${todayDow}`).click();
    await expect(page.getByTestId("wk-day-editor")).toBeVisible();
    await page.getByTestId("wk-day-target").first().click();
    await shot("g09-sua-buoi", ["wk-day-target", "wk-day-save"]);
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    // 4 · Đang tập: điền sẵn mức tạ, tick hiệp, đồng hồ nghỉ
    await page.evaluate(() => document.querySelector('[data-testid="subpage-scroll"]')?.scrollTo(0, 0));
    await page.getByTestId("wk-card-start").click();
    await expect(page.getByTestId("wk-session")).toBeVisible();
    await page.waitForTimeout(1200);
    await shot("g10-dang-tap", ["wk-set-tick", "wk-set-kg"], true);
    const ticks = page.getByTestId("wk-set-tick");
    // lên kỷ lục: hiệp 3 của bài đầu thêm 2,5 kg
    const kg3 = page.getByTestId("wk-set-kg").nth(2);
    if (await kg3.count()) { const v = Number(String(await kg3.inputValue()).replace(",", ".")) || 0; if (v > 0) await kg3.fill(String(v + 2.5).replace(".", ",")); }
    await page.clock.fastForward("14:00");
    for (let k = 0; k < 3; k++) await ticks.nth(k).click();
    await page.waitForTimeout(2500);
    await shot("g11-tick-nghi", ["wk-set-tick", "wk-rest"], true);
    await page.getByTestId("wk-rest-skip").click();
    for (let k = 3; k < 12; k++) { await ticks.nth(k).scrollIntoViewIfNeeded(); await ticks.nth(k).click(); }
    await page.getByTestId("wk-rest-skip").click().catch(() => {});
    await page.clock.fastForward("38:00");
    await page.getByTestId("wk-ses-finish").click();
    await expect(page.getByTestId("wk-done")).toBeVisible();
    await page.waitForTimeout(1500);
    await shot("g12-xong", ["wk-done-claim", "wk-done-pr"]);
    // trần Hạt ngày (120) có thể đã đầy do các bài E2E chạy trước trong ngày (Hạt bữa ăn theo giờ) → dọn Hạt hôm nay của tài khoản test
    await rest(`pet_ledger?user_id=eq.${s.uid}&day=gte.${s.today.slice(0, 8)}01&kind=not.in.(onboard,invite,rank,admin)`, { method: "DELETE" });
    await page.getByTestId("wk-done-claim").click();
    await expect(page.getByTestId("wk-done-claim")).toHaveText("Đã nhận +20 Hạt", { timeout: 10_000 });
    await page.waitForTimeout(900);
    await shot("g13-nhan-hat", ["wk-done-claim"]);
    await page.getByTestId("wk-done-log").click();
    await expect(page.getByTestId("wk-log-row").first()).toBeVisible();
    await page.waitForTimeout(800);
    await shot("g14-nhat-ky", ["wk-log-week", "wk-log-row"]);
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await page.waitForTimeout(1200);
    await shot("g15-home-xong", ["wk-btn"]);
    await waitDb(async () => (await rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.workout&select=amount`))[0]?.amount === 20, "Hạt buổi tập");
  } finally {
    await clean().catch(() => {});
    await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { method: "PUT", headers: h, body: JSON.stringify({ user_metadata: user0.user_metadata || {} }) }).catch(() => {});
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    if (pet0) await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(pet0) }).catch(() => {});
    if (prof0) await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ gym_days: prof0.gym_days }) }).catch(() => {});
    await ctx.close();
  }
});
