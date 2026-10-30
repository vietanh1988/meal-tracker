// 30/10 — CHẠY THỬ giọng Pi (chủ dự án cho phép chạy thử trả phí): đọc vài câu bằng Gemini TTS / OpenAI TTS (khoá ở app_settings,
// như ai-proxy), lưu file vào kho public-assets/pi-voice-test/<nhà>-<giọng>/<id>.<đuôi> để chủ dự án nghe so sánh.
// Không gọi từ app. Gọi bằng SQL (net.http_post) kèm khoá push_secret trong Vault → không cần đăng nhập. Thử xong sẽ xoá hàm.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STYLE = "Giọng của Pi — một thú cưng nhỏ dễ thương trong app giảm cân: ấm áp, vui tươi, thân thiện như người bạn nhỏ, nói tiếng Việt tự nhiên, rõ dấu, tốc độ vừa phải.";

async function setting(key: string) {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).single();
  return (data?.value as string) || "";
}

function wav(pcm: Uint8Array, rate = 24000) {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, s: string) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer)); out.set(pcm, 44); return out;
}

async function gemini(text: string, voice: string, key: string) {
  let last = "";
  for (const model of ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash-tts"]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE}\nĐọc đúng câu sau, không thêm bớt chữ:\n${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    const d = await r.json();
    const b64 = d?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
    if (b64) return { bytes: wav(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))), ext: "wav", type: "audio/wav", model, tok: d.usageMetadata };
    last = `${model}: ${d?.error?.message || r.status}`;
  }
  throw new Error(last);
}

async function openai(text: string, voice: string, key: string) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, instructions: STYLE, response_format: "mp3" }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { bytes: new Uint8Array(await r.arrayBuffer()), ext: "mp3", type: "audio/mpeg", model: "gpt-4o-mini-tts", tok: null };
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (!body.secret || body.secret !== Deno.env.get("PUSH_SECRET")) return new Response("no", { status: 401 });
  const { provider, voice, items } = body as { provider: "gemini" | "gpt"; voice: string; items: { id: string; text: string }[] };
  const key = await setting(provider === "gemini" ? "gemini_key" : "gpt_key");
  const out: any[] = [];
  for (const it of (items || []).slice(0, 6)) {
    try {
      const a = provider === "gemini" ? await gemini(it.text, voice, key) : await openai(it.text, voice, key);
      const path = `pi-voice-test/${provider}-${voice}/${it.id}.${a.ext}`;
      const up = await admin.storage.from("public-assets").upload(path, a.bytes, { contentType: a.type, upsert: true });
      out.push({ id: it.id, path, bytes: a.bytes.length, model: a.model, tok: a.tok, err: up.error?.message });
    } catch (e) { out.push({ id: it.id, err: String((e as Error).message || e).slice(0, 300) }); }
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
