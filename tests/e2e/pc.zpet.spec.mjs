import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb } from "./helpers.mjs";

// 21/10: Quản trị PC › Thú cưng Pi › Kho đồ › Chỉnh vị trí (kéo thả) — kéo món, đổi số, đánh dấu Cần vẽ lại → lưu pet_items.place / redraw.
test("Quản trị PC: chỉnh vị trí món đồ của Pi bằng kéo thả", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const ID = "doi-dau-04";
  try {
    await login(page);
    await page.getByTestId("pc-open-admin").click();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await page.getByTestId("pc-nav-pet").click();
    await page.getByTestId("pc-pet-tab-items").click();
    await page.getByTestId("pc-pet-search").fill("tai bèo");
    await page.getByTestId(`pc-pet-row-${ID}`).click();
    await page.getByTestId("pc-pet-place-open").click();
    await expect(page.getByTestId("pc-pet-place")).toBeVisible();

    // kéo khung sang phải 20 px, xuống 10 px
    const x0 = Number(await page.getByTestId("pc-pet-place-x").inputValue());
    const box = await page.getByTestId("pc-pet-place-box").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, { steps: 4 });
    await page.mouse.up();
    const x1 = Number(await page.getByTestId("pc-pet-place-x").inputValue());
    expect(x1).toBeGreaterThan(x0);

    await page.getByTestId("pc-pet-place-w").fill("70");
    await page.getByTestId("pc-pet-place-redraw").check();
    await page.getByTestId("pc-pet-place-note").fill("Vành mũ hơi to");
    await page.screenshot({ path: "shots/pc-pet-place.png" });
    await page.getByTestId("pc-pet-place-save").click();
    await expect(page.getByTestId("pc-pet-place")).toHaveCount(0);

    const row = await waitDb(async () => { const [r] = await rest(`pet_items?id=eq.${ID}&select=place,redraw,redraw_note`); return r?.redraw ? r : null; }, "đã lưu vị trí");
    expect(row.place.nam.w).toBeCloseTo(0.7, 3);
    expect(row.place.nam.x).toBeGreaterThan(0.5);
    expect(row.redraw_note).toBe("Vành mũ hơi to");
    await expect(page.getByTestId("pc-pet-redraw")).toContainText("Mũ tai bèo be");

    // về vị trí gốc + bỏ đánh dấu → place rỗng
    await page.getByTestId("pc-pet-place-open").click();
    await page.getByTestId("pc-pet-place-reset").click();
    await page.getByTestId("pc-pet-place-redraw").uncheck();
    await page.getByTestId("pc-pet-place-save").click();
    await waitDb(async () => { const [r] = await rest(`pet_items?id=eq.${ID}&select=place,redraw`); return r && !r.redraw && !r.place.nam ? r : null; }, "đã trả về gốc");
  } finally {
    await rest(`pet_items?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ place: {}, redraw: false, redraw_note: "" }) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
