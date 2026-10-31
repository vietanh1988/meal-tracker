// (kho món: "trứng gà" hiện tên "Trứng luộc")
// 31/10 (bản vẽ "Giỏ món theo đơn vị"): giỏ Ghi bữa hiện khẩu phần "1 quả" / "chén nhỏ", −/+ theo quả, chọn cỡ ở sheet, ✕ có Hoàn tác, ghi đúng gram.
import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, openLogFor } from "./helpers.mjs";

test("Ghi bữa theo đơn vị: 2 quả trứng + 1 chén vừa cơm", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const s = S();
  const before = await todayRow();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
  try {
    await login(page);
    await openLogFor(page, "toi");
    const search = page.getByPlaceholder(/Tìm món/);
    await search.fill("trứng gà");
    await tap(page.getByRole("button", { name: "Thêm trứng luộc", exact: true }));
    const egg = page.getByTestId("log-tray-row").filter({ hasText: /Trứng luộc/ });
    await expect(egg.getByTestId("log-portion")).toHaveAttribute("data-portion", "1 quả");
    await egg.getByRole("button", { name: "Thêm phần trứng luộc" }).click();
    await expect(egg.getByTestId("log-portion")).toHaveAttribute("data-portion", "2 quả");
    await search.fill("cơm trắng");
    await tap(page.getByRole("button", { name: "Thêm cơm trắng", exact: true }));
    const rice = page.getByTestId("log-tray-row").filter({ hasText: /Cơm trắng/ });
    await rice.getByTestId("log-portion").click();
    await expect(page.getByTestId("portion-sheet")).toBeVisible();
    await page.screenshot({ path: "shots/ghi-bua-chon-khau-phan.png" });
    await page.getByTestId("portion-opt").filter({ hasText: /Chén vừa/ }).click();
    await expect(page.getByTestId("portion-sheet")).toHaveCount(0);
    await expect(rice.getByTestId("log-portion")).toHaveAttribute("data-portion", "1 chén vừa");
    // bỏ nhầm trứng → Hoàn tác
    await egg.getByRole("button", { name: /^Bỏ trứng luộc$/i }).click();
    await expect(page.getByTestId("log-tray-row")).toHaveCount(1);
    await page.getByTestId("log-tray-undo").getByRole("button", { name: "Hoàn tác" }).click();
    await expect(page.getByTestId("log-tray-row")).toHaveCount(2);
    await page.screenshot({ path: "shots/ghi-bua-gio-don-vi.png" });
    await tap(page.getByTestId("log-tray-save"));
    await waitDb(async () => {
      const m = ((await todayRow())?.meals || []).find((x) => x.meal_id === "toi");
      return m && m.items.some((i) => i.food === "trứng gà" && Math.round(i.gram) === 100 && i.qty_display === "2 quả") && m.items.some((i) => i.food === "cơm trắng" && Math.round(i.gram) === 150 && i.qty_display === "1 chén vừa");
    }, "ghi 2 quả trứng + 1 chén vừa cơm");
    expect(errs).toEqual([]);
  } finally {
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (before) await rest("daily_logs", { method: "POST", body: JSON.stringify(before) });
    await ctx.close();
  }
});
