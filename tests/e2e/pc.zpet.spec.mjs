import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb } from "./helpers.mjs";

// 23/10: Pi bộ mới (Muse AI) — Quản trị PC › Thú cưng Pi › Kho đồ: tìm món mới, xem Pi mặc thử, đổi giá → lưu pet_items.
// (Bộ mới đã đặt sẵn đúng chỗ trên thân → không còn chỉnh vị trí kéo thả.)
test("Quản trị PC: kho đồ Pi bộ mới — tìm, xem mặc thử, đổi giá", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const ID = "halloween-nam-dau01";
  const [row0] = await rest(`pet_items?id=eq.${ID}&select=price`);
  try {
    await login(page);
    await page.getByTestId("pc-open-admin").click();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await page.getByTestId("pc-nav-pet").click();
    await page.getByTestId("pc-pet-tab-items").click();
    await page.getByTestId("pc-pet-search").fill("phù thuỷ đen");
    await page.getByTestId(`pc-pet-row-${ID}`).click();
    const edit = page.getByTestId("pc-pet-edit");
    await expect(edit).toContainText("Mũ phù thuỷ đen");
    await expect(edit.locator('[data-layer="dau"]').first()).toHaveAttribute("src", /do_halloween_nam_dau01\.webp$/);
    await page.getByTestId("pc-pet-price").fill("170");
    await page.screenshot({ path: "shots/pc-pet-items.png" });
    await page.getByTestId("pc-pet-save").click();
    await waitDb(async () => { const [r] = await rest(`pet_items?id=eq.${ID}&select=price`); return r?.price === 170 ? r : null; }, "đã lưu giá");
  } finally {
    await rest(`pet_items?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ price: row0?.price ?? 150 }) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
