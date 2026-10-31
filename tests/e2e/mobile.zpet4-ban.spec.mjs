// 30/10 Bạn bè & Xếp hạng (bản vẽ màn 6–10): thẻ ở màn Pi → 3 bảng xếp hạng; kết bạn bằng mã; thả tim; ghé phòng; Pi đẹp tuần.
import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";
import { login, S, rest, waitDb, tap } from "./helpers.mjs";

test("Bạn bè & Xếp hạng: bảng tuần, kết bạn bằng mã, thả tim, ghé phòng, bình chọn Pi đẹp tuần", async ({ browser }) => {
  test.setTimeout(150_000);
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const admin = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  let bId = null;
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    const u = await fetch(`${s.url}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email: `e2e_bin_${Date.now()}@test.local`, password: randomBytes(12).toString("hex"), email_confirm: true }) }).then((r) => r.json());
    bId = u.id;
    const code = `BIN${Date.now() % 100000}`.slice(0, 10), nick = `bin-${Date.now() % 100000}`;
    await rest("pet_profiles", { method: "POST", body: JSON.stringify({ user_id: bId, name: "Bin" }) });
    // 31/10: Pi mới tự có biệt danh (trigger) → ghi đè biệt danh / mã để bài dùng giá trị biết trước
    await rest("pi_share?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: bId, nick, code }) });
    await rest("pet_ledger", { method: "POST", body: JSON.stringify({ user_id: bId, amount: 30, kind: "meal", key: `meal:${s.today}:sang`, day: s.today }) });

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    await login(page);
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await tap(page.getByTestId("pet-open-social"));
    await expect(page.getByTestId("pet-social")).toBeVisible();
    await expect(page.getByTestId("rank-list")).toHaveAttribute("data-ready", "1", { timeout: 15_000 });
    await expect(page.getByTestId("rank-list").getByText("Bin")).toBeVisible();
    await page.screenshot({ path: "shots/social-rank.png" });
    for (const k of ["vandong", "hanhtrinh"]) {
      await page.getByTestId(`rank-board-${k}`).click();
      await expect(page.getByTestId("rank-list")).toHaveAttribute("data-kind", k);
      await expect(page.getByTestId("rank-list")).toHaveAttribute("data-ready", "1");
    }
    // bật Khoe tiến độ cân → lưu máy chủ
    await page.getByTestId("rank-opt-weight").click();
    await waitDb(async () => (await rest(`pi_share?user_id=eq.${s.uid}&select=show_weight`))[0]?.show_weight === true, "bật khoe tiến độ cân");

    // kết bạn bằng mã của Bin
    await page.getByTestId("social-tab-friends").click();
    await page.getByTestId("friend-add-open").click();
    await page.getByTestId("friend-add-code").fill(code);
    await page.getByTestId("friend-add-send").click();
    await expect(page.getByTestId("toast")).toContainText("Đã gửi lời mời tới Bin");
    const [a, b] = [s.uid, bId].sort();
    await waitDb(async () => (await rest(`pi_friends?a=eq.${a}&b=eq.${b}&select=status`))[0]?.status === "pending", "lời mời kết bạn");
    await rest(`pi_friends?a=eq.${a}&b=eq.${b}`, { method: "PATCH", body: JSON.stringify({ status: "ok" }) }); // Bin đồng ý
    // mở lại màn để tải danh sách bạn mới
    await page.reload();
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await tap(page.getByTestId("pet-today-card"));
    await tap(page.getByTestId("pet-open-social"));
    await page.getByTestId("social-tab-friends").click();
    await expect(page.getByTestId("friend-row")).toHaveCount(1);
    await page.getByTestId("friend-heart").click();
    await waitDb(async () => (await rest(`pi_hearts?from_id=eq.${s.uid}&to_id=eq.${bId}&select=day`)).length === 1, "thả tim");
    await page.screenshot({ path: "shots/social-friends.png" });
    await page.getByTestId("friend-open").click();
    await expect(page.getByTestId("friend-room")).toBeVisible();
    await expect(page.getByTestId("room-heart")).toBeDisabled();
    // lời nhắn chọn sẵn: 1 câu / ngày
    await page.getByTestId("room-note").nth(1).click();
    await waitDb(async () => (await rest(`pi_notes?from_id=eq.${s.uid}&to_id=eq.${bId}&select=msg`))[0]?.msg === 1, "lời nhắn chọn sẵn");
    await expect(page.getByTestId("room-note")).toHaveCount(1);
    await expect(page.getByTestId("room-note")).toBeDisabled();
    await page.screenshot({ path: "shots/social-room.png" });
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await expect(page.getByTestId("pet-social")).toBeVisible();
    // Pi đẹp tuần: bầu cho Bin
    await page.getByTestId("social-tab-show").click();
    await expect(page.getByTestId("beauty-entry")).toHaveCount(1, { timeout: 10_000 });
    await page.getByTestId("beauty-entry").click();
    await waitDb(async () => (await rest(`pi_votes?voter=eq.${s.uid}&target=eq.${bId}&select=week`)).length === 1, "bình chọn Pi đẹp tuần");
    await page.screenshot({ path: "shots/social-show.png" });
    await ctx.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    await rest(`pi_share?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ show_weight: false }) }).catch(() => {});
    if (bId) await fetch(`${s.url}/auth/v1/admin/users/${bId}`, { method: "DELETE", headers: admin }).catch(() => {});
  }
});
