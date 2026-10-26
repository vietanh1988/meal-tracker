// 26/10 (chủ dự án: "video mô tả phải theo app thật"): chụp màn THẬT của app cho video hướng dẫn nuôi Pi (scripts/pi/video3.py).
// Mỗi bước: ảnh khung 390×844 + toạ độ nút được chạm (shots/video/<tên>.png + .json). Chạy cuối cùng, trả lại dữ liệu hôm nay khi xong.
import { test, expect } from "@playwright/test";
import fs from "fs";
import { login, S, rest, waitDb, tap, todayRow } from "./helpers.mjs";

test("Ảnh màn thật cho video nuôi Pi", async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const s = S();
  fs.mkdirSync("shots/video", { recursive: true });
  const shot = async (name, ids = []) => {
    await page.waitForTimeout(600);
    const boxes = {};
    for (const id of ids) { const l = page.getByTestId(id).first(); if (await l.count()) { const b = await l.boundingBox(); if (b) boxes[id] = b; } }
    await page.screenshot({ path: `shots/video/${name}.png` });
    fs.writeFileSync(`shots/video/${name}.json`, JSON.stringify(boxes));
  };
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const before = await todayRow();
  const ledger = (k) => rest(`pet_ledger?user_id=eq.${s.uid}&key=like.${k}*&select=key`);
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    // hôm nay: bữa sáng + trưa đã ghi, chưa chạm Đã ăn; nước còn 1 cốc là đủ; chưa cân tuần này; Hạt hôm nay chưa có
    await rest(`pet_ledger?user_id=eq.${s.uid}&day=eq.${s.today}`, { method: "DELETE" });
    await rest(`pet_ledger?user_id=eq.${s.uid}&key=like.weigh:*`, { method: "DELETE" });
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=gte.${s.today}`, { method: "DELETE" });
    await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ balance: 160 }) });
    const meals = [{ meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Phở bò", gram: 500, cal: 420, p: 25, c: 55, f: 10 }] }, { meal_id: "trua", meal_name: "Bữa trưa", items: [{ food: "Cơm gà", gram: 400, cal: 560, p: 35, c: 70, f: 14 }] }];
    await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before?.day_type || "train", meals, eaten_meals: [], water_ml: 0 }) });

    await login(page);
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    // 1 · Ăn xong, chạm Đã ăn
    await page.getByTestId("eat-sang").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("v01-truoc-an", ["eat-sang", "pet-today-card"]);
    await page.getByTestId("eat-sang").click();
    await waitDb(async () => (await ledger("meal:")).length >= 1, "Hạt bữa sáng");
    await page.waitForTimeout(1500);
    await shot("v02-da-an", ["eat-sang", "pet-today-card"]);
    await page.getByTestId("pet-today-card").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("v03-the-pi", ["pet-today-card"]);
    // 2 · Uống đủ nước: chạm cốc tới khi đủ
    await page.getByTestId("water-cup-next").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("v04-nuoc", ["water-cup-next", "water-count"]);
    for (let k = 0; k < 20 && !(await ledger("water:")).length; k++) {
      if (!(await page.getByTestId("water-cup-next").count())) break;
      await page.getByTestId("water-cup-next").click(); await page.waitForTimeout(700);
      if (k === 0) await shot("v05-nuoc-cham", ["water-cup-next", "water-count"]);
    }
    await waitDb(async () => (await ledger("water:")).length >= 1, "Hạt nước");
    await page.waitForTimeout(1500);
    await shot("v06-nuoc-du", ["water-count"]);
    // 3 · Cân tuần này
    await page.getByTestId("weight-tile").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("v07-can", ["weight-tile"]);
    await tap(page.getByTestId("weight-tile"));
    await expect(page.getByTestId("weight-sheet")).toBeVisible();
    await page.getByTestId("weight-input").fill("64,6");
    await shot("v08-can-nhap", ["weight-input", "weight-save"]);
    await tap(page.getByTestId("weight-save"));
    await waitDb(async () => (await ledger("weigh:")).length >= 1, "Hạt cân tuần");
    await page.waitForTimeout(1500);
    // 4 · Màn Pi: việc hôm nay + số Hạt
    await page.evaluate(() => window.scrollTo(0, 0));
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await page.waitForTimeout(1200);
    await shot("v09-pi", ["pet-balance", "pet-today", "pet-tap", "pet-open-shop"]);
    await page.getByTestId("pet-today").evaluate((e) => e.scrollIntoView({ block: "start" }));
    await shot("v10-pi-viec", ["pet-today", "pet-balance"]);
    // 5 · Cửa hàng: mặc thử, mua, mặc luôn
    await page.getByTestId("pet-open-shop").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tap(page.getByTestId("pet-open-shop"));
    await expect(page.getByTestId("pet-shop")).toBeVisible();
    await page.waitForTimeout(1000);
    const item = await page.locator('[data-testid^="pet-item-"]').evaluateAll((els) => els.map((e) => e.dataset.testid).find((t) => /-nam-(dau|ao)\d/.test(t)) || els[0]?.dataset.testid);
    await page.getByTestId(item).evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("v11-shop", [item, "pet-balance"]);
    await tap(page.getByTestId(item));
    await expect(page.getByTestId("pet-tryon")).toBeVisible();
    await page.waitForTimeout(1200);
    await shot("v12-thu", ["pet-buy"]);
    await page.getByTestId("pet-buy").click();
    await expect(page.getByTestId("pet-wear")).toBeVisible();
    await shot("v13-da-mua", ["pet-wear"]);
    await page.getByTestId("pet-wear").click();
    await page.waitForTimeout(1500);
    // 6 · Chạm Pi, Pi nói
    await page.reload();
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await page.waitForTimeout(1500);
    await shot("v14-pi-mac", ["pet-tap"]);
    await page.getByTestId("pet-tap").click();
    await expect(page.getByTestId("pet-tap").getByTestId("pet-avatar")).toHaveAttribute("data-speaking", "1", { timeout: 5_000 });
    await page.waitForTimeout(500);
    await shot("v15-pi-noi", ["pet-tap"]);
    fs.writeFileSync("shots/video/item.txt", item);
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    await rest(`weight_logs?user_id=eq.${s.uid}&logged_date=gte.${s.today}`, { method: "DELETE" }).catch(() => {});
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(before) }).catch(() => {});
    await ctx.close();
  }
});
