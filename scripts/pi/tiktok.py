#!/usr/bin/env python3
"""31/10 (chủ dự án: "video TikTok Halloween, Pi tự nói, nhắc việc, bảng xếp hạng — hình ảnh chức năng app thật và Pi thật").
Dọc 1080×1920, 30 khung/giây. Điện thoại hiện MÀN THẬT do E2E chụp khi bấm thật (tests/e2e/mobile.zzz-tiktok.spec.mjs → nhánh
shots/<nhánh>/shots/tiktok); Pi góc dưới / Pi lớn = Pi ghép từ ảnh app (scripts/pi/video.py) mặc đúng đồ Halloween trong màn.
Âm thanh: giọng Pi thu sẵn (public/pi/voice/nam) + nhạc Halloween tự sinh + tiếng hiệu ứng tự sinh. Không gọi AI.
    python3 scripts/pi/tiktok.py <thư mục shots/tiktok> <thư mục ra> [giây …]   (có giây = chỉ xuất khung để xem)
"""
import json, math, os, random, shutil, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv; sys.argv = [sys.argv[0], "/tmp/x"]
import video as V
sys.argv = _a

SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
F = lambda w, s: ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", s)
PURPLE, ORANGE, NAVY = (76, 29, 149), (249, 115, 22), (15, 23, 42)
def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def back(t): t = max(0.0, min(1.0, t)); c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2

# ---------- điện thoại: màn 390×844 điểm CSS ----------
SW = 600; KS = SW / 390; SH = round(844 * KS)
PAD = 14; PW, PH = SW + 2 * PAD, SH + 2 * PAD
PX, PY = (W - PW) // 2, 468
SX, SY = PX + PAD, PY + PAD
_shot = {}
def shot(n):
    if n not in _shot:
        p = os.path.join(SRC, n + ".png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGB").resize((SW, SH), Image.LANCZOS); bx = json.load(open(os.path.join(SRC, n + ".json")))
        else:
            im = Image.new("RGB", (SW, SH), (226, 232, 240)); ImageDraw.Draw(im).text((SW / 2, SH / 2), n, font=F("Bold", 40), fill=(100, 116, 139), anchor="mm"); bx = {}
        _shot[n] = (im, bx)
    return _shot[n]
def at(n, tid, dx=0.5, dy=0.5):
    b = shot(n)[1].get(tid)
    if not b: return (SX + SW / 2, SY + SH / 2)
    return (SX + (b["x"] + b["width"] * dx) * KS, SY + (b["y"] + b["height"] * dy) * KS)
_it = os.path.join(SRC, "item.txt")
ITEM = open(_it).read().strip().replace("pet-item-", "") if os.path.exists(_it) else "halloween-nam-pk06"
ITEM_TID = "pet-item-" + ITEM

# ---------- kịch bản ----------
OUTFIT = ["halloween-nam-dau01", "halloween-nam-ao02", "halloween-nam-pk04"]
T_WEAR = 26.0
def outfit(T): return OUTFIT + ([ITEM] if T >= T_WEAR else [])
SCREENS = [(3.0, "t01-home"), (7.4, "t02-truoc-an"), (8.75, "t03-da-an"), (12.6, "t04-nuoc"), (15.0, "t05-nuoc-du"), (16.8, "t06-pi"), (18.45, "t07-pi-noi"),
           (20.6, "t08-pi-viec"), (21.6, "t09-shop"), (23.15, "t10-thu"), (24.95, "t11-da-mua"), (26.15, "t12-pi-mac"), (29.0, "t13-rank")]
TAPS = [(8.6, "t02-truoc-an", "eat-sang"), (13.6, "t04-nuoc", "water-cup-next"), (14.2, "t04-nuoc", "water-cup-next"), (14.8, "t04-nuoc", "water-cup-next"),
        (18.3, "t06-pi", "pet-tap"), (23.0, "t09-shop", ITEM_TID), (24.8, "t10-thu", "pet-buy"), (26.0, "t11-da-mua", "pet-wear")]
TAPXY = [(t, at(n, tid)) for t, n, tid in TAPS]
COINS = [(8.9, at("t02-truoc-an", "eat-sang"), (SX + SW * 0.62, SY + 70 * KS), "+10 Hạt"), (15.1, at("t04-nuoc", "water-cup-next"), at("t05-nuoc-du", "water-count"), "+15 Hạt")]
TITLES = [(0.25, 3.0, ["Halloween rồi!", "Pi biết nói nè"]), (3.0, 7.4, ["Pi tự nhắc việc", "mỗi ngày"]), (7.4, 12.6, ["Ăn xong", "chạm Đã ăn"]),
          (12.6, 16.8, ["Uống đủ nước", "Pi thêm Hạt"]), (16.8, 21.6, ["Chạm Pi là", "Pi nói chuyện"]), (21.6, 29.0, ["Dùng Hạt mua", "đồ Halloween"]),
          (29.0, 33.6, ["Đua top tuần", "cùng bạn bè"]), (33.6, 99, ["Nuôi Pi,", "ăn uống chuẩn"])]
VOICE = [("SANG-08", 0.6, "Dậy rồi! Việc sáng nay đang xếp hàng, xong việc nào là Pi có Hạt việc đó. Lẹ lên!"),
         ("AN-07", 9.0, "Xong! Pi cất bữa này vô nhật ký rồi. Hôm nay vẫn đi đúng đường, khỏi lo."),
         ("IDLE-02", 18.5, "Pi đây! Mình xem việc hôm nay, xem calo, hay đi Cửa hàng? Pi bỏ phiếu Cửa hàng."),
         ("DO-04", 26.4, "Món này Pi chờ lên cấp lâu lắm mới mua được. Giờ là của Pi rồi!"),
         ("IDLE-08", 33.9, "Hôm nay dù bận cỡ nào, làm một việc nhỏ cho cơ thể là đủ thắng rồi.")]
VD = {v: V.dur(V.P + f"voice/nam/{v}.mp3") for v, _, _ in VOICE}
TOTAL = 40.6
SCENES = [(0, 3.0), (3.0, 7.4), (7.4, 12.6), (12.6, 16.8), (16.8, 21.6), (21.6, 29.0), (29.0, 33.6), (33.6, TOTAL)]

def voice_at(T):
    for v, t0, txt in VOICE:
        if t0 <= T < t0 + VD[v]: return v, T - t0, txt
    return None
def mouth(T):
    x = voice_at(T)
    if x and x[1] < VD[x[0]] - 0.15: return V.VISEMES[int(x[1] / 0.11) % len(V.VISEMES)]
    return None

# ---------- vẽ ----------
_c = {}
def bg_room():
    if "bg" not in _c:
        im = V.L("rooms/phong_halloween_toi.webp").convert("RGB")
        s = max(W / im.width, H / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x = (im.width - W) // 2; y = (im.height - H) // 2; im = im.crop((x, y, x + W, y + H)).filter(ImageFilter.GaussianBlur(10))
        im = Image.blend(im, Image.new("RGB", im.size, (40, 16, 78)), 0.38)
        _c["bg"] = im.convert("RGBA")
    return _c["bg"].copy()
RND = random.Random(31)
DOTS = [(RND.uniform(0, W), RND.uniform(0, H), RND.uniform(3, 9), RND.uniform(18, 50), RND.uniform(0, 6.28)) for _ in range(46)]
def particles(bg, T):
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for x, y, r, sp, ph in DOTS:
        yy = (y - T * sp) % H; xx = x + math.sin(T * 0.9 + ph) * 16; a = round(110 + 90 * math.sin(T * 2 + ph))
        d.ellipse((xx - r, yy - r, xx + r, yy + r), fill=(255, 170, 60, max(0, a)))
    bg.alpha_composite(lay.filter(ImageFilter.GaussianBlur(2)))

def title(bg, T):
    for a, b, lines in TITLES:
        if not (a <= T < b): continue
        t = T - a; s = back(t / 0.45); out = 1 - ease((T - (b - 0.25)) / 0.25) if b < 90 else 1
        if s <= 0.02 or out <= 0: return
        lay = Image.new("RGBA", (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        for i, l in enumerate(lines):
            col = (255, 255, 255) if i == 0 else (255, 196, 92)
            d.text((W / 2, 70 + i * 116), l, font=F("Black", 100), fill=col, stroke_width=12, stroke_fill=PURPLE, anchor="mt")
        lay = lay.rotate(-2.5, resample=Image.BICUBIC)
        if s != 1: lay = lay.resize((max(1, round(W * s)), max(1, round(330 * s))), Image.LANCZOS)
        if out < 1: lay.putalpha(lay.split()[3].point(lambda v: round(v * out)))
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sh.alpha_composite(lay, ((W - lay.width) // 2, 96 + (330 - lay.height) // 2))
        shadow = Image.new("RGBA", bg.size, (0, 0, 0, 0)); shadow.paste((20, 0, 40, 120), (0, 0), sh.split()[3]); bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)), (0, 10)); bg.alpha_composite(sh)
        return

def screen_at(T):
    cur, prev, t0 = None, None, 0
    for a, n in SCREENS:
        if T >= a: prev, cur, t0 = cur, n, a
    return cur, prev, T - t0
def phone(bg, T, a):
    cur, prev, t = screen_at(T)
    if not cur: return
    s = shot(cur)[0]
    if prev and t < 0.22: s = Image.blend(shot(prev)[0], s, ease(t / 0.22))
    f = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, PW - 1, PH - 1), 58, fill=(18, 18, 28)); d.rounded_rectangle((2, 2, PW - 3, PH - 3), 56, outline=(90, 70, 140), width=3)
    mk = Image.new("L", s.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, SW - 1, SH - 1), 46, fill=255)
    f.paste(s, (PAD, PAD), mk)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((PX + 10, PY + 30, PX + PW - 10, PY + PH + 20), 60, fill=(10, 0, 30, 150))
    dy = round((1 - a) * 900)
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)), (0, dy)); bg.alpha_composite(f, (PX, PY + dy))

def touch(bg, T):
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for t0, (x, y) in TAPXY:
        k = T - t0
        if -0.35 <= k < 0:
            a = ease((k + 0.35) / 0.35); r = 34 - 6 * a
            d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, round(150 * a)), outline=(249, 115, 22, round(230 * a)), width=5)
        elif 0 <= k < 0.6:
            r = 26; d.ellipse((x - r, y - r, x + r, y + r), fill=(249, 115, 22, round(120 * (1 - k / 0.6))))
            rr = 26 + k * 110; d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=(249, 115, 22, round(210 * (1 - k / 0.6))), width=6)
    bg.alpha_composite(lay)

def coin_img(size, spin):
    c = V.coin(size); sx = max(0.08, abs(math.cos(spin))); c = c.resize((max(2, round(size * sx)), size), Image.LANCZOS)
    o = Image.new("RGBA", (size, size), (0, 0, 0, 0)); o.alpha_composite(c, ((size - c.width) // 2, 0)); return o
def coins(bg, T):
    for t0, (x0, y0), (x1, y1), lab in COINS:
        k = T - t0
        if not (0 <= k < 1.6): continue
        if k < 0.9:
            p = ease(k / 0.9); x = x0 + (x1 - x0) * p; y = y0 + (y1 - y0) * p - math.sin(p * math.pi) * 260
            bg.alpha_composite(coin_img(78, k * 9), (round(x - 39), round(y - 39)))
        a = 1 - max(0, (k - 1.1) / 0.5); s = back(k / 0.35)
        lay = Image.new("RGBA", (420, 140), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        d.rounded_rectangle((10, 10, 410, 130), 60, fill=(254, 243, 199, round(250 * a)))
        lay.alpha_composite(coin_img(76, 0), (36, 32)); d.text((128, 70), lab, font=F("Black", 58), fill=(146, 64, 14, round(255 * a)), anchor="lm")
        lay = lay.resize((max(1, round(420 * s)), max(1, round(140 * s))), Image.LANCZOS)
        bg.alpha_composite(lay, (round(x0 - lay.width / 2), round(y0 - 190 - lay.height / 2)))

def put_pi(bg, img, cx, feet, h, dy=0, sq=1.0):
    k = h / 600; w0 = round(768 * k); h0 = round(768 * k * sq); im = img.resize((w0, h0), Image.LANCZOS)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sw = 180 * k * (1 - min(1, abs(dy) / 400) * .5)
    ImageDraw.Draw(sh).ellipse((cx - sw, feet - 16 * k, cx + sw, feet + 16 * k), fill=(0, 0, 20, 90)); bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    bg.alpha_composite(im, (round(cx - 384 * k), round(feet + dy - 720 * k * sq)))
_pi = {}
def pi_img(T, face=None):
    m = mouth(T); eq = tuple(outfit(T)); fc = face or ("cuoilon" if 26.0 <= T < 29 else "vui")
    k = (fc, eq, m)
    if k not in _pi:
        if len(_pi) > 300: _pi.clear()
        _pi[k] = V.pi("nam", fc, list(eq), mouth=m, eyes=fc if m else None)
    return _pi[k]

def bubble(bg, T, x0, y0, x1, tail_x):
    v = voice_at(T)
    if not v: return
    name, t, txt = v; a = min(ease(t / 0.25), 1 - ease((t - (VD[name] - 0.2)) / 0.2))
    if a <= 0: return
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay); fnt = F("Bold", 38)
    words, lines, cur = txt.split(), [], ""
    for wd in words:
        tst = (cur + " " + wd).strip()
        if d.textlength(tst, font=fnt) > (x1 - x0 - 56): lines.append(cur); cur = wd
        else: cur = tst
    lines.append(cur)
    hgt = 40 + len(lines) * 50
    d.rounded_rectangle((x0, y0 - hgt, x1, y0), 34, fill=(255, 255, 255, round(248 * a)))
    d.polygon([(tail_x - 22, y0 - 2), (tail_x + 22, y0 - 2), (tail_x - 10, y0 + 34)], fill=(255, 255, 255, round(248 * a)))
    for i, l in enumerate(lines): d.text((x0 + 28, y0 - hgt + 22 + i * 50), l, font=fnt, fill=NAVY + (round(255 * a),))
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sh.paste((10, 0, 30, round(110 * a)), (0, 0), lay.split()[3])
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)), (0, 8)); bg.alpha_composite(lay)

def rank_glow(bg, T):
    if not (29.6 <= T < 33.6): return
    b = shot("t13-rank")[1].get("rank-me")
    if not b: return
    x0, y0 = SX + b["x"] * KS, SY + b["y"] * KS; x1, y1 = x0 + b["width"] * KS, y0 + b["height"] * KS
    p = 0.5 + 0.5 * math.sin((T - 29.6) * 6)
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); ImageDraw.Draw(lay).rounded_rectangle((x0 - 6, y0 - 6, x1 + 6, y1 + 6), 18, outline=(249, 115, 22, round(140 + 115 * p)), width=7)
    bg.alpha_composite(lay)

LOGO = Image.open(os.path.join(V.ROOT, "public", "logo.png")).convert("RGBA")
def frame(T):
    bg = bg_room(); particles(bg, T)
    bob = 1 + 0.016 * math.sin(T * 2 * math.pi / 1.7)
    if T < 3.0:  # mở đầu: Pi rơi xuống giữa màn, nói
        t = T; dy = -(1 - ease(t / 0.6)) * 1300 if t < 0.6 else -abs(math.sin((t - 0.6) * math.pi * 2.4)) * 40 * max(0, 1 - (t - 0.6) / 0.9)
        put_pi(bg, pi_img(T), W / 2, 1640, 880, dy, bob)
        bubble(bg, T, 90, 640, 990, 600)
        title(bg, T)
        return bg
    if T >= 33.6:  # kết: Pi lớn + logo + địa chỉ
        t = T - 33.6
        put_pi(bg, pi_img(T, "cuoilon"), W / 2, 1450, 820, -abs(math.sin(t * math.pi * 1.3)) * 26 * max(0, 1 - t / 2), bob)
        bubble(bg, T, 90, 600, 990, 560)
        title(bg, T)
        a = ease((t - 0.5) / 0.5)
        if a > 0:
            lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
            d.rounded_rectangle((120, 1530, 960, 1820), 48, fill=(255, 255, 255, round(245 * a)))
            lg = LOGO.copy(); lg.thumbnail((150, 150)); lay.alpha_composite(lg, (170, 1600))
            d.text((350, 1610), "Fipilot AI", font=F("Black", 74), fill=NAVY + (round(255 * a),))
            d.text((352, 1712), "app.fipilotai.com", font=F("Bold", 46), fill=(234, 88, 12, round(255 * a)))
            if a < 1: lay.putalpha(lay.split()[3].point(lambda v: round(v * a)))
            bg.alpha_composite(lay, (0, round((1 - a) * 80)))
        return bg
    a = ease((T - 3.0) / 0.55)
    phone(bg, T, a)
    rank_glow(bg, T)
    touch(bg, T); coins(bg, T)
    jump = 0
    for t0 in (8.9, 15.1, 18.3, 26.0):
        if t0 <= T < t0 + 0.6: jump = -math.sin((T - t0) / 0.6 * math.pi) * 70
    put_pi(bg, pi_img(T), 205, 1905, 400, jump, bob)
    bubble(bg, T, 330, 1735, 1050, 380)
    title(bg, T)
    return bg

# ---------- âm thanh ----------
SR = 44100
def tone(f0, f1, dur, vol, dec, harm=(1,)):
    t = np.arange(int(SR * dur)) / SR; f = f0 + (f1 - f0) * t / dur; ph = 2 * np.pi * np.cumsum(f) / SR
    return vol * np.minimum(1, t / 0.004) * np.exp(-t * dec) * sum(np.sin(ph * h) / h for h in harm)
def sfx(kind):
    r = np.random.default_rng(7); ms = lambda s: int(SR * s)
    def mix(*parts):
        n = max(o + len(x) for o, x in parts); out = np.zeros(n)
        for o, x in parts: out[o:o + len(x)] += x
        return out
    if kind == "tap": x = mix((0, 0.5 * r.uniform(-1, 1, ms(0.03)) * np.exp(-np.arange(ms(0.03)) / SR * 260)), (0, tone(1800, 1200, 0.04, 0.35, 90)))
    elif kind == "tick": x = mix((0, tone(880, 900, 0.09, 0.45, 30, (1, 2))), (ms(0.07), tone(1320, 1340, 0.16, 0.45, 22, (1, 2))))
    elif kind == "water": x = mix((0, tone(900, 280, 0.14, 0.6, 18)), (ms(0.05), tone(1400, 700, 0.08, 0.25, 30)))
    elif kind == "coin": x = mix((0, tone(1976, 1976, 0.12, 0.4, 25, (1, 3))), (ms(0.08), tone(2637, 2637, 0.4, 0.45, 9, (1, 3))))
    elif kind == "buy": x = mix((0, 0.4 * r.uniform(-1, 1, ms(0.12)) * np.exp(-np.arange(ms(0.12)) / SR * 40)), (ms(0.06), tone(1568, 1568, 0.15, 0.4, 20, (1, 3))), (ms(0.14), tone(2093, 2093, 0.18, 0.4, 16, (1, 3))), (ms(0.22), tone(2637, 2637, 0.5, 0.45, 7, (1, 3))))
    elif kind == "sparkle": x = mix(*[(ms(k * 0.07), tone(f, f, 0.35, 0.3, 10, (1, 2))) for k, f in enumerate([1319, 1568, 1976, 2637, 3136])])
    elif kind == "whoosh": n = ms(0.45); x = r.uniform(-1, 1, n) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.25
    else: x = tone(260, 720, 0.28, 0.55, 8, (1, 2))  # boing
    return x
def music():
    """nhạc Halloween vui tự sinh: Am – F – C – E, 112 BPM, bass nhảy + nốt xylophone + chuông"""
    n = int(TOTAL * SR); out = np.zeros(n); beat = 60 / 112
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]
    mel = [76, 72, 69, 72, 77, 76, 72, 69, 76, 72, 67, 72, 76, 80, 76, 71]
    for bar in range(int(TOTAL / (beat * 4)) + 1):
        ch = chords[bar % 4]; s0 = int(bar * beat * 4 * SR)
        for k in range(4):  # bass nhảy
            st = s0 + int(k * beat * SR); L = int(SR * beat * 0.9); t = np.arange(L) / SR
            m = ch[0] - 12 + (7 if k % 2 else 0); note = np.sign(np.sin(2 * np.pi * f(m) * t)) * 0.05 * np.exp(-t * 6)
            seg = out[st:st + L]; seg += note[:len(seg)]
        for k in range(8):  # xylophone
            if bar % 2 and k in (5, 7): continue
            m = mel[(bar % 2) * 8 + k]; st = s0 + int(k * beat / 2 * SR); L = int(SR * 0.4); t = np.arange(L) / SR
            note = (np.sin(2 * np.pi * f(m) * t) + 0.35 * np.sin(2 * np.pi * f(m) * 3.9 * t) * np.exp(-t * 30)) * np.exp(-t * 9) * 0.075
            seg = out[st:st + L]; seg += note[:len(seg)]
        L = int(SR * beat * 4); t = np.arange(L) / SR  # đệm hợp âm mỏng
        pad = sum(np.sin(2 * np.pi * f(m) * t) for m in ch) * 0.018 * np.minimum(1, t / 0.3) * np.minimum(1, (t[-1] - t) / 0.3)
        seg = out[s0:s0 + L]; seg += pad[:len(seg)]
    fl = int(SR * 1.5); out[-fl:] *= np.linspace(1, 0, fl)
    return out

def mp3(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32767
def soundtrack(path):
    out = music() * 0.55
    def put(x, t0, vol=1.0):
        s = int(t0 * SR); e = min(len(out), s + len(x)); out[s:e] += x[: e - s] * vol
    for v, t0, _ in VOICE:
        # giọng Pi: nhạc nhỏ lại khi Pi nói
        s, e = int(t0 * SR), int((t0 + VD[v]) * SR); duck = np.ones(len(out)); duck[s:e] = 0.45; out[:] *= duck
    for v, t0, _ in VOICE: put(mp3(V.P + f"voice/nam/{v}.mp3"), t0, 1.5)
    for t0, _ in TAPXY: put(sfx("tap"), t0, 1.0)
    for t0, k in [(8.62, "tick"), (13.62, "water"), (14.22, "water"), (14.82, "water"), (18.32, "boing"), (24.82, "buy"), (26.02, "sparkle"), (3.0, "whoosh"), (33.6, "whoosh")]: put(sfx(k), t0, 1.0)
    for c in COINS: put(sfx("coin"), c[0] + 0.85, 1.0)
    out = np.clip(out, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())

# ---------- xuất: mỗi cảnh 1 file, ghép bằng concat -c copy, thêm tiếng -c:v copy ----------
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", str(FPS)]
def render_scene(i, a, b):
    dst = os.path.join(OUT, f"sc{i:02d}.mp4"); tmp = os.path.join(OUT, f"sc{i:02d}.tmp.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", *ENC, tmp], stdin=subprocess.PIPE)
    k0, k1 = round(a * FPS), round(b * FPS)
    for k in range(k0, k1):
        T = k / FPS; im = frame(T)
        if i > 0 and T - a < 0.2:  # mờ chuyển cảnh nằm trong file cảnh sau
            im = Image.blend(frame(a - 1 / FPS).convert("RGB").convert("RGBA"), im, (T - a) / 0.2)
        p.stdin.write(im.convert("RGB").tobytes())
    p.stdin.close()
    if p.wait() != 0: raise SystemExit(f"cảnh {i} lỗi")
    os.replace(tmp, dst); return dst

def main():
    os.makedirs(OUT, exist_ok=True)
    files = [render_scene(i, a, b) for i, (a, b) in enumerate(SCENES)]
    lst = os.path.join(OUT, "list.txt"); open(lst, "w").write("".join(f"file '{os.path.abspath(f)}'\n" for f in files))
    silent = os.path.join(OUT, "video.mp4"); subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    wav = os.path.join(OUT, "tieng.wav"); soundtrack(wav)
    fin = os.path.join(OUT, "pi-halloween-tiktok.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", fin], check=True)
    frame(26.6).convert("RGB").save(os.path.join(OUT, "pi-halloween-poster.jpg"), quality=90)
    print(fin, os.path.getsize(fin) // 1024, "KB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 3:
        for s in sys.argv[3:]: frame(float(s)).convert("RGB").save(os.path.join(OUT, f"f_{s}.jpg"), quality=85)
        sys.exit()
    main()
