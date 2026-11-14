// 14/11 (Vercel free sắp hết CPU): trang danh sách phải đi qua đường dẫn có lưu đệm; trang có tham số động phải khai generateStaticParams
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { listRewrite } from "../lib/listRewrite.js";

const sp = (q) => new URLSearchParams(q);
test("middleware chuyển thầm trang danh sách sang đường dẫn lưu đệm", () => {
  assert.equal(listRewrite("/bai-viet", sp("")), "/bai-viet/trang/1");
  assert.equal(listRewrite("/bai-viet", sp("trang=3&utm_source=fb")), "/bai-viet/trang/3");
  assert.equal(listRewrite("/chu-de/giam-can", sp("trang=2")), "/chu-de/giam-can/trang/2");
  assert.equal(listRewrite("/bang-calo", sp("")), "/bang-calo/xem/_/1");
  assert.equal(listRewrite("/bang-calo", sp("nhom=trai-cay&trang=2")), "/bang-calo/xem/trai-cay/2");
  assert.equal(listRewrite("/bang-calo", sp("q=pho")), null); // tìm món: trang gốc
  assert.equal(listRewrite("/bai-viet", sp("trang=abc")), null);
  assert.equal(listRewrite("/bai-viet", sp("trang=0")), null);
  assert.equal(listRewrite("/chu-de/a/b", sp("")), null);
  assert.equal(listRewrite("/calo/pho-bo", sp("")), null);
});

test("trang [tham số] có revalidate thì phải có generateStaticParams (không thì Next dựng lại mỗi lượt mở)", () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const bad = walk("app").filter((f) => /\[[^/]+\]/.test(f) && /\/(page|route)\.js$/.test(f)).filter((f) => {
    const s = fs.readFileSync(f, "utf8");
    return /export const revalidate/.test(s) && !/generateStaticParams/.test(s) && !/searchParams/.test(s); // đọc ?tham số → middleware chuyển sang bản lưu đệm
  });
  assert.deepEqual(bad, []);
});

test("không còn lưu đệm ngắn (dưới 1 giờ) ở trang nội dung", () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const short = walk("app").concat(walk("lib")).filter((f) => f.endsWith(".js")).filter((f) => /export const revalidate = ([0-9]{1,3}|[0-2][0-9]{3})\b;|revalidate: ([0-9]{1,3}|[0-2][0-9]{3})\b/.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(short.sort(), ["app/pi/[nick]/page.js", "app/pi/xep-hang/page.js"]); // Pi: số đổi liên tục, 5 phút
});
