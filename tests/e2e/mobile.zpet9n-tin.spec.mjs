// 06/11 (chủ dự án chốt bản vẽ "Màn Tin giảm cân"): nút Pi › Tin giảm cân → trang tổng (Mới nhất + 6 cụm) → đọc bài trong app.
// Không Hạt, không chấm đỏ. Dữ liệu mẫu = bản chép từ web thật (fixtures/app-*.json), không gọi fipilotai.com.
import { test, expect } from "@playwright/test";
import { login, rest, mockNews } from "./helpers.mjs";

test("Tin giảm cân: mở từ nút Pi, đổi cụm, tìm, đọc bài, món trong bài mở Ghi bữa", async ({ browser }) => {
  test.setTimeout(120_000);
  const flagsRow = (await rest("app_settings?key=eq.feature_flags&select=value"))[0];
  // 07/11: ảnh món lấy từ web_calo_pages (cùng nguồn web) — gắn ảnh cho phở bò, cơm gà để trống
  const FK = encodeURIComponent("phở bò");
  const hadImg = await rest(`web_calo_pages?food_key=eq.${FK}&select=food_key,slug,enabled,image_url`);
  try {
    await rest("web_calo_pages?on_conflict=food_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ food_key: "phở bò", slug: hadImg[0]?.slug || "pho-bo", enabled: hadImg[0]?.enabled ?? true, image_url: "https://fipilotai.com/anh/2026/11/mon-pho-bo-anh-e2e_800w.webp" }]) });
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: JSON.stringify({ ...JSON.parse(flagsRow.value), pet: true }) }) });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", serviceWorkers: "block" });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    const { news } = await mockNews(page);
    await login(page);
    await page.evaluate(() => { try { localStorage.removeItem("fp_news_tab"); localStorage.removeItem("fp_news_read"); localStorage.removeItem("fp_food_img2"); } catch { /* */ } });

    // 1 · menu nút Pi có dòng 5 "Tin giảm cân", menu nằm trọn màn, chấm đỏ không vì tin
    const sc = page.getByTestId("pi-shortcut");
    await expect(sc).toBeVisible({ timeout: 20_000 });
    await sc.click();
    const row = page.getByTestId("pi-menu-news");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Tin giảm cân");
    await expect(row).toContainText(`${news.posts.length} bài`);
    expect((await page.getByTestId("pi-menu").boundingBox()).y + (await page.getByTestId("pi-menu").boundingBox()).height).toBeLessThan(844);
    await expect(row).not.toContainText("Hạt");
    await page.screenshot({ path: "shots/tin-menu-pi.png" });
    await row.click();

    // 2 · tab Mới nhất: thẻ to = bài mới nhất, dòng sau theo ngày, không cuộn ngang
    await expect(page.getByTestId("news-screen")).toBeVisible();
    await expect(page.getByTestId("news-chip-latest")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("news-lead")).toHaveAttribute("data-slug", news.posts[0].slug);
    await expect(page.getByTestId("news-row").first()).toHaveAttribute("data-slug", news.posts[1].slug);
    expect(await page.getByTestId("news-row").count()).toBe(Math.min(20, news.posts.length - 1));
    if (news.posts.length > 21) { await page.getByTestId("news-more").click(); expect(await page.getByTestId("news-row").count()).toBe(Math.min(40, news.posts.length - 1)); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "shots/tin-moi-nhat.png" });

    // 3 · tab Tập luyện: bài ★, 2 ô mở màn app, nhóm bài đúng thứ tự web
    const tl = news.cats.find((c) => c.slug === "tap-luyen");
    await page.getByTestId("news-chip-tap-luyen").click();
    await expect(page.getByTestId("news-chip-tap-luyen")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("news-star")).toHaveAttribute("data-slug", tl.star);
    await expect(page.getByTestId("news-tool-bai-tap")).toBeVisible();
    await expect(page.getByTestId("news-tool-giao-an")).toBeVisible();
    await expect(page.getByTestId("news-group")).toHaveCount(tl.groups.length);
    await expect(page.getByTestId("news-group").first()).toContainText(tl.groups[0].name);
    await page.screenshot({ path: "shots/tin-tap-luyen.png", fullPage: true });

    // 4 · đọc bài ★ trong app: tên bài, kéo tới cuối → Đã đọc (không Hạt), quay lại thấy ✓
    await page.getByTestId("news-star").click();
    await expect(page.getByTestId("news-reader")).toBeVisible();
    await expect(page.getByTestId("news-title")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "shots/tin-doc-bai.png" });
    await expect(page.getByTestId("news-next")).toBeVisible();
    await expect(page.getByTestId("news-next")).not.toContainText("Hạt"); // đáy màn đọc không thưởng gì
    await page.mouse.move(195, 420);
    for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(80); }
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("fp_news_read") || "[]"))).toContain(tl.star);
    await page.screenshot({ path: "shots/tin-cuoi-bai.png" });
    await page.getByRole("button", { name: "Quay lại" }).last().click();
    await expect(page.getByTestId("news-star").getByTestId("news-done")).toBeVisible();

    // 5 · tìm "pho" (không dấu) → bài phở → món trong bài → Ghi bữa điền sẵn tên món
    await page.getByTestId("news-search").click();
    await page.getByTestId("news-search-input").fill("pho beo");
    const hit = page.locator('[data-testid="news-row"][data-slug="an-pho-co-beo-khong"]');
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page.getByTestId("news-foods")).toBeVisible({ timeout: 15_000 });
    // món có ảnh web → ô ảnh 400w; món chưa có ảnh → không có ô ảnh
    const phoThumb = page.locator('[data-testid="news-food"][data-name="Phở bò"] [data-testid="food-thumb"][data-has="1"] img');
    await expect(phoThumb).toBeVisible({ timeout: 15_000 });
    expect(await phoThumb.getAttribute("src")).toContain("_400w.webp");
    await expect(page.locator('[data-testid="news-food"][data-name="Cơm gà"]')).toBeVisible();
    await expect(page.locator('[data-testid="news-food"][data-name="Cơm gà"] [data-testid="food-thumb"]')).toHaveCount(0);
    const food = page.getByTestId("news-foods").getByTestId("news-food").first();
    const name = await food.getAttribute("data-name");
    await food.click();
    await expect(page.locator('input[type="search"]').last()).toHaveValue(name);
    // Ghi bữa: dòng kết quả phở bò có ảnh món, ảnh tải được
    const hasImg = page.locator('[data-testid="food-thumb"][data-has="1"] img').first();
    await expect(hasImg).toBeVisible();
    await expect.poll(() => hasImg.evaluate((im) => im.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: "shots/ghi-bua-anh-mon.png" });

    // 6 · mở lại: nhớ tab đã chọn
    await page.goto(page.url());
    await page.getByTestId("pi-shortcut").click();
    await page.getByTestId("pi-menu-news").click();
    await expect(page.getByTestId("news-chip-tap-luyen")).toHaveAttribute("aria-selected", "true");
    expect(errs).toEqual([]);
    await ctx.close();
  } finally {
    await rest("app_settings?key=eq.feature_flags", { method: "PATCH", body: JSON.stringify({ value: flagsRow.value }) });
    if (hadImg.length) await rest(`web_calo_pages?food_key=eq.${FK}`, { method: "PATCH", body: JSON.stringify({ image_url: hadImg[0].image_url }) });
    else await rest(`web_calo_pages?food_key=eq.${FK}`, { method: "DELETE" });
  }
});
