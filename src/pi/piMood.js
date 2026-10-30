// 31/10 cá tính Pi (chủ dự án duyệt): hàm thuần, có test (tests/pi-mood.test.mjs).
//  1) foodGroup: món vừa ăn thuộc nhóm quen nào → Pi bình luận đúng món (nhóm câu "mon_an", src/pi/extraLines.json, muc = mã nhóm).
//  2) tapKind: chạm Pi liên tục — 5 lần trong 4 giây → nhột, 10 lần → dỗi (5 giây không phản ứng).
//  3) awaySulk: vắng ≥ 2 ngày, hôm nay chưa ghi bữa → Pi dỗi tới khi ghi 1 bữa hoặc chạm Pi 3 lần.

// thứ tự = ưu tiên (trà sữa trước "sữa", bánh mì trước "mì", mì tôm trước "mì"…)
export const FOOD_GROUPS = [
  ["tra_sua", ["trà sữa", "trân châu", "milk tea", "hồng trà sữa", "sữa tươi trân châu"]],
  ["mi_tom", ["mì tôm", "mì gói", "mì ăn liền", "mì hảo hảo", "mì cay"]],
  ["banh_mi", ["bánh mì"]],
  ["com_tam", ["cơm tấm", "sườn nướng", "sườn bì chả"]],
  ["pho_bun", ["phở", "bún", "hủ tiếu", "hủ tíu", "miến", "bánh canh", "mì quảng"]],
  ["xoi", ["xôi"]],
  ["trung", ["trứng"]],
  ["ga", ["gà", "ức gà", "đùi gà"]],
  ["ca", ["cá", "cá hồi", "cá ngừ", "cá basa", "cá thu"]],
  ["rau", ["rau", "salad", "xà lách", "bông cải", "súp lơ", "cải", "dưa leo", "dưa chuột", "cà chua"]],
];
const norm = (s) => ` ${String(s || "").toLowerCase().normalize("NFC").replace(/[^0-9a-zà-ỹđ]+/gi, " ").trim()} `;
/** tên các món (mảng chuỗi) → mã nhóm đầu tiên khớp, không khớp → null */
export function foodGroup(names = []) {
  const t = names.map(norm).join(" | ");
  for (const [key, words] of FOOD_GROUPS) if (words.some((w) => t.includes(` ${w} `))) return key;
  return null;
}

export const TAP_WINDOW = 4000, TAP_TICKLE = 5, TAP_SULK = 10, SULK_MS = 5000;
/** times: mốc chạm (ms, tăng dần, đã gồm lần này) → { n: số lần trong chuỗi liền (cách nhau ≤ 4 s), kind: null | "nhot" | "doi" } */
export function tapKind(times = []) {
  let n = 0;
  for (let i = times.length - 1; i >= 0; i--) { if (i < times.length - 1 && times[i + 1] - times[i] > TAP_WINDOW) break; n++; }
  return { n, kind: n === TAP_SULK ? "doi" : n === TAP_TICKLE ? "nhot" : null };
}

export const FORGIVE_TAPS = 3;
/** Pi đang dỗi vì vắng mặt? daysAway ≥ 2, hôm nay chưa ghi bữa nào, chưa được dỗ (chạm 3 lần) */
export const awaySulk = ({ daysAway = 0, logged = 0, forgiveTaps = 0 }) => daysAway >= 2 && logged === 0 && forgiveTaps < FORGIVE_TAPS;
