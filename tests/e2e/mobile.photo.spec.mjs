import { test, expect } from "@playwright/test";
import fs from "fs";
import { login, S, waitDb, tap, todayRow, openPlus } from "./helpers.mjs";

// Chụp ảnh: AI giả (không tốn tiền) trả 2 món → sửa gram, bỏ 1 món, thêm món bằng Tìm món → Lưu vào Phụ chiều (đánh dấu đã ăn)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64");
// 26/10: ảnh món thật (cơm trắng + thịt kho, ảnh bìa bài web) cho ảnh chụp màn trang Hướng dẫn — AI giả trả đúng 2 món trong ảnh
const PHOTO = fs.readFileSync(new URL("./fixtures/bua-com-thit-kho.jpg", import.meta.url));
const AI_TEXT = '[{"name":"cơm trắng","gram":200,"cal":260,"p":5,"c":57,"f":0.6,"fiber":0.8},{"name":"thịt heo kho","gram":120,"cal":300,"p":24,"c":4,"f":21,"fiber":0}]';

test("Chụp ảnh: nhận diện → sửa → lưu vào bữa", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  S();
  await login(page);
  // Đăng ký SAU blockAI để ưu tiên: ai-proxy trả kết quả giả
  await page.route("**/functions/v1/ai-proxy", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: AI_TEXT }) }));

  await openPlus(page, "photo"); // nút + giữa → Chụp món (bản vẽ 116)
  await page.getByTestId("photo-file").setInputFiles({ name: "bua.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  await expect(page.getByTestId("photo-item")).toHaveCount(2);
  await expect(page.getByTestId("photo-total")).toHaveAttribute("data-cal", "560");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/chup-anh.png" }); // màn vừa nhận diện: ảnh món + 2 món AI nhận

  // Cơm 200 → 100 g: kcal cơm còn 130
  // Xoá hết số được (16/10: trước bị chặn, còn sót 1 chữ số) rồi gõ lại bằng bàn phím
  const g0 = page.getByTestId("photo-gram-0");
  await g0.click();
  await g0.press("End");
  for (let k = 0; k < 4; k++) await g0.press("Backspace");
  await expect(g0).toHaveValue("");
  await g0.pressSequentially("100");
  await expect(g0).toHaveValue("100");
  await expect(page.getByTestId("photo-total")).toHaveAttribute("data-cal", "430");
  // Để trống rồi rời ô → trả về số đang dùng
  await g0.click();
  await g0.fill("");
  await page.getByTestId("photo-total").click();
  await expect(g0).toHaveValue("100");
  // Bỏ thịt kho, thêm trứng bằng Tìm món
  await tap(page.getByTestId("photo-remove-1"));
  await tap(page.getByTestId("photo-add"));
  await page.getByTestId("photo-add-search").fill("trung ga luoc");
  await tap(page.getByTestId("photo-add-result").first());
  await expect(page.getByTestId("photo-item")).toHaveCount(2);
  await page.screenshot({ path: "shots/chup-anh-sua.png", fullPage: true });

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
