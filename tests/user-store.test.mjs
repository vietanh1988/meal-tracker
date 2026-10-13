// Lưu trên máy theo từng tài khoản + xoá khi đăng xuất (14/10)
import { test } from "node:test";
import assert from "node:assert/strict";
import { userKey, clearUserStore, USER_KEYS } from "../src/lib/userStore.js";

function fakeStorage(init) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

test("khoá khác nhau cho từng tài khoản", () => {
  assert.notEqual(userKey("fp_menu_prefs", "a"), userKey("fp_menu_prefs", "b"));
  assert.equal(userKey("aicoach_backup", null), "aicoach_backup:anon");
});

test("đăng xuất xoá khoá của user (cả khoá cũ chung), giữ khoá khác", () => {
  const s = fakeStorage({ "fp_menu_prefs": "{}", "fp_menu_prefs:u1": "{\"avoid\":\"tôm\"}", "aicoach_backup:u1": "[]", "aicoach_backup": "[]", "fp_cup_ml": "250", "fipilot_version": "3.8" });
  clearUserStore(s);
  assert.deepEqual([...s._m.keys()].sort(), ["fipilot_version", "fp_cup_ml"]);
  assert.ok(USER_KEYS.includes("fp_menu_prefs"));
});
