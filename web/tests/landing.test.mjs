import { test } from "node:test";
import assert from "node:assert/strict";
import { emLines, steps, rows, isLp } from "../lib/landing.js";

test("tiêu đề landing: *chữ xanh* và | xuống dòng", () => {
  assert.deepEqual(emLines("Gặp *Pi*, chú mầm|ăn đúng"), [[{ t: "Gặp ", em: false }, { t: "Pi", em: true }, { t: ", chú mầm", em: false }], [{ t: "ăn đúng", em: false }]]);
  assert.deepEqual(emLines(""), [[]]);
});

test("bước hướng dẫn: đánh số, neo, tên ngắn trước dấu :", () => {
  const b = [{ type: "lp_hero" }, { type: "lp_step", title: "Ghi bữa ăn: 3 cách" }, { type: "p" }, { type: "lp_step", title: "Thực đơn", short: "Thực đơn AI" }];
  assert.deepEqual(steps(b), [{ n: 1, id: "buoc-1", short: "Ghi bữa ăn" }, { n: 2, id: "buoc-2", short: "Thực đơn AI" }]);
});

test("bỏ dòng trống trong danh sách con", () => {
  assert.equal(rows([{ title: "a" }, { title: " " }, { img: "/x.webp" }]).length, 2);
  assert.equal(rows(["a", "", " "]).length, 1);
  assert.equal(rows(null).length, 0);
  assert.ok(isLp({ type: "lp_step" }) && !isLp({ type: "p" }));
});
