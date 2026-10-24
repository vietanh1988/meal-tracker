import { test, expect } from "@playwright/test";
import { login, rest, S, waitDb } from "./helpers.mjs";

// 23/10: Pi bộ mới (Muse AI) — Quản trị PC › Thú cưng Pi › Kho đồ: tìm món mới, xem Pi mặc thử, đổi giá → lưu pet_items.
// 24/10 (chủ dự án): bộ mới cũng chỉnh được vị trí trên Pi (dời / cỡ / rộng / xoay) → pet_items.place.tf
test("Quản trị PC: kho đồ Pi bộ mới — tìm, xem mặc thử, đổi giá", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  const ID = "halloween-nam-dau01";
  const [row0] = await rest(`pet_items?id=eq.${ID}&select=price,place,redraw,redraw_note`);
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
    await expect(edit.locator('[data-layer="dau"]').first()).toHaveAttribute("src", /do_halloween_nam_dau01\.webp\?v=[0-9a-f]{10}$/);
    await page.getByTestId("pc-pet-price").fill("170");
    await page.screenshot({ path: "shots/pc-pet-items.png" });
    await page.getByTestId("pc-pet-save").click();
    await waitDb(async () => { const [r] = await rest(`pet_items?id=eq.${ID}&select=price`); return r?.price === 170 ? r : null; }, "đã lưu giá");

    // chỉnh vị trí trên Pi: kéo xuống 12px, phóng 130% → lưu place.tf, lớp mũ có transform
    await page.getByTestId("pc-pet-place-open").click();
    const box = page.getByTestId("pc-pet-place");
    await expect(box).toBeVisible();
    await page.getByTestId("pc-pet-place-y").fill("12");
    await page.getByTestId("pc-pet-place-s").fill("130");
    await expect(box.locator('[data-layer="dau"]').first()).toHaveAttribute("style", /translate\(0(\.0+)?px, [0-9.]+px\).*scale\(1\.3, 1\.3\)/);
    await page.getByTestId("pc-pet-place-box").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("pc-pet-place-x")).toHaveValue("1");
    // kéo chấm góc dưới phải ra ngoài → cỡ tăng; nút − Nhỏ giảm 5%; ô Cao
    const se = page.getByTestId("pc-pet-place-se"); await expect(se).toBeVisible();
    const hb = await se.boundingBox();
    await page.mouse.move(hb.x + 7, hb.y + 7); await page.mouse.down(); await page.mouse.move(hb.x + 47, hb.y + 47, { steps: 5 }); await page.mouse.up();
    expect(Number(await page.getByTestId("pc-pet-place-s").inputValue())).toBeGreaterThan(130);
    await page.getByTestId("pc-pet-place-s").fill("130");
    await page.getByTestId("pc-pet-place-bigger").click(); await expect(page.getByTestId("pc-pet-place-s")).toHaveValue("135");
    await page.getByTestId("pc-pet-place-smaller").click(); await expect(page.getByTestId("pc-pet-place-s")).toHaveValue("130");
    await page.getByTestId("pc-pet-place-h").fill("110");
    await expect(box.locator('[data-layer="dau"]').first()).toHaveAttribute("style", /scale\(1\.3, 1\.43\d*\)/);
    await page.getByTestId("pc-pet-place-h").fill("100");
    await page.screenshot({ path: "shots/pc-pet-place.png" });
    await page.getByTestId("pc-pet-place-save").click();
    await expect(box).toBeHidden();
    await waitDb(async () => { const [r] = await rest(`pet_items?id=eq.${ID}&select=place`); return r?.place?.tf?.y === 12 && r.place.tf.s === 1.3 && r.place.tf.x === 1 ? r : null; }, "đã lưu vị trí");
    await expect(edit.locator('[data-layer="dau"]').first()).toHaveAttribute("style", /scale\(1\.3, 1\.3\)/);
    await expect(page.getByTestId("pc-pet-place-open")).toContainText("đã chỉnh");
  } finally {
    await rest(`pet_items?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ price: row0?.price ?? 150, place: row0?.place ?? {}, redraw: row0?.redraw ?? false, redraw_note: row0?.redraw_note ?? null }) });
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
