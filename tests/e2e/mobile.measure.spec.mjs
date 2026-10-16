import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap } from "./helpers.mjs";
import { addDays, todayVN } from "../../src/lib/dateVN.js";

// Tiến độ › Số đo (bản vẽ 123a–d, 17/10): chưa đo → thẻ giới thiệu → sheet đo (ảnh 3D + vòng thước sáng theo ô đang nhập)
// → lưu 2 số → thẻ "Lần đo gần nhất" có mũi tên so với lần trước (màu theo mục tiêu) → biểu đồ → sửa / xoá từ lịch sử.
test("Số đo cơ thể: đo lần đầu, so với lần trước, sửa, xoá", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGE ERROR:", e.message); });
  const s = S();
  const today = todayVN();
  const rows = async () => rest(`body_measurements?user_id=eq.${s.uid}&select=*&order=log_date`);
  const nav = (name) => page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name });
  await rest(`body_measurements?user_id=eq.${s.uid}`, { method: "DELETE" });
  try {
    await login(page);
    await nav("Tiến độ").click();
    await tap(page.getByTestId("seg-measure"));
    await expect(page.getByTestId("measure-empty")).toBeVisible();
    await expect(page.getByTestId("measure-reminder-link")).toBeVisible();
    await page.screenshot({ path: "shots/so-do-trong.png", fullPage: true });

    // Đo lần đầu: ô Eo đang nhập → vòng eo sáng, vòng khác mờ
    await tap(page.getByTestId("measure-first"));
    const sheet = page.getByTestId("measure-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("measure-save")).toBeDisabled();
    await sheet.getByTestId("measure-in-waist").click();
    await sheet.getByTestId("measure-in-waist").fill("84,5");
    await expect(sheet.locator('[data-band="waist"]')).toHaveAttribute("opacity", "1");
    await expect(sheet.locator('[data-band="hip"]')).not.toHaveAttribute("opacity", "1");
    await sheet.getByTestId("measure-in-belly").fill("91");
    await sheet.getByTestId("measure-in-chest").fill("5"); // sai → báo đỏ, chặn lưu
    await expect(sheet.getByTestId("measure-save")).toBeDisabled();
    await sheet.getByTestId("measure-in-chest").fill("");
    await expect(sheet.getByTestId("measure-save")).toHaveText(/Lưu 2 số đo/);
    await page.screenshot({ path: "shots/so-do-nhap.png", fullPage: true });
    await tap(sheet.getByTestId("measure-save"));
    await waitDb(async () => { const r = await rows(); return r.length === 1 && Number(r[0].waist) === 84.5 && Number(r[0].belly) === 91 && r[0].chest == null && r[0].log_date === today; }, "lưu lần đo đầu");
    await expect(page.getByTestId("measure-latest")).toBeVisible();
    await expect(page.getByTestId("measure-tile-waist")).toContainText("84,5");

    // Lần đo trước (14 ngày trước) → mũi tên so sánh: eo nhỏ đi 1,5 = xanh (mục tiêu mặc định của user test)
    await rest("body_measurements", { method: "POST", body: JSON.stringify({ user_id: s.uid, log_date: addDays(today, -14), waist: 86, belly: 92, chest: 97 }) });
    await page.reload();
    await nav("Tiến độ").click();
    await tap(page.getByTestId("seg-measure"));
    await expect(page.getByTestId("measure-delta-waist")).toContainText("↓ 1,5");
    await expect(page.getByTestId("measure-delta-waist")).not.toHaveAttribute("data-tone", "");
    await expect(page.getByTestId("measure-tile-chest")).toContainText("97");
    await expect(page.getByTestId("measure-chart")).toBeVisible();
    await expect(page.getByTestId("mchart-note")).toContainText("Eo nhỏ đi 1,5 cm");
    await tap(page.getByTestId("mchart-f-belly"));
    await expect(page.getByTestId("mchart-note")).toContainText("Bụng nhỏ đi 1 cm");
    await expect(page.getByTestId("measure-hist-row")).toHaveCount(2);
    await page.screenshot({ path: "shots/so-do.png", fullPage: true });

    // Sửa lần đo hôm nay từ lịch sử: thêm Ngực 98 → vẫn 1 dòng cho hôm nay
    await tap(page.getByTestId("measure-hist-row").first());
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("measure-in-waist")).toHaveValue("84,5");
    await sheet.getByTestId("measure-in-chest").fill("98");
    await expect(sheet.getByTestId("measure-save")).toHaveText(/Lưu 3 số đo/);
    await tap(sheet.getByTestId("measure-save"));
    await waitDb(async () => { const r = await rows(); return r.length === 2 && Number(r[1].chest) === 98 && Number(r[1].waist) === 84.5; }, "sửa lần đo hôm nay");
    await expect(page.getByTestId("measure-delta-chest")).toContainText("↑ 1");

    // Xoá lần đo cũ
    await tap(page.getByTestId("measure-hist-row").last());
    await tap(sheet.getByTestId("measure-delete"));
    await page.getByRole("button", { name: "Xoá", exact: true }).click();
    await waitDb(async () => (await rows()).length === 1, "xoá lần đo cũ");
    await expect(page.getByTestId("measure-hist-row")).toHaveCount(1);

    // Lối tắt nhắc đo → Tôi › Nhắc nhở (cài đặt nhắc chỉ ở đó)
    await tap(page.getByTestId("measure-reminder-link"));
    await expect(page.getByTestId("rem-sec-body")).toBeVisible();
    expect(errs, "lỗi trang").toEqual([]);
  } finally {
    await rest(`body_measurements?user_id=eq.${s.uid}`, { method: "DELETE" });
    await ctx.close();
  }
});
