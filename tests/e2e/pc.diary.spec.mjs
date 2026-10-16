import { test, expect } from "@playwright/test";
import { login, rest, S, todayRow } from "./helpers.mjs";

// Bản vẽ 120 (16/10): máy tính không còn giao diện người dùng riêng — khách thấy CHÍNH app điện thoại
// (MobileApp) trong khung 400 px giữa màn + lời mời quét QR bên trái. User thường không có nút "Vào Quản trị".
test("PC: app điện thoại trong khung giữa màn, QR mời mở trên điện thoại, dùng được đủ chức năng", async ({ page }) => {
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  const s = S();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "PATCH", body: JSON.stringify({
    meals: [{ meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Phở bò", gram: 400, cal: 450, p: 25, c: 55, f: 12 }] }], eaten_meals: [] }) });
  await login(page);

  const phone = page.getByTestId("pc-phone");
  await expect(phone).toBeVisible();
  const box = await phone.boundingBox();
  expect(Math.round(box.width)).toBe(400);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(2); // giữa màn 1280
  await expect(page.getByRole("heading", { name: "Fipilot AI dùng tốt nhất trên điện thoại" })).toBeVisible();
  await expect(page.getByTestId("pc-qr")).toBeVisible();
  await expect(page.getByTestId("pc-url")).toHaveText("app.fipilotai.com");
  await expect(page.getByTestId("pc-open-admin")).toHaveCount(0);

  // Thanh dưới của app nằm trong khung (lớp fixed bị khung giữ lại), không dính đáy cửa sổ
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  const nb = await nav.boundingBox();
  expect(nb.x).toBeGreaterThanOrEqual(box.x);
  expect(nb.x + nb.width).toBeLessThanOrEqual(box.x + box.width);
  expect(nb.y + nb.height).toBeLessThanOrEqual(box.y + box.height);
  // Không còn giao diện PC cũ
  await expect(page.getByText("📓 Nhật ký bữa ăn")).toHaveCount(0);
  await expect(page.getByTestId("pc-admin")).toHaveCount(0);

  // Dùng thật trong khung: đổi tab, vào Tôi rồi quay lại Hôm nay
  await nav.getByRole("button", { name: "Tôi" }).click();
  await expect(page.getByTestId("me-admin")).toHaveCount(0);
  await nav.getByRole("button", { name: "Hôm nay" }).click();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible();
  await page.screenshot({ path: "shots/pc-app-frame.png" });
  expect((await todayRow()).meals.length).toBe(1);
  expect(errs, "lỗi trang").toEqual([]);
});
