#!/usr/bin/env python3
"""31/10 — bộ âm thanh ngắn của app (tự tổng hợp bằng máy, không dính bản quyền): python3 scripts/sfx/make.py
→ public/sfx/<tên>.mp3 (mono 44,1 kHz). Dùng ở src/lib/sfx.js.
  ting     bấm Đã ăn (chuông 2 tiếng "ting ting")      bloop  chạm cốc nước (giọt nước)
  coin     được Hạt / mua đồ (leng keng)              sparkle mặc đồ (lấp lánh)
  levelup  lên cấp (kèn nhỏ đi lên)                    boing  chạm vào Pi (lò xo)
  pop      thêm món vào bữa (bụp nhẹ)
"""
import os, subprocess, tempfile, wave
import numpy as np
SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public", "sfx")
t = lambda d: np.arange(int(SR * d)) / SR
def env(n, a=0.004, d=0.3):  # bật nhanh, tắt dần theo hàm mũ
    x = np.arange(n) / SR; e = np.exp(-x / d); k = int(SR * a); e[:k] *= np.linspace(0, 1, k); return e
def bell(f, d=0.5, dec=0.18):
    x = t(d); s = np.sin(2*np.pi*f*x) + 0.35*np.sin(2*np.pi*2.01*f*x) + 0.12*np.sin(2*np.pi*3.02*f*x)
    return s * env(len(x), d=dec)
def mix(parts, total):
    out = np.zeros(int(SR * total))
    for at, s in parts:
        i = int(SR * at); out[i:i+len(s)] += s[:len(out)-i]
    return out
def tone(f0, f1, d, wave_="sin", dec=0.12):
    x = t(d); f = np.linspace(f0, f1, len(x)); ph = 2*np.pi*np.cumsum(f)/SR
    s = np.sin(ph) if wave_ == "sin" else (2/np.pi)*np.arcsin(np.sin(ph))
    return s * env(len(x), d=dec)
S = {
    "ting":    mix([(0, bell(1568, 0.45, 0.14)), (0.09, bell(2093, 0.5, 0.18))], 0.6),
    "bloop":   mix([(0, tone(380, 1050, 0.16, dec=0.07)), (0.05, 0.4*tone(900, 1600, 0.08, dec=0.03))], 0.22),
    "coin":    mix([(0, 0.8*tone(988, 988, 0.08, "tri", 0.05)), (0.07, tone(1319, 1319, 0.35, "tri", 0.12))], 0.45),
    "sparkle": mix([(i*0.045, 0.6*bell(f, 0.35, 0.09)) for i, f in enumerate([1568, 2093, 2637, 3136, 3951])], 0.6),
    "levelup": mix([(i*0.09, tone(f, f, 0.3 if i < 3 else 0.6, "tri", 0.1 if i < 3 else 0.3)) for i, f in enumerate([523, 659, 784, 1047])], 0.95),
    "boing":   (lambda x: np.sin(2*np.pi*np.cumsum(220 + 180*np.sin(2*np.pi*14*x)*np.exp(-x/0.12) + 260*x)/SR) * env(len(x), d=0.11))(t(0.32)),
    "pop":     mix([(0, tone(700, 260, 0.07, dec=0.025))], 0.1),
}
os.makedirs(OUT, exist_ok=True)
for name, s in S.items():
    s = s / (np.abs(s).max() + 1e-9) * 0.55  # đỉnh −5 dB, nhẹ tai
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f: p = f.name
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((s * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-ac", "1", "-ar", "44100", "-b:a", "64k", os.path.join(OUT, f"{name}.mp3")], check=True)
    os.unlink(p)
print("xong:", ", ".join(f"{k}.mp3" for k in S))
