import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb, tap, todayRow, openLogFor } from "./helpers.mjs";

// Ghi bữa (16/10): bấm + nhiều món vào giỏ, chỉnh gram từng món rồi ghi 1 lần; tìm món không ra 2 dòng trùng tên.
test("Ghi bữa: chọn nhiều món + gram, ghi 1 lần", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  const s = S();
  const before = await todayRow();
  await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
  try {
    await login(page);
    await openLogFor(page, "toi"); // + ở dòng Bữa tối, hoặc Tìm món của thẻ đến giờ nếu đang là bữa tối
    const search = page.getByPlaceholder(/Tìm món/);
    await search.fill("thịt heo");
    const names = await page.getByTestId("log-add").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(new Set(names).size, names.join(" | ")).toBe(names.length);
    await tap(page.getByRole("button", { name: "Thêm thịt heo luộc" }));
    await search.fill("cơm trắng");
    await tap(page.getByTestId("log-add").first());
    await expect(page.getByTestId("log-tray-row")).toHaveCount(2);
    await page.getByLabel("Gram thịt heo luộc").fill("150");
    await page.screenshot({ path: "shots/ghi-bua-gio-mon.png" });
    await expect(page.getByTestId("log-tray-save")).toContainText("Ghi 2 món");
    await tap(page.getByTestId("log-tray-save"));
    await waitDb(async () => {
      const m = ((await todayRow())?.meals || []).find((x) => x.meal_id === "toi");
      return m && m.items.length === 2 && m.items.some((i) => i.food === "thịt heo luộc" && Math.round(i.gram) === 150);
    }, "ghi 2 món vào bữa tối 1 lần");
    await expect(page.getByTestId("log-tray")).toHaveCount(0);
  } finally {
    await rest(`daily_logs?user_id=eq.${s.uid}&log_date=eq.${s.today}`, { method: "DELETE" });
    if (before) await rest("daily_logs", { method: "POST", body: JSON.stringify(before) });
    await ctx.close();
  }
});
