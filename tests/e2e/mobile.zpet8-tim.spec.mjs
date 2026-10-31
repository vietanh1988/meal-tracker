// 31/10 (chốt bản vẽ "Thả tim người lạ, xin kết bạn, thông báo"): Bảng xếp hạng thả tim người lạ, chạm người lạ → thẻ Pi → Kết bạn;
// người nhận có dòng ở chuông (máy chủ ghi notifications); lời mời trong chuông trả lời được ngay (Đồng ý).
import { test, expect } from "@playwright/test";
import { login, S, rest, waitDb, tap } from "./helpers.mjs";

test("Thả tim người lạ, xin kết bạn, trả lời lời mời ở chuông", async ({ browser }) => {
  test.setTimeout(150_000);
  const s = S();
  const h = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const ids = [];
  const mk = async (name, pts) => {
    const r = await fetch(`${s.url}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email: `tim_${Date.now()}_${ids.length}@test.local`, password: `x${Date.now()}A1`, email_confirm: true }) });
    const u = await r.json(); if (!r.ok) throw new Error(JSON.stringify(u));
    ids.push(u.id);
    await rest("pet_profiles?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: u.id, name, xp: 300 }) });
    await rest("pet_ledger", { method: "POST", body: JSON.stringify({ user_id: u.id, amount: pts, kind: "meal", key: `meal:${s.today}:tim`, day: s.today }) });
    const sh = await waitDb(async () => (await rest(`pi_share?user_id=eq.${u.id}&select=nick`))[0], "Pi mới có biệt danh (trigger)");
    return { id: u.id, nick: sh.nick };
  };
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    const a = await mk("Mèo Lạ", 900), b = await mk("Cáo Nhỏ", 800);
    await rest(`notifications?user_id=eq.${s.uid}`, { method: "DELETE" });

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await page.getByTestId("pet-open-social").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await tap(page.getByTestId("pet-open-social"));
    await expect(page.getByTestId("rank-list")).toHaveAttribute("data-ready", "1", { timeout: 15_000 });

    // 1 · thả tim người lạ ngay trên bảng
    const rowA = page.getByTestId("rank-row").filter({ hasText: "Mèo Lạ" });
    await expect(rowA.getByTestId("rank-heart")).toHaveAttribute("aria-pressed", "false");
    const hb = await rowA.getByTestId("rank-heart").boundingBox();
    expect(Math.round(hb.width)).toBe(36);
    await rowA.getByTestId("rank-heart").click();
    await expect(rowA.getByTestId("rank-heart")).toHaveAttribute("aria-pressed", "true");
    await waitDb(async () => (await rest(`pi_hearts?from_id=eq.${s.uid}&to_id=eq.${a.id}&select=day`)).length === 1, "tim đã lưu");
    await waitDb(async () => (await rest(`notifications?user_id=eq.${a.id}&url=like.*heart=*&select=title`)).length === 1, "người lạ có thông báo tim ở chuông");
    await page.screenshot({ path: "shots/rank-tim.png" });

    // 2 · chạm người lạ → thẻ Pi → Kết bạn
    await rowA.getByTestId("rank-open").click();
    const sheet = page.getByTestId("pi-card-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("pi-card-name")).toHaveText("Mèo Lạ");
    await expect(sheet.getByTestId("pi-card-heart")).toHaveAttribute("aria-pressed", "true");
    await sheet.getByTestId("pi-card-friend").click();
    await expect(sheet.getByTestId("pi-card-friend")).toHaveAttribute("data-fr", "out");
    await expect(sheet.getByTestId("pi-card-friend")).toHaveText("Đã gửi lời mời");
    const lo = s.uid < a.id ? [s.uid, a.id] : [a.id, s.uid];
    await waitDb(async () => (await rest(`pi_friends?a=eq.${lo[0]}&b=eq.${lo[1]}&select=status`))[0]?.status === "pending", "lời mời đã lưu");
    await waitDb(async () => (await rest(`notifications?user_id=eq.${a.id}&url=like.*req=*&select=title`)).length === 1, "người lạ có lời mời ở chuông");
    await page.screenshot({ path: "shots/pi-card-sheet.png" });
    await page.keyboard.press("Escape").catch(() => {});
    await page.mouse.click(195, 60);

    // 3 · người khác xin kết bạn mình → dòng ở chuông có Đồng ý
    const lo2 = s.uid < b.id ? [s.uid, b.id] : [b.id, s.uid];
    await rest("pi_friends", { method: "POST", body: JSON.stringify({ a: lo2[0], b: lo2[1], status: "pending", by_user: b.id }) });
    await rest("notifications", { method: "POST", body: JSON.stringify({ user_id: s.uid, title: "Cáo Nhỏ muốn kết bạn", body: "Pi nam · Cấp 2 · chạm để trả lời", url: `/?pi=social&from=push&req=${b.nick}` }) });
    await page.reload();
    await expect(page.getByTestId("bell")).toBeVisible({ timeout: 20_000 });
    await tap(page.getByTestId("bell"));
    const item = page.getByTestId("notif-item").filter({ hasText: "Cáo Nhỏ muốn kết bạn" });
    await expect(item).toHaveAttribute("data-kind", "req");
    await page.screenshot({ path: "shots/thong-bao-loi-moi.png" });
    await item.getByTestId("notif-accept").click();
    // 01/11: trả lời xong → dòng đổi hẳn (hết nút), mở lại chuông không hiện lại nút Đồng ý
    const done = page.getByTestId("notif-item").filter({ hasText: "Cáo Nhỏ đã là bạn của bạn" });
    await expect(done).toHaveAttribute("data-kind", "friend", { timeout: 10_000 });
    await expect(page.getByTestId("notif-accept")).toHaveCount(0);
    await waitDb(async () => (await rest(`notifications?user_id=eq.${s.uid}&url=like.*req=${b.nick}&select=id`)).length === 0, "máy chủ sửa dòng lời mời");
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await tap(page.getByTestId("bell"));
    await expect(page.getByTestId("notif-item").filter({ hasText: "Cáo Nhỏ đã là bạn của bạn" })).toBeVisible();
    await expect(page.getByTestId("notif-accept")).toHaveCount(0);
    await waitDb(async () => (await rest(`pi_friends?a=eq.${lo2[0]}&b=eq.${lo2[1]}&select=status`))[0]?.status === "ok", "đã thành bạn");
    await waitDb(async () => (await rest(`notifications?user_id=eq.${b.id}&url=like.*friend=*&select=title`)).length === 1, "người xin được báo đã đồng ý");
    await ctx.close();
  } finally {
    for (const id of ids) await fetch(`${s.url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: h }).catch(() => {});
    await rest(`notifications?user_id=eq.${s.uid}`, { method: "DELETE" }).catch(() => {});
    await rest(`pi_hearts?from_id=eq.${s.uid}`, { method: "DELETE" }).catch(() => {});
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
  }
});
