// 31/10 (chốt bản B): 3 ngày làm quen Pi — dải gắn đáy thẻ Pi ở Hôm nay; máy chủ cộng Hạt việc 3 (+50, không tính Hạt hôm nay).
import { test, expect } from "@playwright/test";
import { login, S, rest, tap, waitDb } from "./helpers.mjs";

const petDay = (back = 0) => new Date(Date.now() + 3 * 3600e3 - back * 86400e3).toISOString().slice(0, 10); // giờ VN − 4 tiếng (= pet_day)

test("làm quen Pi: xong việc hôm nay thu gọn, xong cả 3 thì ăn mừng + Cửa hàng", async ({ browser }) => {
  test.setTimeout(120_000);
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const clean = () => rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.onboard`, { method: "DELETE" });
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    await clean();
    const d0 = petDay(), d1 = petDay(1);
    await rest("pet_ledger", { method: "POST", body: JSON.stringify([1, 2].map((n) => ({ user_id: s.uid, amount: n === 1 ? 30 : 40, kind: "onboard", key: `onboard:${n}`, day: d0 }))) });

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    const strip = page.getByTestId("pet-onb");
    await expect(strip).toHaveAttribute("data-kind", "done", { timeout: 20_000 });
    await expect(strip).toContainText("Ngày 2/3 xong · +40 Hạt");
    await expect(strip).toContainText("Mai làm tiếp");
    // dải nằm trong khung thẻ Pi, ngoài nút mở Pi; thu gọn 1 dòng (~41px)
    const box = await page.getByTestId("pet-today-wrap").evaluate((w) => {
      const st = w.querySelector('[data-testid="pet-onb"]').getBoundingClientRect();
      const bt = w.querySelector('[data-testid="pet-today-card"]').getBoundingClientRect();
      return { h: Math.round(st.height), below: Math.round(st.top - bt.bottom), inBtn: !!w.querySelector('[data-testid="pet-today-card"] [data-testid="pet-onb"]') };
    });
    expect(box.inBtn).toBe(false);
    expect(box.below).toBe(0);
    expect(box.h).toBeLessThanOrEqual(44);
    await page.screenshot({ path: "shots/pi-lamquen-xong-ngay.png" });

    // hôm sau + đủ nước → máy chủ cộng việc 3 (+50) → ăn mừng
    await rest(`pet_ledger?user_id=eq.${s.uid}&kind=eq.onboard`, { method: "PATCH", body: JSON.stringify({ day: d1 }) });
    await rest("pet_ledger?on_conflict=user_id,key", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ user_id: s.uid, amount: 15, kind: "water", key: `water:${d0}`, day: d0 }) });
    await page.reload();
    await expect(page.getByTestId("pet-onb")).toHaveAttribute("data-kind", "party", { timeout: 20_000 });
    await expect(page.getByTestId("pet-onb")).toContainText("Xong làm quen · +120 Hạt");
    const r3 = await waitDb(async () => (await rest(`pet_ledger?user_id=eq.${s.uid}&key=eq.onboard:3&select=amount,day`))[0], "việc 3 đã cộng");
    expect(r3.amount).toBe(50);
    expect(r3.day).toBe(d0);
    await page.screenshot({ path: "shots/pi-lamquen-xong.png" });
    await tap(page.getByTestId("pet-onb-go"));
    await expect(page.getByTestId("pet-shop")).toBeVisible();
    await ctx.close();
  } finally {
    await clean().catch(() => {});
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
  }
});
