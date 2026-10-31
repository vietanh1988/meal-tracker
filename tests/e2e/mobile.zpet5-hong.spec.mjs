// 30/10 Pi hồng: Pi nữ mặc định hồng (mọi lớp da lấy /pi/hong/), Tủ đồ có "Màu Pi" Hồng / Xanh, chọn Xanh lưu vào settings.color,
// thẻ Pi của người khác (pi_card qua mã mời) trả color đúng; Pi nam không có lựa chọn màu.
import { test, expect } from "@playwright/test";
import { randomBytes } from "crypto";
import { login, S, rest, waitDb, tap } from "./helpers.mjs";

const ctxOpts = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" };

test("Pi nữ hồng mặc định, đổi sang Xanh ở Tủ đồ; Pi nam không có chọn màu", async ({ browser }) => {
  test.setTimeout(120_000);
  const s = S();
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  const admin = { apikey: s.service, Authorization: `Bearer ${s.service}`, "Content-Type": "application/json" };
  let bId = null;
  try {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    // Pi nam (tài khoản e2e chính): Tủ đồ không có ô Màu Pi, Pi xanh
    const c1 = await browser.newContext(ctxOpts);
    const p1 = await c1.newPage();
    await login(p1);
    await tap(p1.getByTestId("pet-today-card"));
    await tap(p1.getByTestId("pet-open-closet"));
    await expect(p1.getByTestId("pet-closet")).toBeVisible();
    await expect(p1.getByTestId("pet-color")).toHaveCount(0);
    await expect(p1.getByTestId("pet-closet").getByTestId("pet-avatar").first()).toHaveAttribute("data-color", "xanh");
    await c1.close();

    // Pi nữ: tài khoản mới
    const email = `e2e_hong_${Date.now()}@test.local`, password = randomBytes(12).toString("hex");
    const u = await fetch(`${s.url}/auth/v1/admin/users`, { method: "POST", headers: admin, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username: "e2e_pi_hong" } }) }).then((r) => r.json());
    bId = u.id;
    await rest(`profiles?id=eq.${bId}`, { method: "PATCH", body: JSON.stringify({ onboarding_done: true, gender: "female", cm: 160, kg: 56, birth_year: 1995, goal_type: "cut", goal_kg: 52, exercise_type: "none", is_test: true }) });
    const c2 = await browser.newContext(ctxOpts);
    const p2 = await c2.newPage();
    await p2.addInitScript(() => { try { localStorage.setItem("pwa_install_dismissed", String(Date.now())); localStorage.setItem("fp_onb_push", "1"); } catch (e) {} });
    await p2.goto("/");
    await p2.getByTestId("auth-tab-login").click().catch(() => {});
    await p2.getByTestId("login-email").fill(email);
    await p2.getByTestId("login-pass").fill(password);
    await p2.getByTestId("login-submit").click();
    await expect(p2.getByTestId("pet-today-card")).toBeVisible({ timeout: 25_000 });
    await tap(p2.getByTestId("pet-today-card"));
    await tap(p2.getByTestId("pet-open-closet"));
    const av = p2.getByTestId("pet-closet").getByTestId("pet-avatar").first();
    await expect(av).toHaveAttribute("data-color", "hong");
    // mọi lớp da (thân, mặt, lá) lấy ảnh hồng
    for (const k of ["than", "la"]) expect(await av.locator(`[data-layer="${k}"]`).getAttribute("src")).toContain("/pi/hong/");
    expect(await av.locator('[data-layer="mat_pi"] img, img[data-layer="mat_pi"]').first().getAttribute("src")).toContain("/pi/hong/");
    await expect(p2.getByTestId("pet-color-hong")).toHaveAttribute("aria-checked", "true");
    await p2.screenshot({ path: "shots/pet-closet-hong.png" });
    // đổi sang Xanh → lưu settings.color, Pi xanh
    await p2.getByTestId("pet-color-xanh").click();
    await waitDb(async () => (await rest(`pet_profiles?user_id=eq.${bId}&select=settings`))[0]?.settings?.color === "xanh", "lưu màu Xanh", 10_000);
    await expect(av).toHaveAttribute("data-color", "xanh");
    expect(await av.locator('[data-layer="than"]').getAttribute("src")).not.toContain("/pi/hong/");
    await p2.screenshot({ path: "shots/pet-closet-xanh.png" });
    // đổi lại Hồng
    await p2.getByTestId("pet-color-hong").click();
    await waitDb(async () => (await rest(`pet_profiles?user_id=eq.${bId}&select=settings`))[0]?.settings?.color === "hong", "lưu màu Hồng", 10_000);
    await expect(av).toHaveAttribute("data-color", "hong");
    await c2.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    if (bId) await fetch(`${s.url}/auth/v1/admin/users/${bId}`, { method: "DELETE", headers: admin }).catch(() => {});
  }
});
