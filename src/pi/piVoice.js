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

// ---- 24/10 (chủ dự án: "làm trước thử coi") — câu không có file ghi âm (AI trả lời, câu có tên / số): đọc bằng giọng tiếng Việt
// có sẵn trên máy (Web Speech API, iPhone có giọng "Linh"). Miễn phí, không gọi API; giọng máy, chưa phải Mẫu D (chờ ElevenLabs — BACKLOG).
const synth = () => (typeof window !== "undefined" && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined" ? window.speechSynthesis : null);
let viVoice;
function pickVi() {
  const s = synth(); if (!s) return null;
  const vs = s.getVoices().filter((v) => /^vi/i.test(v.lang));
  return vs.find((v) => /linh/i.test(v.name)) || vs.find((v) => v.localService) || vs[0] || null;
}
if (synth()) { viVoice = pickVi(); synth().addEventListener?.("voiceschanged", () => { viVoice = pickVi(); }); }
/** máy có giọng tiếng Việt? (chưa tải xong danh sách giọng thì coi là có, iPhone tải chậm) */
export const ttsReady = () => !!synth() && (viVoice !== null || synth().getVoices().length === 0);
/** gọi NGAY trong lúc khách bấm (Gửi / chạm câu): iPhone chỉ cho đọc khi lần đầu được mở bằng thao tác bấm */
export function primeTTS() {
  const s = synth(); if (!s) return;
  try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; u.lang = "vi-VN"; s.speak(u); } catch { /* */ }
}
// giọng Pi: cao + hơi nhanh cho dễ thương (nữ cao hơn nam); theo nhãn giọng chậm / nhanh
const TTS_RATE = { diu_dang: 0.92, an_ui: 0.88, hao_hung: 1.1 };
/** đọc text → { started: Promise, ended: Promise, onWord(fn(charIndex)), stop() }; không có giọng → null */
export function speakTTS(text, { g = "nam", giong, maxMs = 20000 } = {}) {
  const s = synth(); if (!s || !String(text || "").trim()) return null;
  viVoice = viVoice || pickVi();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = "vi-VN"; if (viVoice) u.voice = viVoice;
  u.rate = TTS_RATE[giong] || 1.02; u.pitch = g === "nu" ? 1.6 : 1.4; u.volume = 1;
  let onWord = null, okS, okE;
  const started = new Promise((r) => { okS = r; }), ended = new Promise((r) => { okE = r; });
  u.onstart = () => okS(performance.now());
  u.onend = () => okE("end"); u.onerror = () => { okS(performance.now()); okE("error"); }; // lỗi (máy không có giọng) → PiPet quay về khẩu hình theo chữ
  u.onboundary = (e) => { if (onWord && (e.name === "word" || e.name == null)) onWord(e.charIndex); };
  try { s.cancel(); s.speak(u); } catch { okS(performance.now()); okE("error"); }
  setTimeout(() => okS(performance.now()), 1500); // máy không báo onstart → vẫn chạy khẩu hình
  setTimeout(() => okE(), maxMs); // máy không báo onend (một số trình duyệt) → vẫn dừng
  return { started, ended, onWord: (fn) => { onWord = fn; }, stop: () => { try { s.cancel(); } catch { /* */ } okE(); } };
}
