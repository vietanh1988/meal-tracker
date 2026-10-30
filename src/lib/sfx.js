// 31/10 (chủ dự án: "bấm tích bữa, thay đồ phải có rung hoặc tiếng, kiểu ting ting"): tiếng ngắn + rung nhẹ cho thao tác chính.
// Âm thanh: public/sfx/*.mp3 (scripts/sfx/make.py tự tổng hợp). Phát bằng thẻ <audio> (iPhone gạt im lặng vẫn kêu, như giọng Pi);
// lần chạm đầu tiên "mở khoá" sẵn mọi tiếng (iPhone chỉ cho phát tiếng sau khi người dùng chạm) → tiếng tới sau (được Hạt, lên cấp) vẫn phát.
// Rung: Android = navigator.vibrate; iPhone (iOS 17.4+) không có vibrate → bấm ngầm 1 công tắc <input switch> (Safari rung nhẹ), chỉ khi đang trong lúc chạm.
// Tắt / bật: Tôi › Âm thanh & rung (localStorage fp_sfx = "0" là tắt). Mặc định bật.
export const SFX = ["ting", "bloop", "coin", "sparkle", "levelup", "boing", "pop"];
const KEY = "fp_sfx";
const VOL = { ting: 0.7, bloop: 0.7, coin: 0.6, sparkle: 0.55, levelup: 0.6, boing: 0.6, pop: 0.5 };
// kiểu rung theo việc (ms): nhẹ / thành công / ăn mừng
const BUZZ = { ting: [12, 50, 14], bloop: 10, coin: [10, 40, 10], sparkle: [8, 30, 8, 30, 8], levelup: [20, 60, 20, 60, 40], boing: 10, pop: 8 };

let on = true;
try { on = typeof localStorage === "undefined" || localStorage.getItem(KEY) !== "0"; } catch (e) { on = true; }
export const sfxOn = () => on;
export function setSfx(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* trình duyệt chặn lưu: chỉ nhớ trong phiên */ }
}

const pool = {};
const audio = (name) => {
  if (typeof Audio === "undefined") return null;
  if (!pool[name]) { const a = new Audio(`/sfx/${name}.mp3`); a.preload = "auto"; a.playsInline = true; pool[name] = a; }
  return pool[name];
};
let unlocked = false;
/** gọi trong lần chạm đầu (main.jsx gắn sẵn): phát im lặng mọi tiếng 1 lần để sau này phát được không cần chạm */
export function unlockSfx() {
  if (unlocked || !on) return;
  unlocked = true;
  for (const n of SFX) {
    const a = audio(n); if (!a) continue;
    a.muted = true;
    const p = a.play(); if (p?.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; unlocked = false; });
  }
}

let sw = null;
const iosTap = () => {
  if (typeof document === "undefined") return;
  if (!sw) {
    sw = document.createElement("label");
    sw.setAttribute("aria-hidden", "true");
    sw.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1;
    sw.appendChild(i); document.body.appendChild(sw);
  }
  sw.click();
};
/** rung nhẹ theo kiểu việc */
export function buzz(name = "pop") {
  if (!on || typeof navigator === "undefined") return;
  try {
    if (navigator.vibrate) navigator.vibrate(BUZZ[name] ?? 10);
    else if (/iP(hone|ad|od)/.test(navigator.userAgent || "")) iosTap();
  } catch (e) { /* máy không hỗ trợ rung: bỏ qua */ }
}
/** phát 1 tiếng (+ rung). name ∈ SFX */
export function sfx(name, { vibrate = true } = {}) {
  if (!on || !SFX.includes(name)) return;
  if (vibrate) buzz(name);
  const a = audio(name); if (!a) return;
  try {
    a.volume = VOL[name] ?? 0.6;
    a.currentTime = 0;
    const p = a.play(); if (p?.catch) p.catch(() => {});
  } catch (e) { /* chưa được phép phát tiếng: bỏ qua */ }
}
