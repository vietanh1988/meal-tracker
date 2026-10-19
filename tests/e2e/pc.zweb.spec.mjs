import { test, expect } from "@playwright/test";
import { login, rest, S } from "./helpers.mjs";

// Quản trị PC › WEB & BÀI VIẾT (bản vẽ 138a/b/h): viết bài mới (gõ "/" chèn H2, Enter tách đoạn, chuyên mục, thẻ),
// Đăng → kiểm DB (bài, khối, chuyên mục/thẻ, 1 bản lịch sử); danh sách hiện bài → bỏ vào thùng rác; thêm / xoá chuyên mục.
test("Quản trị web: viết bài, đăng, thùng rác, chuyên mục", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const [cat] = await rest("web_terms", { method: "POST", body: JSON.stringify({ kind: "category", name: "E2E Giảm cân", slug: "e2e-giam-can" }) });
  const slug = "e2e-com-tam-bao-nhieu-calo";
  try {
    await login(page);
    await page.getByTestId("pc-open-admin").click();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await expect(page.getByTestId("pc-nav-ic-web_posts").locator("svg")).toHaveCount(1);
    await page.getByTestId("pc-nav-web_posts").click();
    await expect(page.getByTestId("pc-page-web_posts")).toBeVisible();
    await page.getByTestId("web-post-new").click();
    await page.getByTestId("web-ed-title").fill("E2E cơm tấm bao nhiêu calo");
    await page.getByTestId("web-ed-slug-edit").click();
    await page.getByTestId("web-ed-slug").fill(slug);
    await page.getByTestId("web-ed-slug").press("Enter");
    await page.getByTestId("web-ed-p").first().click();
    await page.keyboard.type("Một đĩa cơm tấm sườn khoảng 660 kcal.");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/tieu de h2");
    await expect(page.getByTestId("web-ed-slash")).toBeVisible();
    await page.getByTestId("web-slash-h2").click();
    await page.keyboard.type("Cơm tấm bao nhiêu calo?");
    await expect(page.locator("[data-testid=web-ed-block][data-type=h]")).toHaveCount(1);
    // Trực quan ⇄ HTML: chuyển qua lại không mất khối
    await page.getByTestId("web-ed-mode-html").click();
    await expect(page.getByTestId("web-ed-html")).toHaveValue(/<h2>Cơm tấm bao nhiêu calo\?<\/h2>/);
    await page.getByTestId("web-ed-mode-visual").click();
    await expect(page.locator("[data-testid=web-ed-block][data-type=h]")).toHaveCount(1);
    await page.getByTestId("web-cat-e2e-giam-can").check({ force: true });
    await page.getByTestId("web-tag-input").fill("e2e thẻ");
    await page.getByTestId("web-tag-input").press("Enter");
    await page.getByTestId("web-seo-kw").fill("cơm tấm bao nhiêu calo");
    await expect(page.getByTestId("web-seo-score")).toContainText("Điểm SEO");
    await page.screenshot({ path: "shots/pc-web-editor.png", fullPage: true });
    await page.getByTestId("web-ed-publish").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã đăng");

    const [post] = await rest(`web_posts?slug=eq.${slug}&select=id,status,blocks,primary_term,seo,word_count,published_at`);
    expect(post.status).toBe("published");
    expect(post.published_at).toBeTruthy();
    expect(post.blocks.map((b) => b.type)).toEqual(["p", "h"]);
    expect(post.blocks[1].text).toContain("Cơm tấm bao nhiêu calo?");
    expect(post.primary_term).toBe(cat.id);
    expect(post.seo.keyword).toBe("cơm tấm bao nhiêu calo");
    expect(typeof post.seo.score).toBe("number");
    const terms = await rest(`web_post_terms?post_id=eq.${post.id}&select=term_id`);
    expect(terms.length).toBe(2);
    const revs = await rest(`web_revisions?post_id=eq.${post.id}&select=id,reason`);
    expect(revs.length).toBe(1);

    // Lịch sử bản sửa (138m): mở → có 1 bản → về trình soạn
    await page.getByTestId("web-ed-history").click();
    await expect(page.getByTestId("web-rev-item")).toHaveCount(1);
    await page.getByTestId("web-rev-back").click();
    await expect(page.getByTestId("web-ed-title")).toBeVisible();

    // Về danh sách (bấm lại "Bài viết") → bài có trong bảng → bỏ vào thùng rác
    await page.getByTestId("pc-nav-web_posts").click();
    await expect(page.getByTestId("web-post-table")).toBeVisible();
    const row = page.getByTestId("web-post-row").filter({ hasText: "E2E cơm tấm" });
    await expect(row).toHaveCount(1);
    await row.hover();
    await row.getByTestId("web-act-trash").click();
    await expect(page.getByTestId("pc-toast")).toContainText("thùng rác");
    expect((await rest(`web_posts?id=eq.${post.id}&select=status`))[0].status).toBe("trash");
    await page.getByTestId("web-tab-trash").click();
    await expect(page.getByTestId("web-post-row").filter({ hasText: "E2E cơm tấm" })).toHaveCount(1);

    // Chuyên mục & thẻ: thêm chuyên mục con
    await page.getByTestId("pc-nav-web_terms").click();
    await page.getByTestId("web-cat-name").fill("E2E Calo món");
    await page.getByTestId("web-cat-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã thêm chuyên mục");
    const [c2] = await rest("web_terms?slug=eq.e2e-calo-mon&select=id,kind");
    expect(c2.kind).toBe("category");
    await page.getByTestId("web-terms-tab-1").click();
    await expect(page.getByTestId("web-tag-chip").filter({ hasText: "e2e thẻ" })).toHaveCount(1);
    await page.screenshot({ path: "shots/pc-web-terms.png", fullPage: true });

    // Menu: thêm link tự nhập vào menu chân trang cột 3 → lưu → DB có mục
    const [m0] = await rest("web_menus?location=eq.footer_3&select=items");
    await page.getByTestId("pc-nav-web_menu").click();
    await page.getByTestId("web-menu-loc-footer_3").click();
    await page.getByTestId("web-menu-link-url").fill("https://app.fipilotai.com/?ref=e2e");
    await page.getByTestId("web-menu-link-label").fill("E2E mở app");
    await page.getByTestId("web-menu-link-add").click();
    await page.getByTestId("web-menu-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu menu");
    const [m1] = await rest("web_menus?location=eq.footer_3&select=items");
    expect(m1.items.at(-1).label).toBe("E2E mở app");
    await rest("web_menus?location=eq.footer_3", { method: "PATCH", body: JSON.stringify({ items: m0?.items || [] }) });

    // Cài đặt web: đổi tên web → lưu → DB
    const [st0] = await rest("web_settings?key=eq.site&select=value");
    await page.getByTestId("pc-nav-web_settings").click();
    await page.getByTestId("web-set-name").fill("Fipilot AI E2E");
    await page.getByTestId("web-set-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu cài đặt web");
    expect((await rest("web_settings?key=eq.site&select=value"))[0].value.name).toBe("Fipilot AI E2E");
    await rest("web_settings?key=eq.site", { method: "PATCH", body: JSON.stringify({ value: st0.value }) });

    // Tác giả: mở trang, có ít nhất 1 tác giả (tạo lúc viết bài), lưu hồ sơ
    await page.getByTestId("pc-nav-web_authors").click();
    await expect(page.getByTestId("web-au-row").first()).toBeVisible();
    await page.getByTestId("web-au-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu tác giả");

    // Trang calo món: tìm "phở bò" → viết giới thiệu riêng + tắt trang → Lưu → DB có dòng tắt + chuyển hướng 410; khôi phục
    const [cp0] = await rest(`web_calo_pages?food_key=eq.${encodeURIComponent("phở bò")}&select=*`);
    await page.getByTestId("pc-nav-web_calo").click();
    await page.getByTestId("web-calo-q").fill("phở bò");
    const crow = page.locator('[data-testid=web-calo-row][data-key="phở bò"]');
    await expect(crow).toHaveCount(1);
    await crow.click();
    await page.getByTestId("web-calo-intro").fill("E2E giới thiệu phở bò");
    await page.getByTestId("web-calo-on-pho-bo").click();
    await page.getByTestId("web-calo-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu 1 trang calo");
    const [cp1] = await rest(`web_calo_pages?food_key=eq.${encodeURIComponent("phở bò")}&select=enabled,intro,slug`);
    expect(cp1).toMatchObject({ enabled: false, intro: "E2E giới thiệu phở bò", slug: "pho-bo" });
    expect((await rest("web_redirects?src=eq./calo/pho-bo&select=code,source"))[0]).toMatchObject({ code: 410, source: "calo_off" });
    await page.screenshot({ path: "shots/pc-web-calo.png", fullPage: true });
    await rest("web_redirects?src=eq./calo/pho-bo&source=eq.calo_off", { method: "DELETE" });
    if (cp0) await rest(`web_calo_pages?food_key=eq.${encodeURIComponent("phở bò")}`, { method: "PATCH", body: JSON.stringify(cp0) });
    else await rest(`web_calo_pages?food_key=eq.${encodeURIComponent("phở bò")}`, { method: "DELETE" });

    // Khối dùng lại: tạo khối mẫu "Hộp mời mở app" → đổi tiêu đề, tên → Lưu → DB có khối
    await page.getByTestId("pc-nav-web_blocks").click();
    await page.getByTestId("web-blk-new").click();
    await page.getByTestId("web-blk-app-title").fill("E2E tiêu đề hộp app");
    await page.getByTestId("web-blk-name").fill("E2E hộp app");
    await page.getByTestId("web-blk-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu khối");
    const [blk] = await rest(`web_blocks?name=eq.${encodeURIComponent("E2E hộp app")}&select=kind,blocks`);
    expect(blk.kind).toBe("block");
    expect(blk.blocks[0]).toMatchObject({ type: "app", title: "E2E tiêu đề hộp app" });
    await rest(`web_blocks?name=like.E2E*`, { method: "DELETE" });

    // Công cụ: tìm chữ trong bài e2e (đang ở thùng rác → không tìm), tab Link nội bộ + Xuất / nhập mở được
    await page.getByTestId("pc-nav-web_tools").click();
    await page.getByTestId("web-rp-find").fill("cơm tấm sườn khoảng 660");
    await expect(page.getByTestId("web-rp-hit")).toHaveCount(0);
    await page.getByTestId("web-tools-tab-1").click();
    await page.getByTestId("web-tools-tab-2").click();
    await expect(page.getByTestId("web-exp")).toBeVisible();

    // Sửa trang chủ tại chỗ (138d): đổi tiêu đề → Lưu nháp → DB page_home_draft (web chưa đổi); dọn
    await page.getByTestId("pc-nav-web_pages").click();
    await page.getByTestId("web-page-builder").click();
    await page.getByTestId("web-pb-title").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" E2E");
    await page.getByTestId("web-pb-draft").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu nháp");
    const [dr] = await rest("web_settings?key=eq.page_home_draft&select=value");
    expect(dr.value.hero.title).toContain("E2E");
    await rest("web_settings?key=eq.page_home_draft", { method: "DELETE" });

    // Thống kê web: mở được, có 4 ô số + chọn khoảng ngày
    await page.getByTestId("pc-nav-web_stats").click();
    await expect(page.getByTestId("web-stats-range")).toBeVisible();
    await page.getByTestId("web-stats-range").selectOption("7");

    // Thư viện ảnh: mở được, có ô kéo thả + nút tải
    await page.getByTestId("pc-nav-web_media").click();
    await expect(page.getByTestId("web-media-drop")).toBeVisible();
    await expect(page.getByTestId("web-media-up")).toBeEnabled();

    // Cài đặt SEO: tab Chuyển hướng → thêm 301 → DB; tab Sitemap → tắt Thẻ + sửa robots → Lưu → DB; khôi phục
    const [seo0] = await rest("web_settings?key=eq.seo&select=value");
    await page.getByTestId("pc-nav-web_seo").click();
    await page.getByTestId("web-seoset-tab-3").click();
    await page.getByTestId("web-rd-src").fill("/e2e-link-cu");
    await page.getByTestId("web-rd-dest").fill("/e2e-link-moi");
    await page.getByTestId("web-rd-add").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã thêm chuyển hướng");
    const [rd] = await rest("web_redirects?src=eq./e2e-link-cu&select=dest,code,source");
    expect(rd).toMatchObject({ dest: "/e2e-link-moi", code: 301, source: "manual" });
    await expect(page.getByTestId("web-rd-row").filter({ hasText: "/e2e-link-cu" })).toHaveCount(1);
    await page.getByTestId("web-seoset-tab-2").click();
    await page.getByTestId("web-robots").fill("Disallow: /api/\nDisallow: /e2e-an/");
    await page.getByTestId("web-seo-save").click();
    await expect(page.getByTestId("pc-toast")).toContainText("Đã lưu cài đặt SEO");
    const [seo1] = await rest("web_settings?key=eq.seo&select=value");
    expect(seo1.value.robots_extra).toContain("/e2e-an/");
    expect(seo1.value.sitemap.tag).toBe(false);
    await page.getByTestId("web-seoset-tab-4").click();
    await expect(page.getByTestId("web-404-scan")).toBeVisible();
    await page.getByTestId("web-404-scan").click();
    await page.screenshot({ path: "shots/pc-web-seo.png", fullPage: true });
    if (seo0) await rest("web_settings?key=eq.seo", { method: "PATCH", body: JSON.stringify({ value: seo0.value }) });
    else await rest("web_settings?key=eq.seo", { method: "DELETE" });
    expect(errs, errs.join("\n")).toEqual([]);
  } finally {
    await rest(`web_posts?slug=like.e2e-*`, { method: "DELETE" }).catch(() => {});
    await rest(`web_terms?slug=like.e2e-*`, { method: "DELETE" }).catch(() => {});
    await rest(`web_redirects?src=like./e2e-*`, { method: "DELETE" }).catch(() => {});
    await rest(`web_blocks?name=like.E2E*`, { method: "DELETE" }).catch(() => {});
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
