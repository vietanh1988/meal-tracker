// Tạo tài khoản test trên Supabase LOCAL + hồ sơ đầy đủ + Lịch tuần cho hôm nay.
import { writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { todayVN, templateKeyOf } from "../../src/lib/dateVN.js";

export default async function globalSetup() {
  const url = process.env.E2E_SUPABASE_URL;
  const service = process.env.E2E_SERVICE_KEY;
  if (!url || !service) throw new Error("Thiếu E2E_SUPABASE_URL / E2E_SERVICE_KEY (chỉ chạy với Supabase local)");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("E2E chỉ được chạy với Supabase LOCAL");

  const h = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  const email = `e2e_${Date.now()}@test.local`;
  const password = randomBytes(12).toString("hex");
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST", headers: h,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username: "e2e_tester" } }),
  });
  const u = await r.json();
  if (!r.ok) throw new Error("Tạo user test lỗi: " + JSON.stringify(u));
  const uid = u.id;

  const today = todayVN();
  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH", headers: { ...h, Prefer: "return=representation" },
    body: JSON.stringify({
      onboarding_done: true, gender: "male", cm: 172, kg: 64.4, birth_year: 1988,
      goal_type: "bulk", goal_kg: 66, months: 4, exercise_type: "gym", frequency: "regular",
      gym_days: [0, 1, 2, 3, 4, 5, 6], tier: "premium", is_test: true,
      push_dismissed_date: today, push_enabled_clicked: true, push_prompted_after_eaten: true, banner_dismissed_date: today,
    }),
  });
  if (!p.ok) throw new Error("Cập nhật profile test lỗi: " + (await p.text()));

  const meals = [
    { meal_id: "sang", meal_name: "Bữa sáng", items: [{ food: "Phở bò", gram: 400, cal: 450, p: 25, c: 55, f: 12, fiber: 2 }] },
    { meal_id: "trua", meal_name: "Bữa trưa", items: [{ food: "Cơm trắng", gram: 200, cal: 260, p: 5, c: 57, f: 1 }, { food: "Gà luộc", gram: 150, cal: 250, p: 38, c: 0, f: 10 }] },
  ];
  const t = await fetch(`${url}/rest/v1/weekly_templates`, {
    method: "POST", headers: h,
    body: JSON.stringify({ user_id: uid, day_name: templateKeyOf(today), name: "E2E", day_type: "train", meals, total_cal: 960, is_default: false }),
  });
  if (!t.ok) throw new Error("Tạo Lịch tuần test lỗi: " + (await t.text()));

  // Hôm qua: bữa trưa đã ăn, lưu kiểu dữ liệu cũ (meal_name = "trua") — kiểm hiển thị tên có dấu + Ăn lại
  const { addDays } = await import("../../src/lib/dateVN.js");
  const y = await fetch(`${url}/rest/v1/daily_logs`, {
    method: "POST", headers: h,
    body: JSON.stringify({ user_id: uid, log_date: addDays(today, -1), day_type: "train", meals: [{ meal_id: "trua", meal_name: "trua", items: [{ food: "Bún chả", gram: 350, cal: 520, p: 28, c: 60, f: 18 }] }], eaten_meals: ["trua"], total_cal: 520 }),
  });
  if (!y.ok) throw new Error("Tạo nhật ký hôm qua lỗi: " + (await y.text()));

  writeFileSync(new URL("./.state.json", import.meta.url), JSON.stringify({ url, service, email, password, uid, today }));
}
