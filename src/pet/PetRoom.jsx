// Phòng của Pi (20/10): không gian sau lưng Pi, đổi theo giờ VN (sáng / chiều / tối), màu theo bản (nam xanh, nữ hồng).
// Kệ bên phải trưng đồ thành tích đã nhận; góc phải có thảm tập + tạ; góc trái chậu cây; tối thì bật đèn bàn.
// 20/10: dùng ảnh phòng 3D (ChatGPT) public/pet/khong-gian/phong-<sang|chieu|toi>-<nam|nu>.webp (vuông). Ảnh đặt sao cho
// tâm thảm tròn (79% chiều cao ảnh) nằm dưới chân Pi (cách đáy khung 26 px); kệ gỗ bên phải: tầng giữa (41%) bày đồ thành tích.
// art={false} → nền SVG cũ (dự phòng).
import { useLayoutEffect, useRef, useState } from "react";
import { PET_BASE, ITEMS } from "./PetAvatar";
import { EV_NAME, RUG, roomFile, piRoomTime } from "../pi/piCatalog";

/** giờ (0–23, giờ VN) → "sang" | "chieu" | "toi" */
export const roomTime = (h) => (h >= 5 && h < 16 ? "sang" : h >= 16 && h < 19 ? "chieu" : "toi");

const SKY = {
  sang: { wall: ["#F4F9FF", "#DCEBFF"], sky: ["#7CC4FF", "#CFEAFF"], floor: ["#E9C9A0", "#D2A877"], line: "#C59767", shade: 0 },
  chieu: { wall: ["#FFF6EC", "#FFE1C2"], sky: ["#FF9F68", "#FFD59A"], floor: ["#E2BB8E", "#C99A66"], line: "#B9875A", shade: 0.04 },
  toi: { wall: ["#2A3A63", "#18233F"], sky: ["#0B1430", "#23336A"], floor: ["#5B4A3E", "#433629"], line: "#382C22", shade: 0.25 },
};
const ACC = { nam: { rug: ["#BFDBFE", "#93C5FD"], curtain: "#60A5FA", mat: "#3B82F6" }, nu: { rug: ["#FBCFE8", "#F9A8D4"], curtain: "#F472B6", mat: "#EC4899" } };

const RUG_Y = 0.79, FEET = 26, SHELF = { left: 0.775, width: 0.2, bottom: 0.405, h: 0.075 };
// Phòng theo dịp (20/10, ChatGPT): ảnh phong-<giờ>-<bản>-<dịp>.webp. Dịp nào chưa có ảnh cho bản đó → phòng thường.
// rug: tâm thảm đo lại trên ảnh dịp (ChatGPT vẽ thảm thấp hơn ~1%).
export const SEASON_ART = { noel: { nam: true }, tet: { nu: true }, halloween: { nam: true, nu: true }, "bong-da": { nam: true, nu: true } };
const SEASON_RUG = { noel: 0.8, tet: 0.805, halloween: 0.843, "bong-da": 0.815 };
// Noel: tất treo che tầng giữa kệ → đồ thành tích xuống tầng dưới (đáy 52,7%).
// Halloween (ảnh ngang 1536×1024 cắt vuông quanh thảm): kệ sát mép phải, tầng giữa trống ở đáy 51,5%.
const SEASON_SHELF = { noel: { ...SHELF, bottom: 0.527 }, halloween: { left: 0.81, width: 0.18, bottom: 0.515, h: 0.07 }, "bong-da": { left: 0.6, width: 0.2, bottom: 0.48, h: 0.08 } };
export function PetRoom({ time = "sang", hour, variant = "nam", season = null, trophies = [], height = 280, art, children, testid = "pet-room" }) {
  const ref = useRef(null);
  const [w, setW] = useState(366);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const upd = () => setW(el.clientWidth || 366);
    upd();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);
  const v = variant === "nu" ? "nu" : "nam";
  // 23/10: phòng bộ mới (Muse AI) — ảnh dọc 2:3 theo sự kiện + buổi (sáng 5–11, trưa 11–17, tối 17–5); Pi đứng giữa thảm
  if (season && EV_NAME[season] && art !== false) {
    const t3 = piRoomTime(hour ?? (time === "toi" ? 20 : time === "chieu" ? 16 : 9));
    const [rx, ry] = RUG[season] || [0.5, 0.8];
    const iw = w * 1.12, ih = iw * 1.5, top = Math.min(0, height - FEET - ry * ih); // rộng hơn khung 12% để dời thảm vào giữa mà không hở mép
    return (
      <div ref={ref} data-testid={testid} data-time={t3} data-season={season} style={{ position: "relative", height, borderRadius: 22, overflow: "hidden", background: t3 === "toi" ? "#1E2A55" : "#F2E6D3" }}>
        <img aria-hidden="true" src={roomFile(season, t3)} alt="" draggable="false" decoding="async" style={{ position: "absolute", left: Math.min(0, Math.max(w - iw, w / 2 - rx * iw)), top, width: iw, height: ih, display: "block" }} />
        {children}
      </div>
    );
  }
  const dip = season && SEASON_ART[season]?.[v] ? season : null;
  const img = art === false ? null : art || `khong-gian/phong-${time === "chieu" || time === "toi" ? time : "sang"}-${v}${dip ? `-${dip}` : ""}.webp`;
  if (img) {
    const shelfItems = trophies.map((x) => ITEMS[x]).filter(Boolean).slice(0, 3);
    const sh = (dip && !art && SEASON_SHELF[dip]) || SHELF;
    const top = height - FEET - (dip && !art ? SEASON_RUG[dip] : RUG_Y) * w;
    return (
      <div ref={ref} data-testid={testid} data-time={time} data-season={dip || ""} style={{ position: "relative", height, borderRadius: 22, overflow: "hidden", background: time === "toi" ? "#1E2A55" : "#BFD7FF" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, top, width: w, height: w }}>
          <img src={PET_BASE + img} alt="" draggable="false" style={{ display: "block", width: "100%", height: "100%" }} />
          {shelfItems.length > 0 && (
            <span style={{ position: "absolute", left: `${sh.left * 100}%`, width: `${sh.width * 100}%`, top: `${(sh.bottom - sh.h) * 100}%`, height: `${sh.h * 100}%`, display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
              {shelfItems.map((it) => <img key={it.id} src={PET_BASE + it.file} alt="" title={it.name} style={{ height: "100%", maxWidth: "32%", objectFit: "contain", filter: "drop-shadow(0 2px 3px rgba(15,23,42,0.3))" }} />)}
            </span>
          )}
        </div>
        {children}
      </div>
    );
  }
  return <SvgRoom time={time} variant={variant} trophies={trophies} height={height} testid={testid}>{children}</SvgRoom>;
}

function SvgRoom({ time, variant, trophies, height, children, testid }) {
  const art = null;
  const t = SKY[time] || SKY.sang;
  const a = ACC[variant] || ACC.nam;
  const night = time === "toi";
  const id = `r${time}${variant}`;
  const shelf = trophies.map((x) => ITEMS[x]).filter(Boolean).slice(0, 4);
  return (
    <div data-testid={testid} data-time={time} style={{ position: "relative", height, borderRadius: 22, overflow: "hidden", background: night ? "#18233F" : "#EAF4FF" }}>
      {art ? <img src={PET_BASE + art} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : (
        <svg aria-hidden="true" viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.wall[0]} /><stop offset="1" stopColor={t.wall[1]} /></linearGradient>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.sky[0]} /><stop offset="1" stopColor={t.sky[1]} /></linearGradient>
            <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.floor[0]} /><stop offset="1" stopColor={t.floor[1]} /></linearGradient>
            <radialGradient id={`${id}r`} cx="0.5" cy="0.45" r="0.6"><stop offset="0" stopColor={a.rug[0]} /><stop offset="1" stopColor={a.rug[1]} /></radialGradient>
            <radialGradient id={`${id}l`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFE7A3" stopOpacity="0.55" /><stop offset="1" stopColor="#FFE7A3" stopOpacity="0" /></radialGradient>
          </defs>
          {/* tường + chân tường */}
          <rect width="390" height="260" fill={`url(#${id}w)`} />
          <rect y="176" width="390" height="8" fill={night ? "#23304F" : "#FFFFFF"} opacity="0.7" />
          {/* cửa sổ */}
          <g transform="translate(30 26) scale(0.86)">
            <rect width="132" height="112" rx="14" fill="#FFFFFF" opacity={night ? 0.18 : 1} />
            <rect x="8" y="8" width="116" height="96" rx="9" fill={`url(#${id}s)`} />
            {time === "sang" && <><circle cx="96" cy="32" r="14" fill="#FFE27A" /><g fill="#FFFFFF" opacity="0.9"><ellipse cx="44" cy="68" rx="20" ry="9" /><ellipse cx="58" cy="62" rx="14" ry="10" /></g></>}
            {time === "chieu" && <><circle cx="66" cy="86" r="18" fill="#FFF1C1" opacity="0.9" /><rect x="8" y="84" width="116" height="20" fill="#FF8A5B" opacity="0.35" /></>}
            {night && <><path d="M98 22a13 13 0 1 0 8 23 15 15 0 0 1-8-23z" fill="#FFF3C4" /><g fill="#FFFFFF">{[[24, 26], [46, 48], [70, 20], [30, 78], [84, 70], [108, 86]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 1.1} opacity="0.85" />)}</g></>}
            <rect x="64" y="8" width="4" height="96" fill="#FFFFFF" opacity={night ? 0.25 : 0.9} />
            <rect x="8" y="54" width="116" height="4" fill="#FFFFFF" opacity={night ? 0.25 : 0.9} />
            {/* rèm */}
            <path d="M-6 -6h30c-4 40 6 80 -6 124h-24z" fill={a.curtain} opacity={night ? 0.55 : 0.85} />
            <path d="M138 -6h-30c4 40 -6 80 6 124h24z" fill={a.curtain} opacity={night ? 0.55 : 0.85} />
            <rect x="-10" y="-12" width="152" height="7" rx="3.5" fill={night ? "#53627F" : "#CBD5E1"} />
          </g>
          {/* kệ đồ thành tích */}
          <g transform="translate(262 30)">
            <rect x="0" y="44" width="118" height="9" rx="4" fill={night ? "#7A5C45" : "#C08A5B"} />
            <rect x="10" y="53" width="7" height="12" rx="2" fill={night ? "#5E4636" : "#A8764A"} />
            <rect x="101" y="53" width="7" height="12" rx="2" fill={night ? "#5E4636" : "#A8764A"} />
            {shelf.length === 0 && <text x="59" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill={night ? "#9FB0C8" : "#94A3B8"}>Kệ thành tích</text>}
          </g>
          {/* sàn gỗ */}
          <rect y="184" width="390" height="76" fill={`url(#${id}f)`} />
          {[204, 228, 252].map((y) => <rect key={y} y={y} width="390" height="1.5" fill={t.line} opacity="0.45" />)}
          {[[60, 184, 204], [190, 204, 228], [300, 184, 204], [110, 228, 252], [250, 228, 252]].map(([x, y1, y2], i) => <rect key={i} x={x} y={y1} width="1.5" height={y2 - y1} fill={t.line} opacity="0.4" />)}
          {/* chậu cây góc trái */}
          <g transform="translate(10 118)">
            <path d="M22 52c-14-18-20-38-8-50 6 16 10 30 8 50z" fill="#22C55E" /><path d="M24 54c4-22 14-38 30-42-4 18-14 32-30 42z" fill="#16A34A" />
            <path d="M22 56c-8-10-20-14-30-12 6 10 16 14 30 12z" fill="#4ADE80" />
            <path d="M6 56h36l-5 32H11z" fill={night ? "#B45309" : "#F59E0B"} /><rect x="3" y="52" width="42" height="8" rx="4" fill={night ? "#92400E" : "#D97706"} />
          </g>
          {/* thảm tập + tạ góc phải */}
          <g transform="translate(298 206)">
            <rect width="78" height="20" rx="10" fill={a.mat} opacity="0.85" transform="skewX(-18)" />
            <g transform="translate(26 -8)"><rect x="6" y="4" width="22" height="4" rx="2" fill="#64748B" /><rect width="8" height="12" rx="3" fill="#334155" /><rect x="26" width="8" height="12" rx="3" fill="#334155" /></g>
          </g>
          {/* thảm tròn dưới chân Pi */}
          <ellipse cx="195" cy="228" rx="112" ry="22" fill={`url(#${id}r)`} opacity={night ? 0.6 : 0.9} />
          {/* đèn bàn buổi tối */}
          {night && <g transform="translate(200 110)"><circle cx="0" cy="0" r="80" fill={`url(#${id}l)`} /></g>}
          <rect width="390" height="260" fill="#0B1430" opacity={t.shade} />
        </svg>
      )}
      {/* đồ thành tích thật trên kệ */}
      {!art && shelf.length > 0 && (
        <span style={{ position: "absolute", right: "2.6%", top: "16.5%", width: "30%", height: "14%", display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
          {shelf.map((it) => <img key={it.id} src={PET_BASE + it.file} alt={it.name} title={it.name} style={{ height: "100%", maxWidth: "26%", objectFit: "contain", filter: "drop-shadow(0 2px 3px rgba(15,23,42,0.25))" }} />)}
        </span>
      )}
      {children}
    </div>
  );
}
