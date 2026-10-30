// 30/10 (Khoe Pi): danh sách lớp ảnh Pi dưới → trên, cùng luật với PiPet.jsx (thân cụt tay khi món cầm tay cần, đầu gốc đè lên áo,
// mũ trùm đầu bỏ lá, không có lớp miệng khi đứng yên). Hàm thuần, không import gì → web (fipilotai.com/pi/<biệt danh>) chép nguyên file dùng chung.
// man = src/pi/manifest.json · equipped = { ô: mã món } · tf = { mã món: { x, y, s, w, h, r, fx } } (Quản trị › Chỉnh vị trí) · src tương đối với /pi/
// 30/10 Pi hồng: pink = src/pi/pink.json (scripts/pi/pink.py) · color = "hong" | "xanh" (Pi nữ mặc định hồng, Pi nam luôn xanh)
/** Pi này có dùng bộ ảnh hồng không */
export const isPink = (gender, color) => gender === "nu" && color !== "xanh";
export function piLayers({ man, gender, equipped = {}, face = "vui", tf = {}, color = null, pink = null }) {
  const g = gender === "nu" ? "nu" : "nam";
  const H = pink && isPink(g, color) ? "hong/" : "";
  const pk = new Set(H ? pink.items || [] : []);
  const byId = {};
  for (const it of man.items || []) byId[it.id] = it;
  const eq = {};
  for (const [slot, id] of Object.entries(equipped || {})) {
    const it = byId[id];
    if (it && it.slot === slot && it.g === g) eq[slot] = it;
  }
  const arm = (eq.tay && eq.tay.arm) || (eq.gang && eq.gang.arm) || null;
  const f = (man.faces || []).includes(face) ? face : "vui";
  const order = eq.dau && eq.dau.cover ? man.order.filter((L) => L !== "la") : man.order;
  const out = [];
  for (const L of order) {
    if (L === "than") out.push({ key: L, src: `${H}body/pi_than${arm ? `_khong_tay_${arm}` : ""}.webp` });
    else if (L === "dau_pi") { if (eq.ao) out.push({ key: L, src: `${H}body/pi_dau.webp` }); }
    else if (L === "mat_pi") out.push({ key: L, src: `${H}faces/${g}/${f}.webp` });
    else if (L === "la") { if (man.leaf) out.push({ key: L, src: `${H}body/pi_la.webp` }); }
    else if (L !== "mieng" && eq[L]) {
      const it = eq[L];
      out.push({ key: L, src: (pk.has(it.id) ? H : "") + it.file, tf: (tf && tf[it.id]) || it.tf0 || null, c: it.c || [384, 384] });
    }
  }
  return out;
}

/** CSS transform của 1 lớp (khung S px) — y hệt tfStyle trong PiPet.jsx */
export function tfCss(tf, c = [384, 384], S = 768, CV = 768) {
  if (!tf) return null;
  const k = S / CV, s = Number(tf.s) || 1, w = Number(tf.w) || 1, h = Number(tf.h) || 1;
  return {
    transform: `translate(${((Number(tf.x) || 0) * k).toFixed(2)}px, ${((Number(tf.y) || 0) * k).toFixed(2)}px) rotate(${Number(tf.r) || 0}deg) scale(${s * w * (tf.fx ? -1 : 1)}, ${s * h})`,
    transformOrigin: `${(c[0] / CV) * 100}% ${(c[1] / CV) * 100}%`,
  };
}
