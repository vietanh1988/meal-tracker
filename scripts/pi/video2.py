#!/usr/bin/env python3
"""26/10 (chủ dự án gửi video mẫu 3D 12 cảnh: "video pi làm kiểu này") — bản 2D theo đúng bố cục mẫu, dùng Pi thật của app.
Ngang 1280×720, 11 cảnh: chữ to xanh viền trắng góc trên trái, nền phòng mờ, thẻ trắng trượt vào, đồng Hạt bay, 3 thẻ bộ sưu tập, logo cuối.
Âm thanh: giọng Pi thu sẵn + nhạc nền tự sinh (không gọi AI, không dùng nhạc có bản quyền).
    python3 scripts/pi/video2.py <thư mục ra> [giây]   (có giây = chỉ xuất 1 khung để xem)
"""
import math, os, subprocess, sys, shutil, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv = sys.argv; sys.argv = [sys.argv[0], "/tmp/x"]
import video as V  # ghép Pi như app (pi(), room(), coin(), dur())
sys.argv = _argv

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pi-video2"
W, H, FPS = 1280, 720, 24
WEB = os.path.join(V.ROOT, "web", "public")
F = lambda w, s: ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", s)
BLUE, NAVY, INK = (21, 101, 255), (11, 41, 102), (30, 41, 59)

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def back(t):  # vượt nhẹ rồi về (ease-out-back)
    t = max(0.0, min(1.0, t)); c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2

_bg = {}
def blur_room(ev, tt, tint=None):
    k = (ev, tt, tint)
    if k not in _bg:
        im = V.L(f"rooms/phong_{ev}_{tt}.webp").convert("RGB")
        s = W / im.width; im = im.resize((W, round(im.height * s)), Image.LANCZOS)
        y = round(im.height * 0.42 - H / 2); im = im.crop((0, y, W, y + H)).filter(ImageFilter.GaussianBlur(9))
        im = Image.blend(im, Image.new("RGB", im.size, (255, 255, 255)), 0.18)
        if tint: im = Image.blend(im, Image.new("RGB", im.size, tint), 0.25)
        _bg[k] = im.convert("RGBA")
    return _bg[k].copy()

def grad(c1, c2, radial=False):
    k = ("g", c1, c2, radial)
    if k not in _bg:
        y, x = np.mgrid[0:H, 0:W]
        t = (np.hypot((x - W * .62) / W, (y - H * .5) / H) * 1.6).clip(0, 1) if radial else (x / W * .6 + y / H * .4)
        a = np.array(c1)[None, None, :] * (1 - t[..., None]) + np.array(c2)[None, None, :] * t[..., None]
        _bg[k] = Image.fromarray(a.astype(np.uint8), "RGB").convert("RGBA")
    return _bg[k].copy()

_pi = {}
def pi_img(g, face, eq=(), mouth=None):
    k = (g, face, tuple(eq), mouth)
    if k not in _pi:
        if len(_pi) > 400: _pi.clear()
        _pi[k] = V.pi(g, face, list(eq), mouth=mouth, eyes=face if mouth else None)
    return _pi[k]

def put_pi(bg, img, cx, feet, h, dy=0, sq=1.0, shadow=True):
    k = h / 600; w0 = round(768 * k); h0 = round(768 * k * sq)
    im = img.resize((w0, h0), Image.LANCZOS)
    if shadow:
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh); sw = 170 * k * (1 - min(1, abs(dy) / 400) * .5)
        d.ellipse((cx - sw, feet - 14 * k, cx + sw, feet + 14 * k), fill=(20, 30, 70, 60)); bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    bg.alpha_composite(im, (round(cx - 384 * k), round(feet + dy - 720 * k * sq)))

def title(bg, lines, t, x=56, y=46, size=64):
    """chữ to xanh viền trắng, nghiêng nhẹ, bật vào (như mẫu)"""
    if t <= 0: return
    s = back(t / 0.45)
    lay = Image.new("RGBA", (900, 260), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i, l in enumerate(lines):
        d.text((20, 20 + i * (size + 8)), l, font=F("Black", size), fill=BLUE, stroke_width=9, stroke_fill=(255, 255, 255))
    lay = lay.rotate(4, resample=Image.BICUBIC, expand=False)
    if s != 1: lay = lay.resize((max(1, round(900 * s)), max(1, round(260 * s))), Image.LANCZOS)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sh.alpha_composite(lay, (x, y))
    shadow = Image.new("RGBA", bg.size, (0, 0, 0, 0)); shadow.paste((30, 60, 140, 70), (0, 0), sh.split()[3]); shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    bg.alpha_composite(shadow, (4, 8)); bg.alpha_composite(sh)

def card(bg, box, t, r=26):
    """thẻ trắng có bóng, trượt từ phải + mờ dần vào; trả về (ảnh lớp, toạ độ gốc) để vẽ nội dung lên"""
    x0, y0, x1, y1 = box; a = ease(t / 0.4); dx = round((1 - a) * 80)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    d.rounded_rectangle((x0 + dx, y0 + 10, x1 + dx, y1 + 10), r, fill=(30, 64, 175, round(55 * a)))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    c = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0)); ImageDraw.Draw(c).rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), r, fill=(255, 255, 255, 250))
    return c, (x0 + dx, y0), a

def place_card(bg, c, xy, a):
    if a < 1: c.putalpha(c.split()[3].point(lambda v: round(v * a)))
    bg.alpha_composite(c, xy)

def phone(shot, h):
    """khung điện thoại bo góc chứa ảnh chụp màn hình thật"""
    im = Image.open(os.path.join(WEB, shot)).convert("RGB"); w = round(h * 0.47)
    sc = im.resize((w - 24, round(im.height * (w - 24) / im.width)), Image.LANCZOS).crop((0, 0, w - 24, h - 24))
    f = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 48, fill=(24, 28, 40)); m = Image.new("L", sc.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, sc.width - 1, sc.height - 1), 38, fill=255)
    f.paste(sc, (12, 12), m); d.rounded_rectangle((w / 2 - 52, 22, w / 2 + 52, 46), 12, fill=(24, 28, 40))
    return f

def seed_coin(size, spin):
    c = V.coin(size); sx = max(0.08, abs(math.cos(spin)))
    c = c.resize((max(2, round(size * sx)), size), Image.LANCZOS)
    o = Image.new("RGBA", (size, size), (0, 0, 0, 0)); o.alpha_composite(c, ((size - c.width) // 2, 0)); return o

def sparkle(d, cx, cy, s, a=255):
    if s < 1: return
    d.polygon([(cx, cy - s), (cx + s * .28, cy - s * .28), (cx + s, cy), (cx + s * .28, cy + s * .28), (cx, cy + s), (cx - s * .28, cy + s * .28), (cx - s, cy), (cx - s * .28, cy - s * .28)], fill=(255, 236, 120, a))

def heart(d, cx, cy, s, col=(244, 63, 94, 230)):
    d.ellipse((cx - s, cy - s * .6, cx, cy + s * .3), fill=col); d.ellipse((cx, cy - s * .6, cx + s, cy + s * .3), fill=col)
    d.polygon([(cx - s * .98, cy - s * .05), (cx + s * .98, cy - s * .05), (cx, cy + s * 1.05)], fill=col)

NAM = ["muahe-nam-ao01", "muahe-nam-dau03", "muahe-nam-pk01"]
OUTFITS = [[], ["giangsinh-nam-ao02", "giangsinh-nam-dau01"], ["tet-nam-ao01", "tet-nam-dau01"], ["halloween-nam-ao02", "halloween-nam-dau02"], ["muahe-nam-ao01", "muahe-nam-dau03", "muahe-nam-pk01"]]
VOICE = [("nam", "SANG-02", 0.6), ("nam", "AN-07", 8.4), ("nam", "DO-04", 24.6), ("nam", "IDLE-01", 34.4)]
VD = {(g, i): V.dur(V.P + f"voice/{g}/{i}.mp3") for g, i, _ in VOICE}
def mouth(t):
    for g, i, t0 in VOICE:
        if t0 <= t < t0 + VD[(g, i)] - 0.15: return V.VISEMES[int((t - t0) / 0.11) % len(V.VISEMES)]
    return None

# cảnh: (bắt đầu, kết thúc)
SC = [(0, 4), (4, 8), (8, 12), (12, 16), (16, 20), (20, 24), (24, 29), (29, 34), (34, 38.4), (38.4, 42.4), (42.4, 48)]
TOTAL = 48.0
FOOD = Image.open(os.path.join(WEB, "img/bowl-pho.jpg")).convert("RGB")
LOGO = Image.open(os.path.join(V.ROOT, "public", "logo.png")).convert("RGBA")
PHONE_TODAY = phone("img/app-today.webp", 560)
ICONS = [V.L(f"icon/{i}.webp") for i in ["muahe-nam-dau03", "muahe-nam-pk01", "muahe-nam-ao01", "giangsinh-nam-dau01", "tet-nam-dau01", "halloween-nam-dau02"]]

def scene(i, t, T):
    """t = giây trong cảnh, T = giây tổng"""
    m = mouth(T); bob = 1 + 0.014 * math.sin(T * 2 * math.pi / 1.8)
    if i == 0:  # Chào buổi sáng
        bg = blur_room("muahe", "sang")
        dy = -(1 - ease(t / 0.7)) * 520 if t < 0.7 else -abs(math.sin((t - 0.7) * math.pi * 2.2)) * 30 * max(0, 1 - (t - 0.7) / 0.9)
        put_pi(bg, pi_img("nam", "nhaymat" if 1.2 < t < 2.2 and not m else "vui", (), m), 820, 680, 520, dy, bob)
        title(bg, ["Chào", "buổi sáng!"], t - 0.3)
        c, xy, a = card(bg, (1000, 120, 1220, 230), t - 1.0); d = ImageDraw.Draw(c)
        d.text((24, 18), "07:00", font=F("Black", 44), fill=NAVY); d.text((24, 70), "Thứ Hai · 26/10", font=F("SemiBold", 20), fill=(100, 116, 139)); place_card(bg, c, xy, a)
        return bg
    if i == 1:  # mở app
        bg = grad((232, 241, 255), (214, 228, 255))
        put_pi(bg, pi_img("nam", "haohung", (), m), 470, 690, 470, -abs(math.sin(t * math.pi * 1.5)) * 14, bob)
        a = ease(t / 0.5); ph = PHONE_TODAY.rotate(-6 + 6 * a, resample=Image.BICUBIC, expand=True)
        bg.alpha_composite(ph, (round(760 + (1 - a) * 300), round(80 + (1 - a) * 60)))
        title(bg, ["Mỗi ngày", "1 việc nhỏ"], t - 0.2, y=30)
        return bg
    if i == 2:  # Ghi bữa
        bg = blur_room("muadong", "trua")
        put_pi(bg, pi_img("nam", "cuoilon", ("muahe-nam-pk05",), m), 900, 690, 520, -abs(math.sin(t * math.pi * 1.2)) * 10, bob)
        title(bg, ["Ghi bữa ăn", "dễ dàng"], t - 0.2)
        c, xy, a = card(bg, (70, 380, 540, 520), t - 0.6); d = ImageDraw.Draw(c)
        fd = FOOD.resize((96, 96)); mk = Image.new("L", (96, 96), 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, 95, 95), 18, fill=255); c.paste(fd, (22, 22), mk)
        d.text((136, 28), "Phở bò", font=F("ExtraBold", 32), fill=NAVY); d.text((136, 72), "Bữa sáng · 420 kcal", font=F("SemiBold", 22), fill=(100, 116, 139))
        if t > 1.6:
            k = back((t - 1.6) / 0.35); r = 26 * k; d.ellipse((410 - r, 70 - r, 410 + r, 70 + r), fill=(5, 150, 105))
            if k > .6: d.line((396, 70, 406, 81, 425, 59), fill=(255, 255, 255), width=6, joint="curve")
        place_card(bg, c, xy, a)
        return bg
    if i == 3:  # nước
        bg = grad((236, 246, 255), (205, 232, 255))
        put_pi(bg, pi_img("nam", "vui", ("muahe-nam-ao03", "muahe-nam-pk05"), m), 920, 680, 520, 0, bob)
        title(bg, ["Uống đủ nước", "mỗi ngày"], t - 0.2)
        c, xy, a = card(bg, (70, 400, 520, 520), t - 0.5); d = ImageDraw.Draw(c)
        v = 1.4 + 0.4 * ease((t - 1.2) / 1.2); d.text((92, 18), f"{v:.1f} L".replace(".", ","), font=F("Black", 40), fill=NAVY); d.text((92 + d.textlength(f"{v:.1f} L", font=F("Black", 40)) + 10, 34), "/ 2,0 L", font=F("SemiBold", 22), fill=(100, 116, 139))
        d.ellipse((24, 26, 66, 68), fill=(14, 165, 233)); d.rounded_rectangle((24, 84, 426, 100), 8, fill=(224, 242, 254)); d.rounded_rectangle((24, 84, 24 + 402 * v / 2.0, 100), 8, fill=(14, 165, 233))
        place_card(bg, c, xy, a)
        dd = ImageDraw.Draw(bg)
        for j in range(5):  # giọt nước bay
            p = (T * 0.8 + j * 0.37) % 1; dd.ellipse((700 + j * 38 - 7, 520 - p * 280 - 9, 700 + j * 38 + 7, 520 - p * 280 + 9), fill=(56, 189, 248, round(200 * (1 - p))))
        return bg
    if i == 4:  # cân
        bg = blur_room("giangsinh", "sang")
        put_pi(bg, pi_img("nam", "haohung", ("giangsinh-nam-ao04",), m), 420, 690, 520, -abs(math.sin(t * math.pi)) * 8, bob)
        title(bg, ["Theo dõi", "cân nặng"], t - 0.2, x=700)
        c, xy, a = card(bg, (780, 330, 1210, 560), t - 0.5); d = ImageDraw.Draw(c)
        kg = 62.4 - 0.1 * ease((t - 1.4) / 0.6)
        d.text((28, 22), f"{kg:.1f}".replace(".", ","), font=F("Black", 60), fill=NAVY); d.text((28 + d.textlength(f"{kg:.1f}", font=F("Black", 60)) + 10, 54), "kg", font=F("Bold", 26), fill=NAVY)
        d.text((30, 98), "↓ 0,8 kg trong 2 tuần", font=F("SemiBold", 22), fill=(5, 150, 105))
        pts = [(30, 200), (90, 190), (150, 194), (210, 176), (270, 180), (330, 160), (390, 150)]
        n = ease((t - 0.9) / 1.5) * (len(pts) - 1)
        seg = pts[: int(n) + 1] + ([(pts[int(n)][0] + (pts[min(len(pts) - 1, int(n) + 1)][0] - pts[int(n)][0]) * (n % 1), pts[int(n)][1] + (pts[min(len(pts) - 1, int(n) + 1)][1] - pts[int(n)][1]) * (n % 1))] if n < len(pts) - 1 else [])
        if len(seg) > 1: d.line(seg, fill=(16, 185, 129), width=5, joint="curve")
        place_card(bg, c, xy, a)
        return bg
    if i == 5:  # Hạt
        bg = grad((255, 214, 92), (247, 160, 30), radial=True); d = ImageDraw.Draw(bg)
        for j in range(14):
            ang = j * 2 * math.pi / 14 + T * .25; d.polygon([(640, 380), (640 + math.cos(ang) * 900, 380 + math.sin(ang) * 900), (640 + math.cos(ang + .12) * 900, 380 + math.sin(ang + .12) * 900)], fill=(255, 236, 160, 50))
        cs = seed_coin(230, T * 3.2); bg.alpha_composite(cs, (360, round(250 + math.sin(T * 2) * 12)))
        put_pi(bg, pi_img("nam", "haohung", ("muahe-nam-ao02",), m), 900, 690, 500, -abs(math.sin(t * math.pi * 1.8)) * 40, bob)
        title(bg, ["Làm việc tốt", "nhận Hạt"], t - 0.2)
        for j in range(3):
            t0 = 0.8 + j * 0.9
            if t0 <= t < t0 + 1.0:
                k = (t - t0); d.text((560 + j * 40, 300 - k * 120), "+10 Hạt", font=F("Black", 40), fill=(146, 64, 14, round(255 * (1 - k))), stroke_width=4, stroke_fill=(255, 255, 255, round(255 * (1 - k))), anchor="mm")
        for j in range(8):
            p = (T * .6 + j * .13) % 1; sparkle(d, 300 + j * 90, 640 - p * 500, 14 * (1 - p))
        return bg
    if i == 6:  # trang phục
        bg = blur_room("trungthu", "trua")
        k = min(len(OUTFITS) - 1, int(t / 0.95)); kk = t - k * 0.95
        put_pi(bg, pi_img("nam", "cuoilon" if k else "vui", OUTFITS[k], m), 780, 690, 520, -math.sin(min(1, kk / 0.3) * math.pi) * 30 if kk < 0.3 and k else 0, bob)
        d = ImageDraw.Draw(bg)
        if kk < 0.5 and k:
            for j in range(8): ang = j * math.pi / 4 + kk * 3; sparkle(d, 780 + math.cos(ang) * 230 * (0.5 + kk), 400 + math.sin(ang) * 230 * (0.5 + kk), 18 * (1 - kk * 2))
        title(bg, ["Mở khoá", "trang phục siêu xinh"], t - 0.2, size=58)
        c, xy, a = card(bg, (1020, 210, 1220, 520), t - 0.4); dc = ImageDraw.Draw(c)
        for j, ic in enumerate(ICONS):
            x, y = 16 + (j % 2) * 92, 16 + (j // 2) * 96; dc.rounded_rectangle((x, y, x + 80, y + 84), 16, fill=(238, 244, 255)); ii = ic.copy(); ii.thumbnail((64, 64)); c.alpha_composite(ii, (x + 40 - ii.width // 2, y + 42 - ii.height // 2))
        place_card(bg, c, xy, a)
        return bg
    if i == 7:  # bộ sưu tập
        bg = grad((246, 249, 255), (226, 236, 255)); d = ImageDraw.Draw(bg)
        title(bg, ["Nhiều bộ sưu tập", "cho mọi mùa"], t - 0.1, x=330, y=24, size=56)
        for j, (ev, tt, eq, lab, col) in enumerate([("giangsinh", "sang", ["giangsinh-nam-ao02", "giangsinh-nam-dau01"], "Giáng sinh", (22, 101, 52)), ("tet", "trua", ["tet-nam-ao01", "tet-nam-dau01"], "Tết", (220, 38, 38)), ("muahe", "trua", NAM, "Mùa hè", (2, 132, 199))]):
            a = back((t - 0.4 - j * 0.25) / 0.45)
            if a <= 0: continue
            cw, ch = 330, 420; x0 = 95 + j * 375; y0 = 230
            tile = V.room(ev, tt).resize((cw, round(V.H * cw / V.W))); tile = tile.crop((0, tile.height - ch - 40, cw, tile.height - 40))
            V.place(tile, pi_img("nam", "cuoilon", eq), cw / 2, ch - 40, 300, -abs(math.sin((T + j * .3) * math.pi * 1.4)) * 10)
            mk = Image.new("L", (cw, ch), 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, cw - 1, ch - 1), 28, fill=255)
            tc = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); tc.paste(tile, (0, 0), mk); td = ImageDraw.Draw(tc)
            tw = td.textlength(lab, font=F("ExtraBold", 26)) + 36; td.rounded_rectangle((cw / 2 - tw / 2, ch - 58, cw / 2 + tw / 2, ch - 16), 21, fill=col); td.text((cw / 2, ch - 37), lab, font=F("ExtraBold", 26), fill=(255, 255, 255), anchor="mm")
            s = max(0.05, a); tc = tc.resize((round(cw * s), round(ch * s)), Image.LANCZOS)
            bg.alpha_composite(tc, (round(x0 + cw / 2 - tc.width / 2), round(y0 + ch / 2 - tc.height / 2)))
        return bg
    if i == 8:  # nói chuyện
        bg = blur_room("halloween", "toi", tint=(255, 255, 255))
        put_pi(bg, pi_img("nam", "vui", ("halloween-nam-ao02",), m), 420, 690, 540, 0, bob)
        title(bg, ["Chạm vào Pi,", "Pi nói chuyện"], t - 0.2, x=640)
        c, xy, a = card(bg, (690, 330, 1220, 500), t - 0.4); d = ImageDraw.Draw(c)
        txt = V.LINES["IDLE-01"]; n = int(len(txt) * ease((t - 0.6) / 2.4))
        lines = V.wrap(d, txt[:n], F("Bold", 30), 470)
        for k, l in enumerate(lines): d.text((30, 26 + k * 42), l, font=F("Bold", 30), fill=NAVY)
        place_card(bg, c, xy, a)
        return bg
    if i == 9:  # chăm Pi
        bg = grad((255, 236, 240), (255, 214, 224)); d = ImageDraw.Draw(bg)
        put_pi(bg, pi_img("nam", "yeu", ("giangsinh-nam-ao01",), m), 430, 690, 520, -abs(math.sin(t * math.pi * 1.3)) * 12, bob)
        for j in range(6):
            p = (T * .45 + j * .17) % 1; heart(d, 320 + j * 50, 420 - p * 300, 18 * (1 - p * .5), (244, 63, 94, round(230 * (1 - p))))
        title(bg, ["Chăm Pi mỗi ngày,", "Pi càng vui"], t - 0.2, x=600, size=56)
        c, xy, a = card(bg, (700, 340, 1210, 520), t - 0.4); dc = ImageDraw.Draw(c)
        dc.text((30, 24), "Cấp 3", font=F("Black", 40), fill=(109, 40, 217)); dc.text((150, 38), "Pi lên cấp, mở thêm đồ mới", font=F("SemiBold", 21), fill=(100, 116, 139))
        p = 0.35 + 0.6 * ease((t - 0.9) / 1.6); dc.rounded_rectangle((30, 100, 480, 124), 12, fill=(237, 233, 254)); dc.rounded_rectangle((30, 100, 30 + 450 * p, 124), 12, fill=(124, 58, 237))
        place_card(bg, c, xy, a)
        return bg
    # kết
    bg = grad((236, 244, 255), (205, 222, 255)); d = ImageDraw.Draw(bg)
    put_pi(bg, pi_img("nam", "cuoilon", NAM), 300, 690, 480, -abs(math.sin(t * math.pi * 1.4)) * 18, bob)
    put_pi(bg, pi_img("nu", "vui", ("muahe-nu-ao01", "muahe-nu-dau01")), 540, 700, 400, -abs(math.sin((t + .3) * math.pi * 1.4)) * 18, bob)
    a = round(255 * ease((t - 0.2) / 0.5)); lg = LOGO.resize((96, 96), Image.LANCZOS); lg.putalpha(lg.split()[3].point(lambda v: round(v * a / 255)))
    bg.alpha_composite(lg, (740, 170)); d.text((852, 218), "Fipilot AI", font=F("Black", 72), fill=BLUE + (a,), anchor="lm")
    d.text((744, 310), "Ăn đúng hôm nay,", font=F("ExtraBold", 40), fill=NAVY + (a,)); d.text((744, 362), "khoẻ hơn mỗi ngày", font=F("ExtraBold", 40), fill=NAVY + (a,))
    s = back((t - 0.7) / 0.4)
    if s > 0:
        bw, bh = round(400 * s), round(86 * s); d.rounded_rectangle((744, 450, 744 + bw, 450 + bh), bh // 2, fill=BLUE)
        if s > .8: d.text((744 + bw / 2, 450 + bh / 2), "Dùng thử miễn phí ›", font=F("ExtraBold", 32), fill=(255, 255, 255), anchor="mm")
    d.text((744, 570), "fipilotai.com", font=F("Bold", 30), fill=(71, 85, 105, a))
    return bg

def frame(T):
    for i, (a, b) in enumerate(SC):
        if a <= T < b or (i == len(SC) - 1 and T >= a):
            im = scene(i, T - a, T)
            if i > 0 and T - a < 0.25:  # mờ chuyển cảnh
                pa, pb = SC[i - 1]; im = Image.blend(scene(i - 1, pb - pa - 0.001, T), im, (T - a) / 0.25)
            return im

def music(path):
    """nhạc nền nhẹ tự sinh: hợp âm C–Am–F–G, nốt pluck ngũ cung 100 BPM"""
    sr = 44100; n = int(TOTAL * sr); out = np.zeros(n)
    beat = 60 / 100; chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    tt = np.arange(int(sr * beat * 4)) / sr
    for bar in range(int(TOTAL / (beat * 4)) + 1):
        ch = chords[bar % 4]; s0 = int(bar * beat * 4 * sr)
        pad = sum(np.sin(2 * np.pi * f(m) * tt) for m in ch) * 0.05 * np.minimum(1, tt / 0.4) * np.minimum(1, (tt[-1] - tt) / 0.4)
        seg = out[s0:s0 + len(pad)]; seg += pad[: len(seg)]
        for k in range(8):
            m = ch[k % 3] + 12 + (12 if k in (3, 6) else 0); st = s0 + int(k * beat / 2 * sr); L = int(sr * 0.5)
            t2 = np.arange(L) / sr; note = (np.sin(2 * np.pi * f(m) * t2) + .3 * np.sin(4 * np.pi * f(m) * t2)) * np.exp(-t2 * 7) * 0.09
            seg2 = out[st:st + L]; seg2 += note[: len(seg2)]
    fade = np.ones(n); fl = int(sr * 2); fade[-fl:] = np.linspace(1, 0, fl); out *= fade
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())

def main():
    fr = os.path.join(OUT, "frames2"); shutil.rmtree(fr, ignore_errors=True); os.makedirs(fr)
    for k in range(int(TOTAL * FPS)):
        frame(k / FPS).convert("RGB").save(os.path.join(fr, f"{k:05d}.jpg"), quality=90)
    frame(29.4 + 1.2).convert("RGB").save(os.path.join(OUT, "pi-gioi-thieu-poster.jpg"), quality=88)
    music(os.path.join(OUT, "nhac.wav"))
    ins, flt = ["-i", os.path.join(OUT, "nhac.wav")], ["[1:a]volume=0.55[m]"]
    for k, (g, i, t0) in enumerate(VOICE):
        ins += ["-i", V.P + f"voice/{g}/{i}.mp3"]; flt.append(f"[{k + 2}:a]adelay={int(t0 * 1000)}|{int(t0 * 1000)},volume=1.6[a{k}]")
    mix = "[m]" + "".join(f"[a{k}]" for k in range(len(VOICE))) + f"amix=inputs={len(VOICE) + 1}:normalize=0,atrim=0:{TOTAL}[aout]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fr, "%05d.jpg"), *ins, "-filter_complex", ";".join(flt) + ";" + mix,
                    "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "112k", "-t", str(TOTAL), os.path.join(OUT, "pi-gioi-thieu.mp4")], check=True)
    print(os.path.join(OUT, "pi-gioi-thieu.mp4"), os.path.getsize(os.path.join(OUT, "pi-gioi-thieu.mp4")) // 1024, "KB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 2:
        for s in sys.argv[2:]: frame(float(s)).convert("RGB").save(os.path.join(OUT, f"v2_{s}.jpg"), quality=85)
        sys.exit()
    main()
