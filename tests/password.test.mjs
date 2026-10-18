import test from "node:test";
import assert from "node:assert/strict";
import { passwordError } from "../src/lib/password.js";
test("quy định mật khẩu đăng ký", () => {
  assert.match(passwordError("123"), /8 ký tự/);
  assert.match(passwordError("12345678"), /chữ và số/);
  assert.match(passwordError("matkhaudai"), /chữ và số/);
  assert.equal(passwordError("matkhau123"), null);
  assert.equal(passwordError("mậtkhẩu12"), null);
});
