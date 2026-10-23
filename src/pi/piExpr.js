// 23/10 — Biểu cảm tự động của Pi (hàm thuần, có test tests/pi-expr.test.mjs).
// 2 trạng thái: base (khách chọn ở Tủ đồ, mặc định "vui"; tâm trạng ngủ / hỏi… của app đè lên) và reaction (tạm thời, có hạn).
// Mặt hiển thị = reaction nếu còn hạn, không thì base (idle có thể đổi base thành "suynghi" / "ngu").

export const FACE_LIST = ["vui", "cuoilon", "nhaymat", "haohung", "ngacnhien", "yeu", "suynghi", "buon", "ngu"];
export const IDLE_THINK_MS = 30_000;
export const IDLE_SLEEP_MS = 120_000;
export const BLINK_FACES = ["vui", "haohung"];
export const TAP_FACES = ["cuoilon", "nhaymat", "haohung"];

/** đủ cả bộ cùng sự kiện: áo + đội đầu + giày cùng ev */
export function fullSet(eq) {
  const a = eq?.ao, d = eq?.dau, g = eq?.giay;
  return !!(a && d && g && a.ev === d.ev && d.ev === g.ev);
}

/** đổi đồ: before / after = { slot: item } (đã lọc đúng bản Pi). → { steps: [{ face, ms }], hop } hoặc null.
 *  Mặc món mới: haohung 0,4 s → cuoilon 1 s (Halloween: ngacnhien thay cuoilon) + nhún. Mặc đủ bộ: yeu 1,5 s (thay bước cười).
 *  Tháo đồ (không mặc thêm gì): ngacnhien 0,6 s. */
export function equipReaction(before = {}, after = {}) {
  const added = Object.keys(after).filter((s) => s !== "phong" && after[s] && before[s]?.id !== after[s].id);
  const removed = Object.keys(before).filter((s) => s !== "phong" && before[s] && !after[s]);
  if (added.length) {
    const it = after[added[0]];
    if (fullSet(after) && !(fullSet(before) && before.ao?.ev === after.ao?.ev)) return { steps: [{ face: "haohung", ms: 400 }, { face: "yeu", ms: 1500 }], hop: true };
    return { steps: [{ face: "haohung", ms: 400 }, { face: it.ev === "halloween" ? "ngacnhien" : "cuoilon", ms: 1000 }], hop: true };
  }
  if (removed.length) return { steps: [{ face: "ngacnhien", ms: 600 }], hop: false };
  return null;
}

/** chạm vào Pi: đang ngủ (idle) → ngacnhien 0,5 s; không thì ngẫu nhiên cuoilon | nhaymat | haohung 1 s */
export function tapReaction(currentFace, rnd = Math.random()) {
  if (currentFace === "ngu") return { steps: [{ face: "ngacnhien", ms: 500 }], hop: true };
  return { steps: [{ face: TAP_FACES[Math.min(TAP_FACES.length - 1, Math.floor(rnd * TAP_FACES.length))], ms: 1000 }], hop: true };
}

/** base sau khi tính idle: ≥ 2 phút "ngu", ≥ 30 s "suynghi"; buổi tối (phòng tối, sau 22h) idle là ngủ luôn */
export function idleBase(base, idleMs, { night = false } = {}) {
  if (base === "ngu") return "ngu";
  if (idleMs >= IDLE_SLEEP_MS) return "ngu";
  if (idleMs >= IDLE_THINK_MS) return night ? "ngu" : "suynghi";
  return base;
}

/** đêm muộn theo giờ VN: sau 22h (tới 5h sáng, cùng buổi "tối" của phòng) */
export const lateNight = (hour) => hour >= 22 || hour < 5;

/** mặt hiển thị: reaction còn hạn thì lấy reaction */
export function shownFace({ base, reaction, now }) {
  return reaction && reaction.until > now ? reaction.face : base;
}

export const canBlink = (face) => BLINK_FACES.includes(face);

// ---- pi.react(expression, ms): nơi khác (chat, gym, mục tiêu) gọi để Pi phản ứng — mọi Pi đang hiện đều nhận ----
const subs = new Set();
export const pi = {
  react(expression, ms = 1200) {
    if (!FACE_LIST.includes(expression)) return false;
    for (const fn of subs) fn({ steps: [{ face: expression, ms: Math.max(100, Math.min(10_000, Number(ms) || 1200)) }], hop: expression === "yeu" || expression === "haohung" });
    return true;
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};
if (typeof window !== "undefined") window.pi = pi;
