// 08/11 (chủ dự án duyệt bản vẽ "Mời bật nhắc"): mở app từ màn hình chính lần đầu, chưa bật thông báo → hộp hỏi 1 lần.
// Mở trên trình duyệt thường → không hỏi. Bấm "Để sau" → mở lại không hỏi nữa.
import { test, expect } from "@playwright/test";
import { login } from "./helpers.mjs";

const fakeInstalled = () => {
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => (String(q).includes("display-mode: standalone") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q));
  try { Object.defineProperty(Notification, "permission", { get: () => "default", configurable: true }); } catch (e) { /* */ }
};
const clearAsk = () => { try { localStorage.removeItem("fp_onb_push"); localStorage.removeItem("fp_pwa_push"); } catch (e) { /* */ } };

test("Mời bật nhắc khi mở app đã cài: hỏi 1 lần, Để sau thì thôi; trình duyệt thường không hỏi", async ({ browser }) => {
  test.setTimeout(90_000);
  const opts = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" };

  // trình duyệt thường: không hỏi
  const c1 = await browser.newContext(opts);
  const p1 = await c1.newPage();
  await login(p1);
  await p1.evaluate(clearAsk);
  await p1.reload();
  await expect(p1.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await p1.waitForTimeout(2500);
  await expect(p1.getByTestId("onb-push-installed")).toHaveCount(0);
  await c1.close();

  // app đã cài (standalone)
  const c2 = await browser.newContext(opts);
  const page = await c2.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.addInitScript(fakeInstalled);
  await login(page);
  await page.addInitScript(() => { if (!sessionStorage.getItem("e2e_once")) { sessionStorage.setItem("e2e_once", "1"); try { localStorage.removeItem("fp_onb_push"); localStorage.removeItem("fp_pwa_push"); } catch (e) { /* */ } } });
  await page.reload();
  const sheet = page.getByTestId("onb-push-sheet");
  await expect(sheet).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("onb-push-installed")).toContainText("Đã thêm Fipilot AI vào màn hình chính");
  await expect(sheet).toContainText("Giờ app đã nhận được thông báo");
  await expect(page.getByTestId("onb-push-on")).toHaveText("Bật nhắc");
  const box = await sheet.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "shots/moi-bat-nhac.png" });
  await page.getByTestId("onb-push-later").click();
  await expect(sheet).toHaveCount(0, { timeout: 5_000 });
  expect(await page.evaluate(() => localStorage.getItem("fp_pwa_push"))).toBe("1");

  // mở lại → không hỏi nữa
  await page.reload();
  await expect(page.getByText(/còn lại/i).first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("onb-push-sheet")).toHaveCount(0);
  expect(errs).toEqual([]);
  await c2.close();
});
