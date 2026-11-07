import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMap, thumbOf, normKey } from "../src/lib/foodImgMap.js";

test("ảnh món: map theo food_key, bỏ dòng chưa có ảnh; món tắt trang web vẫn có ảnh", () => {
  const m = buildMap([
    { food_key: "Phở bò ", image_url: "https://fipilotai.com/anh/2026/11/mon-pho-bo-anh-1_800w.webp", enabled: true },
    { food_key: "cơm tấm", image_url: null, enabled: true },
    { food_key: "bún chả", image_url: "https://x/a_800w.webp", enabled: false },
    null,
  ]);
  assert.deepEqual(Object.keys(m), ["phở bò", "bún chả"]);
  assert.equal(m[normKey("PHỞ BÒ")], "https://fipilotai.com/anh/2026/11/mon-pho-bo-anh-1_800w.webp");
});

test("ảnh món: ô nhỏ dùng bản 400w, ảnh khác giữ nguyên", () => {
  assert.equal(thumbOf("https://fipilotai.com/anh/2026/11/a_800w.webp"), "https://fipilotai.com/anh/2026/11/a_400w.webp");
  assert.equal(thumbOf("https://fipilotai.com/img/bowl-1.jpg"), "https://fipilotai.com/img/bowl-1.jpg");
  assert.equal(thumbOf(null), null);
});

import { withAliases } from "../src/lib/foodImgMap.js";
test("món đồng nghĩa / biến thể mượn ảnh, món khác hình thì không", () => {
  const m = withAliases({ "thịt heo": "A", "chuối": "B", "cơm chiên": "C", "bún": "D", "thịt bò": "E", "tôm": "F" },
    ["thịt lợn", "chuối tiêu", "cơm chiên dương châu", "bún đậu", "thịt bò xào", "tôm hùm", "chuối", "món lạ"]);
  assert.equal(m["thịt lợn"], "A"); assert.equal(m["chuối tiêu"], "B"); assert.equal(m["cơm chiên dương châu"], "C");
  assert.equal(m["bún đậu"], undefined); assert.equal(m["thịt bò xào"], undefined); assert.equal(m["tôm hùm"], undefined); assert.equal(m["món lạ"], undefined);
  assert.equal(m["chuối"], "B");
});
