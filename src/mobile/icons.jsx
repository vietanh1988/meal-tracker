// Bộ icon 1 style (bản vẽ 66–68, chốt 14/10):
//  - lưới 24, nét 2 bo tròn, icon trắng trong ô bo 30% có gradient nhẹ cùng màu (sáng trên → đậm dưới),
//    viền sáng 1 px phía trên + bóng mềm cùng màu.
//  - Mỗi chức năng giữ 1 màu cố định ở mọi màn (bảng IC_COLOR).
//  - Thay toàn bộ icon PNG 3D cũ (thanh dưới, bữa ăn, cân nặng, bi macro).
const P = {
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></>,
  plate: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></>,
  progress: <><path d="M4 19l5-6 4 3 7-9" /><path d="M15 7h5v5" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4.5 4.5-6.5 8-6.5s6.5 2 8 6.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  sunrise: <><path d="M3 18h18M5 14a7 7 0 0 1 14 0" /><path d="M12 3v3M4.5 7.5l1.8 1.8M19.5 7.5l-1.8 1.8" /></>,
  cup: <><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M9 3c-.5 1 .5 2 0 3M12 3c-.5 1 .5 2 0 3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></>,
  apple: <><path d="M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 5-5 5-9 0-5.5-5-6-7-4z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  dumbbell: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  protein: <><path d="M3 12c3-5 9-6.5 14-2.5l4-3v11l-4-3C12 18.5 6 17 3 12z" /><circle cx="8.5" cy="11" r="1" fill="currentColor" /></>,
  carb: <><path d="M12 21V8" /><path d="M12 8c-3-1-4-4-3-6 3 0 4 3 3 6zM12 13c-3-1-5-3-5-6 3 0 5 3 5 6zM12 13c3-1 5-3 5-6-3 0-5 3-5 6zM12 18c-3-1-5-3-5-6 3 0 5 3 5 6zM12 18c3-1 5-3 5-6-3 0-5 3-5 6z" /></>,
  fat: <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" /></>,
  fiber: <><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" /><path d="M5 19l8-8" /></>,
  drop: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  scale: <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2" /></>,
};
export const IC_COLOR = {
  home: "#007AFF", plate: "#00A67E", plus: "#EA580C", progress: "#7C3AED", me: "#0891B2",
  sang: "#F59E0B", phu_sang: "#0D9488", trua: "#F97316", phu_chieu: "#E11D48", pre: "#EAB308", post: "#16A34A", toi: "#6366F1",
  protein: "#2563EB", carb: "#0D9488", fat: "#F59E0B", fiber: "#16A34A", water: "#0891B2", weight: "#64748B",
};
export const MEAL_ICON_KEY = { sang: "sunrise", phu_sang: "cup", trua: "sun", phu_chieu: "apple", pre: "bolt", post: "dumbbell", toi: "moon" };

// Pha màu hex (an toàn cho Safari cũ, không dùng color-mix)
function mix(hex, to, t) {
  const h = (x) => parseInt(x, 16);
  const a = hex.replace("#", ""), b = to.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.round(h(a.slice(i, i + 2)) * (1 - t) + h(b.slice(i, i + 2)) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
export const chipBg = (c) => `linear-gradient(160deg, ${mix(c, "#FFFFFF", 0.3)} 0%, ${c} 55%, ${mix(c, "#000000", 0.15)} 100%)`;
const rgba = (hex, a) => { const x = hex.replace("#", ""); return `rgba(${parseInt(x.slice(0, 2), 16)},${parseInt(x.slice(2, 4), 16)},${parseInt(x.slice(4, 6), 16)},${a})`; };

export function Glyph({ name, size = 22, stroke = 2, color = "currentColor" }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{P[name]}</svg>;
}
// Ô icon chuẩn: size 44/36/32/24…, icon ~ 50% ô
export function AppIcon({ name, color, size = 36, glyph, dim, children }) {
  const g = glyph || Math.round(size * 0.55);
  return (
    <span aria-hidden="true" className="fp-ic" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: chipBg(color), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 10px ${rgba(color, 0.3)}`, opacity: dim ? 0.55 : 1 }}>
      {children || <Glyph name={name} size={g} stroke={size <= 26 ? 2.4 : 2} />}
    </span>
  );
}
export function MealIcon({ id, size = 36, dim }) {
  return <AppIcon name={MEAL_ICON_KEY[id] || "plate"} color={IC_COLOR[id] || "#007AFF"} size={size} dim={dim} />;
}
