// 30/10 Khoe Pi (bản vẽ màn 1–5): nút Khoe Pi trong phòng → sheet xem trước ảnh → Lưu ảnh (tải file) → trang web Pi bật + có ảnh xem trước;
// link mời ?m=CODE → màn Đăng ký mở sẵn, có khối "… mời bạn nuôi Pi"; tài khoản mới đăng nhập → nhận mã; đủ 3 ngày Đã ăn → cả hai +50 Hạt.
import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";
import { login, S, rest, waitDb, tap } from "./helpers.mjs";

const ctxOpts = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block", acceptDownloads: true };

test("Khoe Pi: sheet, lưu ảnh, trang web bật; mã mời: đăng ký thấy lời mời, nhận mã, đủ 3 ngày cả hai +50 Hạt", async ({ browser }) => {
  test.setTimeout(150_000);
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const admin = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  let bId = null;
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    // 1) Khoe Pi
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    await login(page);
    await expect(page.getByTestId("pet-today-card")).toBeVisible({ timeout: 20_000 });
    await tap(page.getByTestId("pet-today-card"));
    await expect(page.getByTestId("pet-home")).toBeVisible();
    await tap(page.getByTestId("khoe-open"));
    await expect(page.getByTestId("khoe-sheet")).toBeVisible();
    await expect(page.getByTestId("khoe-preview")).toHaveAttribute("data-ready", "1", { timeout: 20_000 });
    await expect(page.getByTestId("khoe-opt-stats")).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "shots/khoe-sheet.png" });
    const dl = page.waitForEvent("download");
    await page.getByTestId("khoe-save").click();
    expect((await dl).suggestedFilename()).toMatch(/^pi-.+\.png$/);
    const share = await waitDb(async () => { const r = (await rest(`pi_share?user_id=eq.${s.uid}&select=nick,code,web_on,og`))[0]; return r?.web_on && r.og ? r : null; }, "trang Pi bật + ảnh xem trước", 15_000);
    expect(share.og).toBe(`${s.uid}/khoe.jpg`);
    await expect(page.getByTestId("khoe-web")).toContainText(`fipilotai.com/pi/${share.nick}`);
    // web_pi (khách chưa đăng nhập) đọc được trang Pi, không có user_id / email
    const pub = await fetch(`${s.url}/rest/v1/rpc/web_pi`, { method: "POST", headers: { apikey: s.anon, Authorization: `Bearer ${s.anon}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_nick: share.nick }) }).then((r) => r.json());
    expect(pub.code).toBe(share.code);
    expect(JSON.stringify(pub)).not.toContain(s.uid);
    await ctx.close();

    // 2) Mã mời: tài khoản mới B mở link ?m=CODE
    const email = `e2e_b_${Date.now()}@test.local`, password = randomBytes(12).toString("hex");
    const u = await fetch(`${s.url}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username: "e2e_ban_moi" } }) }).then((r) => r.json());
    bId = u.id;
    await rest(`profiles?id=eq.${bId}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: true, gender: "female", cm: 160, kg: 56, birth_year: 1995, goal_type: "cut", goal_kg: 52, exercise_type: "none", is_test: true, push_dismissed_date: s.today, push_enabled_clicked: true, push_prompted_after_eaten: true, banner_dismissed_date: s.today }) });
    const c2 = await browser.newContext(ctxOpts);
    const p2 = await c2.newPage();
    await p2.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); } catch (e) {} });
    await p2.goto(`/?m=${share.code}`);
    await expect(p2.getByTestId("auth-invite")).toBeVisible({ timeout: 15_000 });
    await expect(p2.getByTestId("auth-reg-invite")).toHaveValue(share.code);
    await p2.screenshot({ path: "shots/khoe-invite-register.png" });
    await p2.getByTestId("auth-tab-login").click();
    await p2.getByTestId("login-email").fill(email);
    await p2.getByTestId("login-pass").fill(password);
    await p2.getByTestId("login-submit").click();
    const inv = await waitDb(async () => (await rest(`pi_invites?invitee=eq.${bId}&select=inviter,rewarded_at`))[0], "nhận mã mời", 25_000);
    expect(inv.inviter).toBe(s.uid);
    expect(inv.rewarded_at).toBeNull();
    // đủ 3 ngày có bữa đã ăn đúng ngày (dấu active của pet_claim) → mở lại app → cả hai +50 Hạt
    await rest("pet_ledger", { method: "POST", body: JSON.stringify([0, 1, 2].map((i) => { const d = new Date(`${s.today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - i - 1); const day = d.toISOString().slice(0, 10); return { user_id: bId, amount: 0, kind: "active", key: `active:${day}`, day }; })) });
    await p2.reload();
    await waitDb(async () => (await rest(`pet_ledger?user_id=eq.${bId}&key=eq.invited&select=amount`))[0]?.amount === 50, "người mới +50 Hạt", 25_000);
    await waitDb(async () => (await rest(`pet_ledger?user_id=eq.${s.uid}&key=eq.invite:${bId}&select=amount`))[0]?.amount === 50, "người mời +50 Hạt", 10_000);
    await c2.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    if (bId) {
      const r = await rest(`pet_ledger?user_id=eq.${s.uid}&key=eq.invite:${bId}&select=amount`).catch(() => []);
      if (r?.[0]) {
        await rest(`pet_ledger?user_id=eq.${s.uid}&key=eq.invite:${bId}`, { method: "DELETE" }).catch(() => {});
        const pp = (await rest(`pet_profiles?user_id=eq.${s.uid}&select=balance`))[0];
        if (pp) await rest(`pet_profiles?user_id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ balance: Math.max(0, pp.balance - 50) }) }).catch(() => {});
      }
      await fetch(`${s.url}/auth/v1/admin/users/${bId}`, { method: "DELETE", headers: admin }).catch(() => {});
    }
  }
});
