// 31/10 (chủ dự án: video TikTok Halloween "theo app thật, Pi thật"): chụp màn THẬT cho scripts/pi/tiktok.py.
// Pi mặc đồ Halloween, phòng Halloween (đúng dịp 20–31/10), Pi nói câu nhắc việc → Đã ăn → nước → việc hôm nay → Cửa hàng mua đồ Halloween → Bảng xếp hạng.
// Ảnh 390×844 ×2 + toạ độ nút: shots/tiktok/<tên>.png + .json. Bảng xếp hạng có 7 Pi giả (tạo rồi xoá trong bài). Trả lại dữ liệu khi xong.
import { test, expect } from "@playwright/test";
import fs from "fs";
import { login, S, rest, waitDb, tap, todayRow } from "./helpers.mjs";

const FAKE = [
  ["Bánh Bao", "female", 420, ["halloween-nu-dau01"]], ["Mèo Mun", "male", 365, ["halloween-nam-dau04"]], ["Phù Thuỷ Nhí", "female", 310, ["halloween-nu-dau02"]],
  ["Dơi Con", "male", 255, ["halloween-nam-dau03"]], ["Xương Xẩu", "male", 190, ["halloween-nam-ao03"]], ["Kẹo Ngọt", "female", 140, []], ["Ma Xó", "male", 85, ["halloween-nam-dau05"]],
];

test("Ảnh màn thật cho video TikTok Halloween", async ({ browser }) => {
  test.setTimeout(240_000);
  const s = S();
  const h = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  fs.mkdirSync("shots/tiktok", { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const shot = async (name, ids = []) => {
    await page.waitForTimeout(700);
    const boxes = {};
    for (const id of ids) { const l = page.getByTestId(id).first(); if (await l.count()) { const b = await l.boundingBox(); if (b) boxes[id] = b; } }
    await page.screenshot({ path: `shots/tiktok/${name}.png` });
    fs.writeFileSync(`shots/tiktok/${name}.json`, JSON.stringify(boxes));
  };
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const cfgRow = (await rest("app_settings?key=eq.pet_config&select=value"))[0];
  const cfg0 = cfgRow?.value ? (typeof cfgRow.value === "string" ? JSON.parse(cfgRow.value) : cfgRow.value) : {};
  const before = await todayRow();
  const pet0 = (await rest(`pet_profiles?user_id=eq.${s.uid}&select=name,balance,xp`))[0];
  const user0 = await (await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { headers: h })).json();
  const fakeIds = [];
  const ledger = (k) => rest(`pet_ledger?user_id=eq.${s.uid}&key=like.${k}*&select=key`);
  const slotOf = async (ids) => Object.fromEntries((await rest(`pet_items?id=in.(${ids.join(",")})&select=id,slot`)).map((r) => [r.id, r.slot]));
  const wear = async (uid, ids) => {
    if (!ids.length) return;
    const sl = await slotOf(ids);
    const ok = ids.filter((i) => sl[i]);
    if (!ok.length) return;
    await rest("pet_inventory?on_conflict=user_id,item_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(ok.map((i) => ({ user_id: uid, item_id: i, how: "buy" }))) });
    await rest("pet_equipped?on_conflict=user_id,slot", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(ok.map((i) => ({ user_id: uid, slot: sl[i], item_id: i }))) });
  };
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    await rest("app_settings?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ key: "pet_config", value: JSON.stringify({ ...cfg0, collections: { ...(cfg0.collections || {}), halloween: { mode: "open" } } }) }) });
    // tên hiện ở đầu màn Hôm nay
    await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { method: "PUT", headers: h, body: JSON.stringify({ user_metadata: { ...(user0.user_metadata || {}), full_name: "Minh Anh" } }) });
    // Pi của mình: tên, cấp cao (mở đồ Halloween), 500 Hạt, mặc mũ phù thuỷ + áo bí ngô + vòng răng nanh
    await rest(`pet_ledger?user_id=eq.${s.uid}&day=eq.${s.today}`, { method: "DELETE" });
    await rest(`pet_equipped?user_id=eq.${s.uid}`, { method: "DELETE" });
    await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ name: "Pi Bí Ngô", balance: 500, xp: 2600 }) });
    await wear(s.uid, ["halloween-nam-dau01", "halloween-nam-ao02", "halloween-nam-pk04"]);
    await rest(`pet_inventory?user_id=eq.${s.uid}&item_id=eq.halloween-nam-pk06`, { method: "DELETE" });
    // hôm nay: bữa sáng + trưa đã ghi, chưa chạm Đã ăn; chưa uống nước
    const meals = [{ meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Bánh mì trứng", gram: 250, cal: 430, p: 20, c: 52, f: 15 }] }, { meal_id: "trua", meal_name: "Bữa trưa", items: [{ food: "Cơm gà", gram: 400, cal: 560, p: 35, c: 70, f: 14 }] }];
    await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: s.uid, log_date: s.today, day_type: before?.day_type || "train", meals, eaten_meals: [], water_ml: 0 }) });
    // bảng xếp hạng: 7 Pi giả có Hạt tuần này
    const d0 = new Date(`${s.today}T00:00:00Z`); const w0 = new Date(d0); w0.setUTCDate(d0.getUTCDate() - ((d0.getUTCDay() + 6) % 7));
    const days = []; for (let x = new Date(w0); x <= d0; x.setUTCDate(x.getUTCDate() + 1)) days.push(x.toISOString().slice(0, 10));
    for (const [name, gender, pts, items] of FAKE) {
      const r = await fetch(`${s.url}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email: `tiktok_${Date.now()}_${fakeIds.length}@test.local`, password: `x${Date.now()}A1`, email_confirm: true }) });
      const u = await r.json();
      if (!r.ok) throw new Error("tạo Pi giả lỗi: " + JSON.stringify(u));
      fakeIds.push(u.id);
      await rest(`profiles?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ gender, onboarding_done: true }) });
      await rest("pet_profiles?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: u.id, name, xp: pts * 3 }) });
      const per = Math.floor(pts / days.length);
      await rest("pet_ledger", { method: "POST", body: JSON.stringify(days.map((d, i) => ({ user_id: u.id, amount: i === days.length - 1 ? pts - per * (days.length - 1) : per, kind: "meal", key: `meal:${d}:tiktok`, day: d }))) });
      await wear(u.id, items);
    }

    await login(page);
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);
    // 1 · Hôm nay: thẻ Pi phòng Halloween, Pi nói
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot("t01-home", ["pet-today-card", "pet-say"]);
    // 2 · Ăn xong chạm Đã ăn
    await page.getByTestId("eat-sang").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("t02-truoc-an", ["eat-sang"]);
    await page.getByTestId("eat-sang").click();
    await waitDb(async () => (await ledger("meal:")).length >= 1, "Hạt bữa sáng");
    await page.waitForTimeout(1500);
    await shot("t03-da-an", ["eat-sang"]);
    // 3 · Uống nước tới khi đủ
    await page.getByTestId("water-cup-next").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("t04-nuoc", ["water-cup-next", "water-count"]);
    for (let k = 0; k < 20; k++) {
      const [f, n] = ((await page.getByTestId("water-count").innerText()).match(/\d+/g) || []).map(Number);
      if ((n && f >= n) || !(await page.getByTestId("water-cup-next").count())) break;
      await page.getByTestId("water-cup-next").click(); await page.waitForTimeout(400);
    }
    await waitDb(async () => (await ledger("water:")).length >= 1, "Hạt nước");
    await page.waitForTimeout(1500);
    await shot("t05-nuoc-du", ["water-count"]);
    // 4 · Màn Pi: Pi nói, việc hôm nay
    await page.evaluate(() => window.scrollTo(0, 0));
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await page.waitForTimeout(1500);
    await shot("t06-pi", ["pet-tap", "pet-balance", "pet-home-say", "pet-open-shop", "pet-open-social"]);
    await page.getByTestId("pet-tap").click();
    await page.waitForTimeout(900);
    await shot("t07-pi-noi", ["pet-tap", "pet-home-say"]);
    await page.getByTestId("pet-today").evaluate((e) => e.scrollIntoView({ block: "start" }));
    await shot("t08-pi-viec", ["pet-today", "pet-balance"]);
    // 5 · Cửa hàng: đèn lồng bí ngô (hoặc món Halloween mua được)
    await page.getByTestId("pet-open-shop").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tap(page.getByTestId("pet-open-shop"));
    await expect(page.getByTestId("pet-shop")).toBeVisible();
    await page.waitForTimeout(1000);
    const item = await page.locator('[data-testid^="pet-item-halloween-nam-"][data-state="buy"]').evaluateAll((els) => {
      const ok = els.filter((e) => +e.dataset.price <= 500).map((e) => e.dataset.testid);
      return ok.find((t) => t.endsWith("-pk06")) || ok.find((t) => /-pk0[5-7]$/.test(t)) || ok.find((t) => /-giay/.test(t)) || ok[0];
    });
    expect(item, "có món Halloween mua được").toBeTruthy();
    await page.getByTestId(item).evaluate((e) => e.scrollIntoView({ block: "center" }));
    await shot("t09-shop", [item, "pet-balance"]);
    await tap(page.getByTestId(item));
    await expect(page.getByTestId("pet-tryon")).toBeVisible();
    await page.waitForTimeout(1300);
    await shot("t10-thu", ["pet-buy"]);
    await page.getByTestId("pet-buy").click();
    await expect(page.getByTestId("pet-wear")).toBeVisible();
    await shot("t11-da-mua", ["pet-wear"]);
    await page.getByTestId("pet-wear").click();
    await waitDb(async () => (await rest(`pet_equipped?user_id=eq.${s.uid}&item_id=eq.${item.replace("pet-item-", "")}&select=item_id`)).length === 1, "đã mặc món vừa mua");
    // 6 · Pi mặc đồ mới
    await page.reload();
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await page.waitForTimeout(1500);
    await shot("t12-pi-mac", ["pet-tap", "pet-open-social"]);
    // 7 · Bảng xếp hạng tuần
    await page.getByTestId("pet-open-social").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tap(page.getByTestId("pet-open-social"));
    await expect(page.getByTestId("rank-list")).toHaveAttribute("data-ready", "1", { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await shot("t13-rank", ["rank-list", "rank-me"]);
    fs.writeFileSync("shots/tiktok/item.txt", item);
  } finally {
    for (const id of fakeIds) await fetch(`${s.url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: h }).catch(() => {});
    await fetch(`${s.url}/auth/v1/admin/users/${s.uid}`, { method: "PUT", headers: h, body: JSON.stringify({ user_metadata: user0.user_metadata || {} }) }).catch(() => {});
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    if (cfgRow) await rest("app_settings?key=eq.pet_config", { method: "PATCH", body: JSON.stringify({ value: cfgRow.value }) }).catch(() => {});
    await rest(`pet_equipped?user_id=eq.${s.uid}`, { method: "DELETE" }).catch(() => {});
    if (pet0) await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify(pet0) }).catch(() => {});
    if (before) await rest("daily_logs?on_conflict=user_id,log_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(before) }).catch(() => {});
    await ctx.close();
  }
});
