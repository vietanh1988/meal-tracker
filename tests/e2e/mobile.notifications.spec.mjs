import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// Chuông + màn Thông báo: số chưa đọc, mở màn là đánh dấu đã đọc
test("Thông báo: chuông đếm chưa đọc, mở màn → đã đọc", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  await rest(`notifications?user_id=eq.${s.uid}`, { method: "DELETE" });
  const [row] = await rest("notifications", { method: "POST", body: JSON.stringify({ user_id: s.uid, title: "E2E: Admin đã trả lời góp ý", body: "Cảm ơn bạn, đã sửa xong.", url: "/", is_read: false }) });

  try {
    await login(page);
    await expect(page.getByTestId("bell-count")).toHaveText("1");
    await tap(page.getByTestId("bell"));
    await expect(page.getByTestId("notif-item").first()).toContainText("Admin đã trả lời góp ý");
    await waitDb(async () => (await rest(`notifications?id=eq.${row.id}&select=is_read`))[0].is_read === true, "đánh dấu đã đọc");
    await page.screenshot({ path: "shots/thong-bao.png", fullPage: true });
    await page.getByRole("button", { name: "Quay lại" }).click();
    await expect(page.getByTestId("bell-count")).toHaveCount(0);
  } finally {
    await rest(`notifications?user_id=eq.${s.uid}`, { method: "DELETE" });
    await ctx.close();
  }
});
