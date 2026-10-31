// 01/11: tra cứu bài tập (bài có sẵn + bài khách tự thêm), đơn vị (lần / giây / phút), ảnh động tác (ảnh người thật, bản quyền công cộng).
import { useState } from "react";
import { EX_BY_ID, EXERCISES, MUSCLES, EQUIPS } from "./exercises.js";
import { EX_PHOTOS } from "./exPhotos.js";

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

// 01/11 (chủ dự án: hình nét xấu, khó hiểu) → ảnh người thật 2 khung tự đổi 0,9 s như ảnh động; CSS chung chèn 1 lần
const PH_CSS = ".fp-exph{position:relative;overflow:hidden;background:#E2E8F0;flex-shrink:0;display:block}"
  + ".fp-exph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}"
  + ".fp-exph img+img{animation:fpExSw 1.8s steps(1) infinite}.fp-exph[data-paused='1'] img+img{animation:none;opacity:0}"
  + "@keyframes fpExSw{0%{opacity:0}50%{opacity:1}}"
  + ".fp-exlb i{font-style:normal;height:24px;padding:0 9px;border-radius:12px;background:rgba(15,23,42,.62);color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center}"
  + ".fp-exlb i{animation:fpExHl 1.8s steps(1) infinite}.fp-exlb i+i{animation-delay:-.9s}"
  + ".fp-exph[data-paused='1'] .fp-exlb i{animation:none}.fp-exph[data-paused='1'] .fp-exlb i:first-child{background:#0062F0}"
  + "@keyframes fpExHl{0%{background:#0062F0}50%{background:rgba(15,23,42,.62)}}"
  + "@media (prefers-reduced-motion: reduce){.fp-exph img+img,.fp-exlb i{animation:none}.fp-exph img+img{opacity:0}}";
let cssOn = false;
const ensureCss = () => {
  if (cssOn || typeof document === "undefined") return;
  cssOn = true;
  const el = document.createElement("style"); el.setAttribute("data-fp", "exph"); el.textContent = PH_CSS; document.head.appendChild(el);
};
/** bài này có ảnh người thật không (bài tự thêm thì không) */
export const hasPhoto = (ex) => !!ex && !ex.custom && EX_PHOTOS.has(ex.id);
/** ô thay ảnh khi bài không có ảnh: nền màu nhóm cơ + tên nhóm cơ */
function NoPhoto({ ex, w, h, radius, big }) {
  const [bg, fg] = MUSCLE_TONE[ex?.muscle] || ["#F1F5F9", "#475569"];
  const name = MUSCLE_NAME[ex?.muscle] || "Bài của bạn";
  return <span aria-hidden="true" data-testid="wk-nophoto" style={{ width: w, height: h, borderRadius: radius, background: bg, color: fg, fontSize: big ? 20 : name.length > 5 ? 10 : 11.5, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textAlign: "center", lineHeight: 1.1, padding: 4, boxSizing: "border-box" }}>{name}</span>;
}
/** ảnh bài tập. Nhỏ (danh sách, đang tập): 64×48 bo 12, ảnh 128×96. To (chi tiết): rộng 100%, cao 230 bo 20, nhãn Bắt đầu / Kết thúc, chạm = dừng / chạy */
export function ExPhoto({ ex, big = false, w = 64, h = 48, radius = 12 }) {
  const [paused, setPaused] = useState(false);
  ensureCss();
  if (!hasPhoto(ex)) return <NoPhoto ex={ex} w={big ? "100%" : w} h={big ? 230 : h} radius={big ? 20 : radius} big={big} />;
  const dir = big ? "/ex/" : "/ex/t/";
  const imgs = [0, 1].map((f) => <img key={f} src={`${dir}${ex.id}-${f}.webp`} alt={f ? "" : `Động tác ${ex.vi}`} loading="lazy" decoding="async" draggable={false} />);
  if (!big) return <span className="fp-exph" data-testid="wk-photo" style={{ width: w, height: h, borderRadius: radius }}>{imgs}</span>;
  return (
    <span className="fp-exph" data-testid="wk-photo-big" data-paused={paused ? "1" : "0"} role="button" tabIndex={0} aria-label={paused ? "Chạy ảnh động tác" : "Dừng ảnh động tác"}
      onClick={() => setPaused((x) => !x)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPaused((x) => !x); } }}
      style={{ width: "100%", height: 230, borderRadius: 20, cursor: "pointer" }}>
      {imgs}
      <span className="fp-exlb" style={{ position: "absolute", left: 10, bottom: 10, display: "flex", gap: 6 }}><i>Bắt đầu</i><i>Kết thúc</i></span>
      <span aria-hidden="true" style={{ position: "absolute", right: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, background: "rgba(15,23,42,0.62)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{paused ? "▶" : "❚❚"}</span>
    </span>
  );
}
/** ô nhóm cơ 42 bo 13 (dòng danh sách) */
export function MuscleTile({ muscle, size = 42 }) {
  const [bg, fg] = MUSCLE_TONE[muscle] || ["#F1F5F9", "#475569"];
  const name = MUSCLE_NAME[muscle] || "Bài";
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.31), background: bg, color: fg, fontSize: name.length > 5 ? 9.5 : 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textAlign: "center", lineHeight: 1.1, padding: 2, boxSizing: "border-box" }}>{name}</span>;
}
