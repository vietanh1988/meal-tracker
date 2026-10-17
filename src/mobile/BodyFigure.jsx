// Hình hướng dẫn đo (bản vẽ 123d): ảnh 3D nam / nữ (public/body/*.webp, khung 600×1200) + 6 vòng thước SVG chồng lên.
// Vòng: nét liền phía trước người, nét đứt mờ phía sau. active = ô đang nhập → vòng đó đậm, vòng khác mờ.
import { FIELDS } from "../lib/bodyMeasure";

// Toạ độ trên khung 600×1200: k → [y, x trái, x phải] (đo lại từ ảnh mới 18/10)
const BANDS = {
  male: { chest: [370, 186, 412], arm: [440, 408, 468], waist: [470, 216, 384], belly: [510, 212, 389], hip: [640, 178, 424], thigh: [770, 189, 279] },
  female: { chest: [395, 205, 395], arm: [460, 384, 427], waist: [490, 233, 368], belly: [530, 222, 378], hip: [650, 182, 418], thigh: [780, 200, 285] },
};
const LEFT = new Set(["chest", "waist", "hip", "thigh"]);

export function BodyFigure({ gender, active, width = 140, labels = true }) {
  const g = gender === "female" ? "female" : "male";
  return (
    <svg data-testid="body-figure" data-gender={g} width={width} height={width * 2} viewBox="0 0 600 1200" role="img" aria-label={`Hình hướng dẫn đo (${g === "female" ? "nữ" : "nam"})`} style={{ display: "block", flexShrink: 0 }}>
      <image href={`/body/${g}.webp`} x="0" y="0" width="600" height="1200" />
      {FIELDS.map((f) => {
        const [y, x1, x2] = BANDS[g][f.k];
        const cx = (x1 + x2) / 2, rx = (x2 - x1) / 2 + 6, ry = Math.max(8, rx * 0.15);
        const on = !active || active === f.k, sw = active === f.k ? 16 : 10;
        const L = LEFT.has(f.k), lx = L ? 40 : 560, ex = L ? cx - rx : cx + rx;
        return (
          <g key={f.k} data-band={f.k} opacity={on ? 1 : 0.28} style={{ transition: "opacity .15s" }}>
            <path d={`M${cx - rx} ${y} A${rx} ${ry} 0 0 0 ${cx + rx} ${y}`} fill="none" stroke={f.color} strokeWidth={sw} strokeLinecap="round" />
            <path d={`M${cx - rx} ${y} A${rx} ${ry} 0 0 1 ${cx + rx} ${y}`} fill="none" stroke={f.color} strokeWidth={sw * 0.6} strokeOpacity=".45" strokeDasharray="14 10" />
            {labels && <>
              <line x1={ex} y1={y} x2={lx + (L ? 34 : -34)} y2={y} stroke={f.color} strokeWidth="5" strokeDasharray="8 8" />
              <circle cx={lx} cy={y} r="34" fill={f.color} stroke="#FFFFFF" strokeWidth="6" />
              <text x={lx} y={y + 15} textAnchor="middle" fontSize="44" fontWeight="800" fill="#FFFFFF" fontFamily="Inter, sans-serif">{f.n}</text>
            </>}
          </g>
        );
      })}
    </svg>
  );
}
