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
    expect(errs, errs.join("\n")).toEqual([]);
  } finally {
    await rest(`web_posts?slug=like.e2e-*`, { method: "DELETE" }).catch(() => {});
    await rest(`web_terms?slug=like.e2e-*`, { method: "DELETE" }).catch(() => {});
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
