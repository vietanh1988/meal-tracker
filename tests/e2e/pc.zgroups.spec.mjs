import { test, expect } from "@playwright/test";
import { login, rest, S } from "./helpers.mjs";

// 19/10: thanh bên Quản trị PC — bấm tên nhóm để thu gọn / mở, nhớ sau khi tải lại; nhóm chứa trang đang mở không thu được.
test("Quản trị PC: thu gọn / mở nhóm thanh bên, nhớ theo máy", async ({ page }) => {
  const s = S();
  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  try {
    await login(page);
    await page.getByTestId("pc-open-admin").click();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await page.getByTestId("pc-nav-home").click();
    // Mặc định mở hết
    await expect(page.getByTestId("pc-nav-feedback")).toBeVisible();
    await expect(page.getByTestId("pc-group-btn-noi-dung")).toHaveAttribute("aria-expanded", "true");
    // Thu nhóm NỘI DUNG
    await page.getByTestId("pc-group-btn-noi-dung").click();
    await expect(page.getByTestId("pc-group-btn-noi-dung")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("pc-nav-feedback")).toHaveCount(0);
    await expect(page.getByTestId("pc-group-btn-noi-dung")).toContainText("· 5");
    // Tải lại vẫn thu
    await page.reload();
    await expect(page.getByTestId("pc-admin")).toBeVisible();
    await expect(page.getByTestId("pc-nav-feedback")).toHaveCount(0);
    // Nhóm đang chứa trang hiện tại (TỔNG QUAN) không thu được
    await page.getByTestId("pc-group-btn-tong-quan").click();
    await expect(page.getByTestId("pc-nav-home")).toBeVisible();
    // Mở lại
    await page.getByTestId("pc-group-btn-noi-dung").click();
    await expect(page.getByTestId("pc-nav-feedback")).toBeVisible();
    await page.screenshot({ path: "shots/pc-nav-groups.png" });
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
  }
});
