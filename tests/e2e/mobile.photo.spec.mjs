import { test, expect } from "@playwright/test";
import { login, S, waitDb, tap, todayRow } from "./helpers.mjs";

// Chụp ảnh: AI giả (không tốn tiền) trả 2 món → sửa gram, bỏ 1 món, thêm món bằng Tìm món → Lưu vào Phụ chiều (đánh dấu đã ăn)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64");
const AI_TEXT = '[{"name":"cơm trắng","gram":200,"cal":260,"p":5,"c":57,"f":0.6,"fiber":0.8},{"name":"thịt heo kho","gram":120,"cal":300,"p":24,"c":4,"f":21,"fiber":0}]';

test("Chụp ảnh: nhận diện → sửa → lưu vào bữa", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  S();
  await login(page);
  // Đăng ký SAU blockAI để ưu tiên: ai-proxy trả kết quả giả
  await page.route("**/functions/v1/ai-proxy", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: AI_TEXT }) }));

  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Ghi bữa" }).click();
  await tap(page.getByRole("button", { name: "Chụp ảnh món ăn" }));
  await page.getByTestId("photo-file").setInputFiles({ name: "bua.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByTestId("photo-item")).toHaveCount(2);
  await expect(page.getByTestId("photo-total")).toHaveAttribute("data-cal", "560");

  // Cơm 200 → 100 g: kcal cơm còn 130
  await page.getByTestId("photo-gram-0").fill("100");
  await expect(page.getByTestId("photo-total")).toHaveAttribute("data-cal", "430");
  // Bỏ thịt kho, thêm trứng bằng Tìm món
  await tap(page.getByTestId("photo-remove-1"));
  await tap(page.getByTestId("photo-add"));
  await page.getByTestId("photo-add-search").fill("trung ga luoc");
  await tap(page.getByTestId("photo-add-result").first());
  await expect(page.getByTestId("photo-item")).toHaveCount(2);
  await page.screenshot({ path: "shots/chup-anh.png", fullPage: true });

  // Trước 4h sáng app mặc định ghi vào hôm qua (ăn khuya) → chọn rõ hôm nay để bài không phụ thuộc giờ chạy CI
  await page.getByTestId("photo-date").selectOption(S().today);
  await page.getByTestId("photo-meal").selectOption("phu_chieu");
  await tap(page.getByTestId("photo-save"));
  await waitDb(async () => {
    const r = await todayRow();
    const m = (r?.meals || []).find((x) => x.meal_id === "phu_chieu");
    return m && m.items.length >= 2 && m.items.some((i) => i.food === "cơm trắng" && i.gram === 100) && (r.eaten_meals || []).includes("phu_chieu");
  }, "lưu bữa phụ chiều từ ảnh");
  await ctx.close();
});
