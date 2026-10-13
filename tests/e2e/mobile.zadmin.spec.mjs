import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Quản trị (bản vẽ 52) + Góp ý admin (53): nền tối, ô đếm việc cần làm, trả lời góp ý.
// Tạm bật is_admin cho user test, cuối bài trả lại (pc.security kiểm is_admin = false).
test("Quản trị: ô đếm + trả lời góp ý", async ({ browser }) => {
  const s = S();
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true }) });
  const [fb] = await rest("user_feedback", { method: "POST", body: JSON.stringify({ user_id: s.uid, username: "e2e_tester", category: "suggestion", content: "E2E admin: thêm biểu đồ nước" }) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  try {
    await login(page);
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Tôi" }).click();
    await tap(page.getByTestId("me-admin"));
    await expect(page.getByTestId("admin-home")).toBeVisible();
    await expect(page.getByTestId("admin-stat-feedback")).not.toContainText("–");
    const bg = await page.getByTestId("subpage").last().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain("gradient");
    await page.screenshot({ path: "shots/quan-tri.png", fullPage: true });

    await tap(page.getByTestId("admin-stat-feedback"));
    await expect(page.getByTestId("admin-feedback")).toBeVisible();
    const item = page.getByTestId("adm-fb-item").filter({ hasText: "thêm biểu đồ nước" });
    await item.getByTestId("adm-fb-reply").fill("Đã ghi nhận, cảm ơn bạn");
    await page.screenshot({ path: "shots/gop-y-admin.png", fullPage: true });
    await tap(item.getByTestId("adm-fb-send"));
    await waitDb(async () => (await rest(`user_feedback?id=eq.${fb.id}&select=status,admin_reply`))[0]?.status === "replied", "trả lời góp ý");
    await expect(item).toContainText("Bạn đã trả lời");
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: false }) });
    await ctx.close();
  }
});
