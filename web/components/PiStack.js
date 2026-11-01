// 01/11: hình Pi chồng lớp đúng như app (dùng chung cho trang Pi, bảng xếp hạng). Ảnh lớp lấy từ app (app.fipilotai.com/pi/…).
import man from "@/lib/app/piManifest.json";
import pink from "@/lib/app/piPink.json";
import { piLayers, tfCss } from "@/lib/app/piLayers.js";

export const PI_BASE = "https://app.fipilotai.com/pi/";
export function PiStack({ p, size = 120, face, label, base = PI_BASE, lazy = true, className = "pi-stack", style }) {
  const v = man.ver ? `?v=${man.ver}` : "", pv = pink.ver ? `?v=${pink.ver}` : v;
  const f = face || (p.face && p.face !== "auto" && man.faces.includes(p.face) ? p.face : "cuoilon");
  const layers = piLayers({ man, gender: p.variant, equipped: p.equipped || {}, face: f, tf: p.place || {}, color: p.color, pink });
  return (
    <span className={className} style={{ width: size, height: size, ...style }} role="img" aria-label={label || `Pi ${p.name || ""}`.trim()}>
      {layers.map((L) => <img key={L.key} src={base + L.src + (L.src.startsWith("hong/") ? pv : v)} alt="" width={size} height={size} loading={lazy ? "lazy" : "eager"} decoding="async" style={tfCss(L.tf, L.c, size) || undefined} />)}
    </span>
  );
}
