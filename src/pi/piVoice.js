// 24/10 — Phát tiếng Pi + đo biên độ (trình duyệt). Không gọi AI: chỉ phát file mp3 thu sẵn (public/pi/voice/<nam|nu>/<id>.mp3,
// danh mục src/pi/voice.json). Câu động / chat tự do chưa có tiếng (chờ API giọng — BACKLOG), chỉ khẩu hình theo chữ.
// 24/10 (chủ dự án: "Pi không nói được" trên iPhone đang gạt im lặng): phát bằng thẻ <audio> (kênh nhạc — vẫn kêu khi gạt im lặng,
// Web Audio thì bị tắt tiếng) và GỌI play() NGAY trong lúc khách bấm (iPhone chặn phát tiếng không do bấm). Biên độ để khớp miệng
// tính riêng bằng OfflineAudioContext (không phát ra loa).
import voice from "./voice.json";
import man from "./manifest.json";

export const VOICE_BASE = "/pi/voice/";
export const VOICE_IDS = voice.ids;
/** id câu thoại có file thu sẵn cho bản này → URL, không có → null */
export const voiceUrl = (id, g) => (id && voice.ids.includes(id) ? `${VOICE_BASE}${g === "nu" ? "nu" : "nam"}/${id}.mp3${man.ver ? `?v=${man.ver}` : ""}` : null);

/** gọi NGAY trong hàm xử lý bấm: tạo thẻ audio và phát luôn → trả thẻ (đưa vào speech.el); lỗi / không có url → null */
export function playNow(url) {
  if (!url || typeof Audio === "undefined") return null;
  try {
    const el = new Audio(url);
    el.preload = "auto"; el.playsInline = true;
    const p = el.play();
    if (p && p.catch) p.catch(() => { el.dataset.blocked = "1"; });
    return el;
  } catch { return null; }
}

const cache = new Map();
/** biên độ mỗi 10 ms của file (để đặt mốc âm tiết) — không phát ra loa */
export function loadRms(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => { if (!r.ok) throw new Error("voice " + r.status); return r.arrayBuffer(); })
    .then((ab) => {
      const OAC = typeof window !== "undefined" && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!OAC) throw new Error("no audio");
      const ctx = new OAC(1, 44100, 44100);
      return new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad));
    })
    .then((buffer) => {
      const ch = buffer.getChannelData(0), hop = 10, n = Math.round((buffer.sampleRate * hop) / 1000), rms = [];
      for (let i = 0; i < ch.length; i += n) { let s = 0; const e = Math.min(ch.length, i + n); for (let j = i; j < e; j++) s += ch[j] * ch[j]; rms.push(Math.sqrt(s / Math.max(1, e - i))); }
      return { rms, hop, dur: buffer.duration * 1000 };
    });
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}
