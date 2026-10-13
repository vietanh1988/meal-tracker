import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";

// PNG 8×8 đỏ — ảnh đính kèm giả
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64");

// Tôi › Góp ý & báo lỗi: gửi báo lỗi có ảnh, gửi góp ý, hiện trong "Đã gửi" và trả lời admin
test("Góp ý & báo lỗi: gửi và xem lại", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const mine = async () => rest(`user_feedback?user_id=eq.${s.uid}&select=id,category,content,image_url&order=created_at.desc`);
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });

  await login(page);
  await nav("Tôi").click();
  await page.getByRole("button", { name: /Góp ý & báo lỗi/ }).click();
  await expect(page.getByText("LỖI Ở ĐÂU?")).toBeVisible();
  // Màn phụ nền tối phải có nền gradient (không trong suốt)
  const bg = await page.getByTestId("subpage").last().evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).toContain("gradient");
  await expect(page.getByTestId("fb-send")).toBeDisabled();

  // Báo lỗi Chụp ảnh + ảnh
  await tap(page.getByTestId("fb-cat-photo"));
  await page.getByTestId("fb-text").fill("E2E: chụp ảnh nhận sai món");
  await page.getByTestId("fb-file").setInputFiles({ name: "loi.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByTestId("fb-preview")).toBeVisible();
  await tap(page.getByTestId("fb-send"));
  await waitDb(async () => (await mine()).some((f) => f.category === "photo" && f.content.includes("nhận sai món") && /^data:image\/jpeg;base64,/.test(f.image_url || "")), "báo lỗi có ảnh");
  await expect(page.getByTestId("fb-text")).toHaveValue("");

  // Góp ý
  await tap(page.getByTestId("fb-mode-suggestion"));
  await page.getByTestId("fb-text").fill("E2E: thêm chế độ ăn chay");
  await tap(page.getByTestId("fb-send"));
  await waitDb(async () => (await mine()).some((f) => f.category === "suggestion" && f.content.includes("ăn chay")), "góp ý");
  await expect(page.getByTestId("fb-list")).toContainText("thêm chế độ ăn chay");

  // Admin trả lời → hiện lại khi mở màn
  const bug = (await mine()).find((f) => f.category === "photo");
  await rest(`user_feedback?id=eq.${bug.id}`, { method: "PATCH", body: JSON.stringify({ admin_reply: "Đã sửa, cảm ơn bạn", status: "replied" }) });
  await page.getByRole("button", { name: "Quay lại" }).click();
  await page.getByRole("button", { name: /Góp ý & báo lỗi/ }).click();
  await expect(page.getByTestId("fb-list")).toContainText("Đã sửa, cảm ơn bạn");
  await page.screenshot({ path: "shots/gop-y.png", fullPage: true });
  await ctx.close();
});
