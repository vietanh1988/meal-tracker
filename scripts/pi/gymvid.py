#!/usr/bin/env python3
"""01/11 (chủ dự án: "video mkt cho giáo án tập gym, chất, đăng TikTok"). Dọc 1080×1920, 30 khung/giây.
Điện thoại hiện MÀN THẬT do E2E chụp khi bấm thật (tests/e2e/mobile.zzz-video-gym.spec.mjs → nhánh shots/ci-video-gym, thư mục shots/gymvid).
Ảnh bài tập 2 khung: màn chụp 2 bản …-a / …-b, video đổi qua lại 0,9 giây như app. Pi mặc đồ thể thao (đồ thật của app).
Âm thanh: giọng Pi thu sẵn (public/pi/voice/nam) + nhạc tập gym tự sinh + tiếng hiệu ứng tự sinh. Không gọi AI.
    python3 scripts/pi/gymvid.py <thư mục shots/gymvid> <thư mục ra> [giây …]   (có giây = chỉ xuất khung để xem)
"""
import json, math, os, random, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv; sys.argv = [sys.argv[0], "/tmp/x"]
import video as V
sys.argv = _a

SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
F = lambda w, s: ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", s)
PURPLE, ORANGE, NAVY = (6, 30, 92), (255, 122, 26), (15, 23, 42)  # PURPLE = viền chữ xanh đậm thương hiệu
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
        if not os.path.exists(p) and os.path.exists(os.path.join(SRC, n + "-a.png")): p = os.path.join(SRC, n + "-a.png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGB").resize((SW, SH), Image.LANCZOS); bx = json.load(open(os.path.join(SRC, n.rsplit("-", 1)[0] + ".json" if n.endswith(("-a", "-b")) else n + ".json")))
        else:
            im = Image.new("RGB", (SW, SH), (226, 232, 240)); ImageDraw.Draw(im).text((SW / 2, SH / 2), n, font=F("Bold", 40), fill=(100, 116, 139), anchor="mm"); bx = {}
        _shot[n] = (im, bx)
    return _shot[n]
def at(n, tid, dx=0.5, dy=0.5):
    b = shot(n)[1].get(tid)
    if not b: return (SX + SW / 2, SY + SH / 2)
    return (SX + (b["x"] + b["width"] * dx) * KS, SY + (b["y"] + b["height"] * dy) * KS)


# ---------- kịch bản (giây) ----------
OUTFIT = ["muahe-nam-ao02", "muahe-nam-dau04", "muahe-nam-giay03"]  # áo ba lỗ thể thao + băng đô + giày trắng
PAIR = {"g05-thu-vien", "g06-tim-mong", "g07-chi-tiet", "g08-tac-dong", "g10-dang-tap", "g11-tick-nghi"}
SCREENS = [(3.2, "g01-home"), (5.0, "g02-chon-mau"), (7.6, "g03-giao-an"), (10.0, "g04-7-ngay"), (12.2, "g05-thu-vien"), (14.4, "g06-tim-mong"),
           (16.0, "g07-chi-tiet"), (17.8, "g08-tac-dong"), (19.8, "g09-sua-buoi"), (22.2, "g10-dang-tap"), (25.0, "g11-tick-nghi"),
           (28.0, "g12-xong"), (29.8, "g13-nhan-hat"), (32.2, "g14-nhat-ky")]
TAPS = [(4.5, "g01-home", "wk-btn"), (7.2, "g02-chon-mau", "wk-tpl-day-keo-chan"), (14.2, "g05-thu-vien", "wk-lib-search"), (15.8, "g06-tim-mong", "wk-lib-row"),
        (19.6, "g03-giao-an", "wk-card-start"), (23.4, "g10-dang-tap", "wk-set-tick"), (24.2, "g10-dang-tap", "wk-set-tick"), (24.8, "g10-dang-tap", "wk-set-tick"),
        (29.6, "g12-xong", "wk-done-claim")]
TAPXY = [(t, at(n, tid)) for t, n, tid in TAPS]
COINS = [(29.9, at("g12-xong", "wk-done-claim"), (SX + SW * 0.5, SY + 120 * KS), "+20 Hạt")]
TITLES = [(0.25, 3.2, ["Vào gym", "không biết tập gì?"]), (3.2, 7.6, ["Chọn giáo án mẫu", "1 chạm là có lịch"]), (7.6, 12.2, ["App xếp sẵn buổi", "vào ngày tập của bạn"]),
          (12.2, 17.8, ["119 bài có ảnh", "động tác thật"]), (17.8, 19.8, ["Biết rõ", "tập cho cơ nào"]), (19.8, 22.2, ["Tự sửa bài", "đổi ngày tuỳ ý"]),
          (22.2, 25.0, ["App nhớ mức tạ", "lần trước"]), (25.0, 28.0, ["Tick từng hiệp", "nghỉ có đồng hồ"]), (28.0, 32.2, ["Tập xong", "Pi thưởng Hạt"]),
          (32.2, 35.4, ["Thấy rõ", "mình đang tăng tạ"]), (35.4, 99, ["Lên lịch tập", "miễn phí"])]
VOICE = [("TAP-01", 0.5, "Đến giờ tập rồi! Pi buộc dây giày tưởng tượng xong rồi nè."),
         ("TAP-06", 22.4, "Đừng nghĩ tới cả buổi tập, chỉ nghĩ tới hiệp đầu tiên thôi. Pi ở đây."),
         ("SAUTAP-08", 28.4, "Một buổi tập nữa vào sổ. Lên cấp đang tới gần, Pi ngửi thấy mùi đồ mới rồi!"),
         ("TAP-08", 36.0, "Sẵn sàng chưa? Nhạc lên, người lên, Pi cũng nhảy theo nè.")]
VD = {v: V.dur(V.P + f"voice/nam/{v}.mp3") for v, _, _ in VOICE}
TOTAL = 41.4
SCENES = [(0, 3.2), (3.2, 7.6), (7.6, 12.2), (12.2, 17.8), (17.8, 22.2), (22.2, 28.0), (28.0, 32.2), (32.2, 35.4), (35.4, TOTAL)]
BPM = 124; BEAT = 60 / BPM

def voice_at(T):
    for v, t0, txt in VOICE:
        if t0 <= T < t0 + VD[v]: return v, T - t0, txt
    return None
def mouth(T):
    x = voice_at(T)
    if x and x[1] < VD[x[0]] - 0.15: return V.VISEMES[int(x[1] / 0.11) % len(V.VISEMES)]
    return None

# ---------- nền: phòng tối xanh đậm, vệt sáng chéo chạy theo nhịp nhạc ----------
_c = {}
def bg_gym(T):
    if "bg" not in _c:
        y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
        r = 4 + 10 * y + 0 * x; g = 14 + 30 * y + 0 * x; b = 46 + 60 * y + 0 * x
        glow = np.exp(-(((x - 0.85) ** 2) / 0.08 + ((y - 0.08) ** 2) / 0.05)) * 70
        glow2 = np.exp(-(((x - 0.1) ** 2) / 0.1 + ((y - 0.7) ** 2) / 0.08)) * 40
        arr = np.stack([r + glow * 0.2, g + glow * 0.55 + glow2 * 0.3, b + glow + glow2 * 0.8], -1).clip(0, 255).astype(np.uint8)
        _c["bg"] = Image.fromarray(arr, "RGB").convert("RGBA")
    bg = _c["bg"].copy()
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    pulse = math.exp(-((T % BEAT) / BEAT) * 5)  # sáng lên mỗi phách
    for i in range(7):
        x0 = ((i * 260 + T * 180) % (W + 900)) - 600
        a = round(14 + 22 * pulse) if i % 2 else round(8 + 12 * pulse)
        d.polygon([(x0, H), (x0 + 120, H), (x0 + 120 + 900, 0), (x0 + 900, 0)], fill=(80, 160, 255, a))
    bg.alpha_composite(lay.filter(ImageFilter.GaussianBlur(6)))
    # lưới chấm nhỏ
    if "dots" not in _c:
        dl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(dl)
        for yy in range(0, H, 36):
            for xx in range(0, W, 36): dd.ellipse((xx, yy, xx + 3, yy + 3), fill=(255, 255, 255, 14))
        _c["dots"] = dl
    bg.alpha_composite(_c["dots"])
    return bg

def title(bg, T):
    for a, b, lines in TITLES:
        if not (a <= T < b): continue
        t = T - a; s = back(t / 0.4); out = 1 - ease((T - (b - 0.22)) / 0.22) if b < 90 else 1
        if s <= 0.02 or out <= 0: return
        lay = Image.new("RGBA", (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        for i, l in enumerate(lines):
            col = (255, 255, 255) if i == 0 else (255, 176, 64)
            fs = 104 if d.textlength(l, font=F("Black", 104)) < W - 80 else 88
            d.text((W / 2, 70 + i * 118), l, font=F("Black", fs), fill=col, stroke_width=12, stroke_fill=PURPLE, anchor="mt")
        lay = lay.rotate(-2.5, resample=Image.BICUBIC)
        if s != 1: lay = lay.resize((max(1, round(W * s)), max(1, round(330 * s))), Image.LANCZOS)
        if out < 1: lay.putalpha(lay.split()[3].point(lambda v: round(v * out)))
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sh.alpha_composite(lay, ((W - lay.width) // 2, 96 + (330 - lay.height) // 2))
        shadow = Image.new("RGBA", bg.size, (0, 0, 0, 0)); shadow.paste((0, 8, 40, 140), (0, 0), sh.split()[3]); bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)), (0, 10)); bg.alpha_composite(sh)
        return

def screen_at(T):
    cur, prev, t0 = None, None, 0
    for a, n in SCREENS:
        if T >= a: prev, cur, t0 = cur, n, a
    return cur, prev, T - t0
def frame_of(n, T):
    return shot(n + ("-a" if int(T / 0.9) % 2 == 0 else "-b"))[0] if n in PAIR else shot(n)[0]
def phone(bg, T, a):
    cur, prev, t = screen_at(T)
    if not cur: return
    s = frame_of(cur, T)
    if prev and t < 0.22: s = Image.blend(frame_of(prev, T), s, ease(t / 0.22))
    # zoom nhẹ "Ken Burns" trong mỗi màn cho đỡ tĩnh
    f = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, PW - 1, PH - 1), 58, fill=(12, 16, 28)); d.rounded_rectangle((2, 2, PW - 3, PH - 3), 56, outline=(70, 130, 230), width=3)
    mk = Image.new("L", s.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, SW - 1, SH - 1), 46, fill=255)
    f.paste(s, (PAD, PAD), mk)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((PX + 10, PY + 30, PX + PW - 10, PY + PH + 20), 60, fill=(0, 6, 30, 170))
    dy = round((1 - a) * 900)
    tilt = 0
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)), (0, dy)); bg.alpha_composite(f, (PX, PY + dy + tilt))

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
    m = mouth(T); fc = face or ("cuoilon" if 29.6 <= T < 32 else "vui")
    k = (fc, m)
    if k not in _pi:
        if len(_pi) > 300: _pi.clear()
        _pi[k] = V.pi("nam", fc, list(OUTFIT), mouth=m, eyes=fc if m else None)
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


def glow_box(bg, T, n, tid, t0, t1):
    if not (t0 <= T < t1): return
    b = shot(n)[1].get(tid)
    if not b: return
    x0, y0 = SX + b["x"] * KS, SY + b["y"] * KS; x1, y1 = x0 + b["width"] * KS, y0 + b["height"] * KS
    p = 0.5 + 0.5 * math.sin((T - t0) * 6)
    lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); ImageDraw.Draw(lay).rounded_rectangle((x0 - 6, y0 - 6, x1 + 6, y1 + 6), 18, outline=(255, 140, 40, round(140 + 115 * p)), width=7)
    bg.alpha_composite(lay)

LOGO = Image.open(os.path.join(V.ROOT, "public", "logo.png")).convert("RGBA")
def frame(T):
    bg = bg_gym(T)
    bob = 1 + 0.02 * math.sin(T * 2 * math.pi / BEAT / 2)  # Pi nhún theo nhạc
    if T < 3.2:  # mở đầu: Pi rơi xuống, khởi động
        t = T; dy = -(1 - ease(t / 0.55)) * 1300 if t < 0.55 else -abs(math.sin((t - 0.55) * math.pi / BEAT)) * 36
        put_pi(bg, pi_img(T), W / 2, 1640, 900, dy, bob)
        bubble(bg, T, 90, 640, 990, 600)
        title(bg, T)
        return bg
    if T >= 35.4:  # kết
        t = T - 35.4
        put_pi(bg, pi_img(T, "cuoilon"), W / 2, 1450, 820, -abs(math.sin(t * math.pi / BEAT)) * 30, bob)
        bubble(bg, T, 90, 600, 990, 560)
        title(bg, T)
        a = ease((t - 0.4) / 0.5)
        if a > 0:
            lay = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
            d.rounded_rectangle((120, 1530, 960, 1820), 48, fill=(255, 255, 255, round(245 * a)))
            lg = LOGO.copy(); lg.thumbnail((150, 150)); lay.alpha_composite(lg, (170, 1600))
            d.text((350, 1610), "Fipilot AI", font=F("Black", 74), fill=NAVY + (round(255 * a),))
            d.text((352, 1712), "app.fipilotai.com", font=F("Bold", 46), fill=(0, 98, 240, round(255 * a)))
            if a < 1: lay.putalpha(lay.split()[3].point(lambda v: round(v * a)))
            bg.alpha_composite(lay, (0, round((1 - a) * 80)))
        return bg
    a = ease((T - 3.2) / 0.5)
    phone(bg, T, a)
    glow_box(bg, T, "g02-chon-mau", "wk-tpl-day-keo-chan", 5.4, 7.6)
    glow_box(bg, T, "g08-tac-dong", "wk-ex-targets", 18.0, 19.8)
    glow_box(bg, T, "g13-nhan-hat", "wk-done-claim", 30.4, 32.2)
    touch(bg, T); coins(bg, T)
    jump = 0
    for t0 in (7.2, 23.4, 29.9):
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
    """nhạc tập gym tự sinh: 124 BPM, trống đá 4 phách, hi-hat lệch phách, bass sawtooth, hợp âm stab (Am – F – C – G)"""
    n = int(TOTAL * SR); out = np.zeros(n)
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    rng = np.random.default_rng(3)
    def add(st, x):
        seg = out[st:st + len(x)]; seg += x[:len(seg)]
    kick_t = np.arange(int(SR * 0.28)) / SR
    kick = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-kick_t * 28)) / SR) * np.exp(-kick_t * 9) * 0.55
    hat = rng.uniform(-1, 1, int(SR * 0.05)) * np.exp(-np.arange(int(SR * 0.05)) / SR * 90) * 0.09
    clap = rng.uniform(-1, 1, int(SR * 0.16)) * np.exp(-np.arange(int(SR * 0.16)) / SR * 22) * 0.16
    intro = 2 * BEAT * 4  # 2 ô nhịp đầu chỉ có bass + hat (cho câu mở đầu nghe rõ)
    for bar in range(int(TOTAL / (BEAT * 4)) + 1):
        ch = chords[(bar // 2) % 4]; s0 = int(bar * BEAT * 4 * SR); tb = bar * BEAT * 4
        for k in range(4):
            st = s0 + int(k * BEAT * SR)
            if tb >= intro: add(st, kick)
            add(st + int(BEAT / 2 * SR), hat)
            if k in (1, 3) and tb >= intro: add(st, clap)
            # bass 8 nốt / ô nhịp
            for h in range(2):
                L = int(SR * BEAT / 2 * 0.85); t = np.arange(L) / SR; m = ch[0] - 24 + (12 if h else 0)
                saw = (2 * ((t * f(m)) % 1) - 1) * 0.07 * np.exp(-t * 7)
                add(st + int(h * BEAT / 2 * SR), saw)
        if tb >= intro:  # stab hợp âm phách 2 và 4 (lệch nửa phách)
            for k in (1, 3):
                L = int(SR * 0.22); t = np.arange(L) / SR
                stab = sum((2 * ((t * f(m + 12)) % 1) - 1) for m in ch) * 0.022 * np.exp(-t * 14)
                add(s0 + int((k + 0.5) * BEAT * SR), stab)
    fl = int(SR * 1.8); out[-fl:] *= np.linspace(1, 0, fl)
    return out

def mp3(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32767

def soundtrack(path):
    out = music() * 0.6
    def put(x, t0, vol=1.0):
        s = int(t0 * SR); e = min(len(out), s + len(x)); out[s:e] += x[: e - s] * vol
    duck = np.ones(len(out))
    for v, t0, _ in VOICE:
        s, e = int(t0 * SR), int((t0 + VD[v]) * SR); duck[s:e] = 0.42
    out[:] *= duck
    for v, t0, _ in VOICE: put(mp3(V.P + f"voice/nam/{v}.mp3"), t0, 1.55)
    for t0, _ in TAPXY: put(sfx("tap"), t0, 1.0)
    for t0, k in [(23.42, "tick"), (24.22, "tick"), (24.82, "tick"), (30.0, "sparkle"), (3.2, "whoosh"), (35.4, "whoosh"), (0.55, "boing")]: put(sfx(k), t0, 1.0)
    for c in COINS: put(sfx("coin"), c[0] + 0.85, 1.0)
    out = np.clip(out, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())

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
    fin = os.path.join(OUT, "fipilot-tap-gym-tiktok.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", fin], check=True)
    frame(18.6).convert("RGB").save(os.path.join(OUT, "fipilot-tap-gym-poster.jpg"), quality=90)
    print(fin, os.path.getsize(fin) // 1024, "KB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 3:
        for s in sys.argv[3:]: frame(float(s)).convert("RGB").save(os.path.join(OUT, f"f_{s}.jpg"), quality=85)
        sys.exit()
    main()
