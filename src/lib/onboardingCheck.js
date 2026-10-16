// Kiểm số nhập ở Thiết lập lần đầu (bản vẽ 110–112) + đặt tên đăng nhập từ email (bản vẽ 109).
// Hàm thuần, có test ở tests/onboarding-check.test.mjs.

export const BODY_LIMITS = { cm: [120, 220], kg: [30, 250], age: [13, 90] };

const numOf = (v) => (v === "" || v === null || v === undefined ? NaN : Number(String(v).replace(",", ".")));
const kgText = (n) => String(Math.round(Number(n) * 10) / 10).replace(".", ",");

// Lỗi từng ô cơ thể (null = hợp lệ hoặc còn trống). year = năm hiện tại theo giờ VN.
export function bodyErrors({ cm, kg, birthYear }, year) {
  const e = { cm: null, kg: null, birthYear: null };
  const c = numOf(cm), k = numOf(kg), y = numOf(birthYear);
  if (!Number.isNaN(c) && (c < BODY_LIMITS.cm[0] || c > BODY_LIMITS.cm[1])) e.cm = `Chiều cao từ ${BODY_LIMITS.cm[0]} đến ${BODY_LIMITS.cm[1]} cm`;
  if (!Number.isNaN(k) && (k < BODY_LIMITS.kg[0] || k > BODY_LIMITS.kg[1])) e.kg = `Cân nặng từ ${BODY_LIMITS.kg[0]} đến ${BODY_LIMITS.kg[1]} kg`;
  if (!Number.isNaN(y)) {
    const age = year - y;
    if (!Number.isInteger(y) || age < BODY_LIMITS.age[0] || age > BODY_LIMITS.age[1]) e.birthYear = `Tuổi từ ${BODY_LIMITS.age[0]} đến ${BODY_LIMITS.age[1]} (năm sinh ${year - BODY_LIMITS.age[1]}–${year - BODY_LIMITS.age[0]})`;
  }
  return e;
}

// Đủ 3 ô và không ô nào sai → mới cho bấm Tiếp tục
export function bodyValid(v, year) {
  if ([v.cm, v.kg, v.birthYear].some((x) => Number.isNaN(numOf(x)))) return false;
  const e = bodyErrors(v, year);
  return !e.cm && !e.kg && !e.birthYear;
}

// Số đo chưa từng nhập thật: đúng bộ mặc định của app (useProfile DEFAULT 172 cm · 63 kg · 1987 · mục tiêu 68,
// như looksDefault ở GoalsScreen) hoặc đúng mặc định cột DB khi tạo tài khoản (cm 170 · kg 60 · goal_kg 65, năm sinh trống).
export function isPlaceholderBody(pr) {
  if (!pr) return true;
  const n = (v) => Number(v);
  if (n(pr.cm) === 172 && n(pr.kg) === 63 && n(pr.birthYear) === 1987 && n(pr.goalKg) === 68) return true;
  const noYear = !pr.birthYear || (pr._defaulted || []).includes("birthYear");
  return n(pr.cm) === 170 && n(pr.kg) === 60 && n(pr.goalKg) === 65 && noYear;
}

// Số ngày tập/tuần → mức tần suất mà calcMacro dùng (occasional 1–2 · regular 3–4 · frequent 5–6 · daily 7)
export function daysToFrequency(n) {
  const d = Number(n) || 0;
  if (d <= 2) return "occasional";
  if (d <= 4) return "regular";
  if (d <= 6) return "frequent";
  return "daily";
}

// Mục tiêu ngược hướng (giống chặn ở Mục tiêu & macro): Giảm mỡ mà mục tiêu ≥ cân hiện tại, Tăng cơ mà ≤.
// Không tập + Tăng cơ = Duy trì (như calcMacro). Trả câu báo lỗi hoặc null.
export function goalDirectionError({ goalType, kg, goalKg, exerciseType }) {
  const goal = exerciseType === "none" && goalType === "bulk" ? "maintain" : goalType || "bulk";
  const k = numOf(kg), g = numOf(goalKg);
  if (goal === "maintain" || Number.isNaN(k) || Number.isNaN(g)) return null;
  if (goal === "cut" && g >= k) return `Giảm mỡ thì cân mục tiêu phải nhỏ hơn cân hiện tại (${kgText(k)} kg). Hoặc chọn Tăng cơ.`;
  if (goal === "bulk" && g <= k) return `Tăng cơ thì cân mục tiêu phải lớn hơn cân hiện tại (${kgText(k)} kg). Hoặc chọn Giảm mỡ.`;
  return null;
}

// Tên đăng nhập gốc từ phần trước @ của email: bỏ dấu, chữ thường, chỉ a-z 0-9 . _ (tối đa 20 ký tự)
export function usernameFromEmail(email) {
  const local = String(email || "").split("@")[0] || "";
  const base = local.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/[^a-z0-9._]/g, "").replace(/^[._]+|[._]+$/g, "").slice(0, 20);
  return base || "user";
}

// Thứ tự thử khi trùng: tên, tên2, tên3 … (giữ ≤ 20 ký tự)
export function usernameCandidate(base, n) {
  if (!n || n < 2) return base;
  const suf = String(n);
  return base.slice(0, 20 - suf.length) + suf;
}
