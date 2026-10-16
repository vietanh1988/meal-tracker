import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeMyFoods } from "../src/lib/myFoods.js";

const A = { p: 3, c: 15, f: 4, fiber: 0, cal: 130, gram: 40 };
const B = { p: 1, c: 2, f: 3, fiber: 0, cal: 40, gram: 10 };

test("gộp: server thắng khi trùng tên, món chỉ trên máy cần đẩy lên", () => {
  const { merged, localOnly } = mergeMyFoods({ "bánh khọt": { ...A, cal: 999 }, "chè": B }, [{ food_name: "bánh khọt", data: A }]);
  assert.equal(merged["bánh khọt"].cal, 130);
  assert.deepEqual(Object.keys(localOnly), ["chè"]);
  assert.equal(merged["chè"].cal, 40);
});

test("bỏ bản ghi hỏng (không gram / không kcal)", () => {
  const { merged, localOnly } = mergeMyFoods({ x: { cal: 10 }, y: null }, [{ food_name: "z", data: { gram: 0, cal: 5 } }, null]);
  assert.deepEqual(merged, {});
  assert.deepEqual(localOnly, {});
});

test("máy mới (trống) nhận hết từ server", () => {
  const { merged, localOnly } = mergeMyFoods({}, [{ food_name: "chè", data: B }]);
  assert.deepEqual(merged, { "chè": B });
  assert.deepEqual(localOnly, {});
});
