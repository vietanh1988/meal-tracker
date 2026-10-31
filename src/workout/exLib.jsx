// 01/11: tra cứu bài tập (bài có sẵn + bài khách tự thêm), đơn vị (lần / giây / phút), hình nét minh hoạ theo kiểu động tác (vẽ tay, không dùng hình có bản quyền).
import { EX_BY_ID, EXERCISES, MUSCLES, EQUIPS } from "./exercises.js";

export { EXERCISES, MUSCLES, EQUIPS };
export const MUSCLE_NAME = Object.fromEntries(MUSCLES);
// màu nhóm cơ: [nền, chữ]
export const MUSCLE_TONE = {
  nguc: ["#FFE4E6", "#BE123C"], lung: ["#DBEAFE", "#1D4ED8"], vai: ["#FEF3C7", "#B45309"], tay_truoc: ["#DCFCE7", "#15803D"], tay_sau: ["#E0E7FF", "#4338CA"],
  chan: ["#FCE7F3", "#BE185D"], mong: ["#FFEDD5", "#C2410C"], bung: ["#CCFBF1", "#0F766E"], cardio: ["#F3EEFF", "#6D28D9"],
};
const TIME_SEC = new Set(["plank", "jump-rope", "mountain-climber", "side-plank", "wall-sit", "dead-hang"]);

/** bài theo id: có sẵn → bài tự thêm → chỗ trống (bài đã bị xoá) */
export function exOf(id, custom) {
  if (EX_BY_ID[id]) return EX_BY_ID[id];
  const c = (custom || []).find((x) => x.id === id);
  if (c) return { id: c.id, vi: c.vi, en: c.en || "", muscle: c.muscle, sub: [], equip: c.equip || "khong", level: "co_ban", pattern: "press", steps: [], tip: "", custom: true };
  return { id, vi: id, en: "", muscle: "", sub: [], equip: "khong", level: "co_ban", pattern: "press", steps: [], tip: "", gone: true };
}
/** đơn vị số lần: "lần" · "giây" (plank, nhảy dây…) · "phút" (cardio đi bộ, đạp xe…) */
export function unitOf(ex) {
  if (!ex) return "lần";
  if (TIME_SEC.has(ex.id)) return "giây";
  if (ex.pattern === "cardio" && !/burpee|climber|jack/.test(ex.id)) return "phút";
  return "lần";
}
/** có ô kg không (bài tạ người / tính giờ thì không) */
export const hasKg = (ex) => !!ex && unitOf(ex) === "lần" && ex.equip !== "khong";
export const fmtKg = (n) => String(Math.round((Number(n) || 0) * 10) / 10).replace(".", ",");
export const allExercises = (custom) => [...EXERCISES, ...(custom || []).map((c) => exOf(c.id, custom))];

// hình nét: người que + dụng cụ, theo kiểu động tác
const P = {
  press: <><path d="M20 82h110M42 82v12M108 82v12" /><path d="M36 66h78" /><circle cx="48" cy="58" r="8" /><path d="M56 62c18 2 30 3 48 0" /><path d="M74 62V36M94 62V36" /><path d="M48 36h74M40 28v16M130 28v16" /></>,
  fly: <><path d="M20 82h110" /><circle cx="75" cy="30" r="8" /><path d="M75 38v28M75 66l-12 16M75 66l12 16" /><path d="M75 46c-14 0-26-4-38-12M75 46c14 0 26-4 38-12" /><path d="M30 28v12M120 28v12" /></>,
  row: <><path d="M20 90h110" /><circle cx="58" cy="30" r="8" /><path d="M62 38l26 18M88 56l4 34M88 56l-12 34" /><path d="M70 46l-6 22M80 52l-4 22" /><path d="M40 70h70M36 62v16M114 62v16" /></>,
  pulldown: <><path d="M75 10v20M40 30h70" /><circle cx="75" cy="46" r="8" /><path d="M75 54v22M75 76l-14 14M75 76l14 14M60 66h30" /><path d="M75 58c-10-6-22-14-30-28M75 58c10-6 22-14 30-28" /></>,
  pullup: <><path d="M30 14h90" /><circle cx="75" cy="34" r="8" /><path d="M75 42v30M75 72l-8 22M75 72l8 22" /><path d="M75 46c-10-6-18-18-22-32M75 46c10-6 18-18 22-32" /></>,
  squat: <><path d="M20 94h110" /><path d="M40 30h70M34 22v16M116 22v16" /><circle cx="75" cy="20" r="8" /><path d="M75 28l-4 30M71 58l-20 6M51 64l4 30M71 58l18 6M89 64l-4 30" /></>,
  lunge: <><path d="M20 94h110" /><circle cx="70" cy="22" r="8" /><path d="M70 30v30M70 60l-24 4M46 64l-4 30M70 60l24 14M94 74l18 20" /><path d="M58 40l-10 18M82 40l10 18" /></>,
  hinge: <><path d="M20 94h110" /><circle cx="50" cy="32" r="8" /><path d="M56 38l40 10M96 48l-4 46M96 48l6 46" /><path d="M68 42l-2 34M80 46l-2 30M44 76h64M40 68v16M112 68v16" /></>,
  curl: <><path d="M20 94h110" /><circle cx="75" cy="18" r="8" /><path d="M75 26v38M75 64l-10 30M75 64l10 30" /><path d="M75 34l-14 18 10-20M75 34l14 18-10-20" /><path d="M52 32h14M84 32h14" /></>,
  extension: <><path d="M20 94h110" /><circle cx="75" cy="28" r="8" /><path d="M75 36v30M75 66l-10 28M75 66l10 28" /><path d="M75 42l-12-20 12-12M75 42l12-20-12-12" /><path d="M66 8h18" /></>,
  raise: <><path d="M20 94h110" /><circle cx="75" cy="22" r="8" /><path d="M75 30v34M75 64l-10 30M75 64l10 30" /><path d="M75 38h-34M75 38h34" /><path d="M36 32v12M114 32v12" /></>,
  calf: <><path d="M20 94h110M56 86h38" /><circle cx="75" cy="16" r="8" /><path d="M75 24v34M75 58l-6 28M75 58l6 28" /><path d="M75 32l-10 22M75 32l10 22" /></>,
  core: <><path d="M20 90h110" /><circle cx="32" cy="70" r="8" /><path d="M40 72h56M96 72l18 18M52 72v18M64 72l-4 18" /></>,
  cardio: <><path d="M20 94h110" /><circle cx="80" cy="20" r="8" /><path d="M78 28l-6 30M72 58l-18 12M54 70l-6 20M72 58l16 16M88 74l-4 20M76 36l-18 10M76 36l16 14" /></>,
};
export function ExArt({ pattern, size = 150, color = "#0062F0" }) {
  return (
    <svg aria-hidden="true" width={size} height={Math.round(size * 0.68)} viewBox="0 0 150 102">
      <g fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">{P[pattern] || P.press}</g>
    </svg>
  );
}
/** ô nhóm cơ 42 bo 13 (dòng danh sách) */
export function MuscleTile({ muscle, size = 42 }) {
  const [bg, fg] = MUSCLE_TONE[muscle] || ["#F1F5F9", "#475569"];
  const name = MUSCLE_NAME[muscle] || "Bài";
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), background: bg, color: fg, fontSize: name.length > 5 ? 9.5 : 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textAlign: "center", lineHeight: 1.1, padding: 2, boxSizing: "border-box" }}>{name}</span>;
}
