// 24/10 — Phát tiếng Pi + đo biên độ (trình duyệt). Không gọi AI: chỉ phát file mp3 thu sẵn (public/pi/voice/<nam|nu>/<id>.mp3,
// danh mục src/pi/voice.json). Câu động / chat tự do chưa có tiếng (chờ API giọng — BACKLOG), chỉ khẩu hình theo chữ.
import voice from "./voice.json";

export const VOICE_BASE = "/pi/voice/";
/** id câu thoại có file thu sẵn cho bản này → URL, không có → null */
export const voiceUrl = (id, g) => (id && voice.ids.includes(id) ? `${VOICE_BASE}${g === "nu" ? "nu" : "nam"}/${id}.mp3` : null);

let ctx = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
};
const cache = new Map();

/** tải + giải mã mp3 → { buffer, rms (mỗi 10 ms), hop } */
export async function loadVoice(url) {
  if (cache.has(url)) return cache.get(url);
  const c = getCtx(); if (!c) throw new Error("no audio");
  const p = fetch(url).then((r) => { if (!r.ok) throw new Error("voice " + r.status); return r.arrayBuffer(); })
    .then((ab) => new Promise((ok, bad) => c.decodeAudioData(ab, ok, bad)))
    .then((buffer) => {
      const ch = buffer.getChannelData(0), hop = 10, n = Math.round((buffer.sampleRate * hop) / 1000), rms = [];
      for (let i = 0; i < ch.length; i += n) { let s = 0; const e = Math.min(ch.length, i + n); for (let j = i; j < e; j++) s += ch[j] * ch[j]; rms.push(Math.sqrt(s / Math.max(1, e - i))); }
      return { buffer, rms, hop };
    });
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}

/** phát buffer → { start (performance.now() lúc bắt đầu), done: Promise, stop(), level() biên độ 0–1 lúc này } */
export function playVoice(buffer) {
  const c = getCtx();
  if (c.state === "suspended") c.resume().catch(() => {});
  const src = c.createBufferSource(); src.buffer = buffer;
  const an = c.createAnalyser(); an.fftSize = 512;
  src.connect(an); an.connect(c.destination);
  const data = new Float32Array(an.fftSize);
  const done = new Promise((ok) => { src.onended = ok; });
  src.start();
  return {
    start: performance.now(), done,
    stop: () => { try { src.stop(); } catch { /* đã dừng */ } },
    level: () => { an.getFloatTimeDomainData(data); let s = 0; for (const x of data) s += x * x; return Math.min(1, Math.sqrt(s / data.length) * 4); },
  };
}
