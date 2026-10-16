// node --test tests/ — kiểm số nhập Thiết lập lần đầu + tên đăng nhập từ email (bản vẽ 109–112)
import test from "node:test";
import assert from "node:assert/strict";
import { bodyErrors, bodyValid, daysToFrequency, goalDirectionError, isPlaceholderBody, usernameFromEmail, usernameCandidate } from "../src/lib/onboardingCheck.js";

const Y = 2026;

test("bodyErrors: ô trống không báo lỗi, số vô lý báo lỗi", () => {
  assert.deepEqual(bodyErrors({ cm: "", kg: "", birthYear: "" }, Y), { cm: null, kg: null, birthYear: null });
  const e = bodyErrors({ cm: 119, kg: 251, birthYear: 2020 }, Y);
  assert.ok(e.cm && e.kg && e.birthYear);
  assert.equal(bodyErrors({ cm: 221, kg: 29, birthYear: 1935 }, Y).birthYear !== null, true); // 91 tuổi
  const ok = bodyErrors({ cm: 120, kg: 30, birthYear: 2013 }, Y); // 13 tuổi
  assert.deepEqual(ok, { cm: null, kg: null, birthYear: null });
  assert.deepEqual(bodyErrors({ cm: 220, kg: 250, birthYear: 1936 }, Y), { cm: null, kg: null, birthYear: null }); // 90 tuổi
  assert.ok(bodyErrors({ birthYear: 1995.5 }, Y).birthYear);
});

test("bodyValid: cần đủ 3 ô hợp lệ", () => {
  assert.equal(bodyValid({ cm: 165, kg: 60, birthYear: 1995 }, Y), true);
  assert.equal(bodyValid({ cm: 165, kg: "60,5", birthYear: 1995 }, Y), true);
  assert.equal(bodyValid({ cm: 165, kg: "", birthYear: 1995 }, Y), false);
  assert.equal(bodyValid({ cm: 165, kg: 60 }, Y), false);
  assert.equal(bodyValid({ cm: 300, kg: 60, birthYear: 1995 }, Y), false);
});

test("daysToFrequency: khớp mức tần suất của calcMacro", () => {
  assert.equal(daysToFrequency(0), "occasional");
  assert.equal(daysToFrequency(1), "occasional");
  assert.equal(daysToFrequency(2), "occasional");
  assert.equal(daysToFrequency(3), "regular");
  assert.equal(daysToFrequency(4), "regular");
  assert.equal(daysToFrequency(5), "frequent");
  assert.equal(daysToFrequency(6), "frequent");
  assert.equal(daysToFrequency(7), "daily");
});

test("goalDirectionError: chặn mục tiêu ngược hướng", () => {
  assert.equal(goalDirectionError({ goalType: "cut", kg: 60, goalKg: 64 }), "Giảm mỡ thì cân mục tiêu phải nhỏ hơn cân hiện tại (60 kg). Hoặc chọn Tăng cơ.");
  assert.ok(goalDirectionError({ goalType: "cut", kg: 60, goalKg: 60 }));
  assert.equal(goalDirectionError({ goalType: "cut", kg: 60, goalKg: 55 }), null);
  assert.equal(goalDirectionError({ goalType: "bulk", kg: 64.4, goalKg: 64 }), "Tăng cơ thì cân mục tiêu phải lớn hơn cân hiện tại (64,4 kg). Hoặc chọn Giảm mỡ.");
  assert.ok(goalDirectionError({ goalType: "bulk", kg: 60, goalKg: 60 }));
  assert.equal(goalDirectionError({ goalType: "bulk", kg: 60, goalKg: 66 }), null);
  assert.equal(goalDirectionError({ goalType: "maintain", kg: 60, goalKg: 40 }), null);
  assert.equal(goalDirectionError({ goalType: "bulk", exerciseType: "none", kg: 60, goalKg: 50 }), null); // không tập = duy trì
  assert.equal(goalDirectionError({ goalType: "cut", kg: 60, goalKg: "" }), null); // còn trống
});

test("usernameFromEmail + usernameCandidate", () => {
  assert.equal(usernameFromEmail("Viet.Anh+gym@gmail.com"), "viet.anhgym");
  assert.equal(usernameFromEmail("Đức_Trần@x.vn"), "duc_tran");
  assert.equal(usernameFromEmail("@x.vn"), "user");
  assert.equal(usernameFromEmail("..__@x.vn"), "user");
  assert.equal(usernameFromEmail("a".repeat(30) + "@x.vn").length, 20);
  assert.equal(usernameCandidate("vietanh", 1), "vietanh");
  assert.equal(usernameCandidate("vietanh", 2), "vietanh2");
  assert.equal(usernameCandidate("a".repeat(20), 12), "a".repeat(18) + "12");
});

test("isPlaceholderBody: số mặc định app / mặc định cột DB coi như chưa nhập", () => {
  assert.equal(isPlaceholderBody({ cm: 172, kg: 63, birthYear: 1987, goalKg: 68 }), true);
  assert.equal(isPlaceholderBody({ cm: 170, kg: 60, birthYear: 1987, goalKg: 65, _defaulted: ["birthYear"] }), true);
  assert.equal(isPlaceholderBody({ cm: 170, kg: 60, goalKg: 65 }), true);
  assert.equal(isPlaceholderBody({ cm: 170, kg: 60, birthYear: 1995, goalKg: 65 }), false); // đã nhập năm sinh thật
  assert.equal(isPlaceholderBody({ cm: 172, kg: 64.4, birthYear: 1988, goalKg: 66 }), false);
});
