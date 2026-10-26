#!/usr/bin/env python3
"""26/10 (chủ dự án: "code hiệu ứng, flow rõ ràng phải làm gì để có điểm và nuôi Pi thế nào, có hiệu ứng click") —
video hướng dẫn nuôi Pi 16:9: điện thoại vẽ bằng code + ngón tay chạm (vòng sáng + gợn sóng), đồng Hạt bay vào ô số dư,
từng bước có số thứ tự. Dùng Pi thật của app, giọng Pi thu sẵn, nhạc nền tự sinh.
    python3 scripts/pi/video3.py <thư mục ra> [giây …]
"""
import math, os, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_a = sys.argv; sys.argv = [sys.argv[0], "/tmp/x"]
import video2 as K  # khung chung: put_pi, title, card, grad, blur_room, seed_coin, sparkle, heart, music, F, màu
import video as V
sys.argv = _a
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pi-video3"
W, H, FPS = K.W, K.H, K.FPS
F, ease, back = K.F, K.ease, K.back
NAVY, BLUE, MUTE, GREEN = K.NAVY, K.BLUE, (100, 116, 139), (5, 150, 105)
PX, PY, PW, PH = 820, 40, 330, 660            # điện thoại (khung ngoài)
SX, SY, SW, SH = PX + 12, PY + 12, PW - 24, PH - 24  # màn hình

TOTAL = 54.0
# sự kiện chạm (giây, x, y trên màn hình gốc toàn khung)
def phone_xy(x, y): return SX + x, SY + y
TAPS = [(4.6,) + phone_xy(262, 178), (11.0,) + phone_xy(222, 266), (11.7,) + phone_xy(262, 266), (12.4,) + phone_xy(222, 326),
        (18.2,) + phone_xy(153, 420), (31.4,) + phone_xy(92, 452), (34.6,) + phone_xy(153, 606), (43.0,) + phone_xy(153, 210)]
# số Hạt theo thời gian
SEEDS = [(0, 120), (5.0, 130), (12.9, 145), (18.6, 165), (23.4, 175), (35.0, 25)]
def seeds_at(T):
    v = SEEDS[0][1]
    for t0, n in SEEDS:
        if T >= t0 + 0.6: v = n
        elif T >= t0: prev = v; v = round(prev + (n - prev) * ease((T - t0) / 0.6)); break
    return v
VOICE = [("nam", "AN-07", 5.2), ("nam", "DO-04", 35.4), ("nam", "IDLE-01", 43.3)]
VD = {(g, i): V.dur(V.P + f"voice/{g}/{i}.mp3") for g, i, _ in VOICE}
def mouth(T):
    for g, i, t0 in VOICE:
        if t0 <= T < t0 + VD[(g, i)] - 0.15: return V.VISEMES[int((T - t0) / 0.11) % len(V.VISEMES)]
    return None
HAT = "muahe-nam-dau03"
def outfit(T): return ["muahe-nam-ao01"] + ([HAT] if T >= 31.6 else [])

def touch(bg, T):
    """ngón tay chạm: vòng tròn hiện trước 0,35 s, ấn xuống, gợn sóng lan ra"""
    d = ImageDraw.Draw(bg)
    for t0, x, y in TAPS:
        k = T - t0
        if -0.35 <= k < 0:
            a = ease((k + 0.35) / 0.35); r = 30 - 6 * a
            d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, round(150 * a)), outline=(21, 101, 255, round(220 * a)), width=4)
        elif 0 <= k < 0.6:
            r = 24; d.ellipse((x - r, y - r, x + r, y + r), fill=(21, 101, 255, round(110 * (1 - k / 0.6))))
            rr = 24 + k * 90; d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=(21, 101, 255, round(200 * (1 - k / 0.6))), width=4)

def screen_base(T):
    s = Image.new("RGBA", (SW, SH), (238, 244, 255, 255)); d = ImageDraw.Draw(s)
    d.text((22, 34), "9:41", font=F("Bold", 15), fill=NAVY)
    # ô số Hạt góc trên phải
    n = seeds_at(T); txt = f"{n}"; tw = d.textlength(txt, font=F("ExtraBold", 18))
    x1 = SW - 16; x0 = x1 - tw - 50; d.rounded_rectangle((x0, 58, x1, 92), 17, fill=(255, 247, 220), outline=(240, 190, 60), width=2)
    s.alpha_composite(K.seed_coin(24, 0), (round(x0 + 8), 63)); d.text((x0 + 38, 75), txt, font=F("ExtraBold", 18), fill=(146, 64, 14), anchor="lm")
    return s, d, (x0 + 20, 75)

def rcard(d, box, r=18, fill=(255, 255, 255)): d.rounded_rectangle(box, r, fill=fill)

def fly_coin(bg, T, t0, src, dst, label):
    k = T - t0
    if 0 <= k < 0.8:
        p = ease(k / 0.8); x = src[0] + (dst[0] - src[0]) * p; y = src[1] + (dst[1] - src[1]) * p - math.sin(p * math.pi) * 90
        c = K.seed_coin(42, k * 9); bg.alpha_composite(c, (round(x - 21), round(y - 21)))
    if 0 <= k < 1.1:
        d = ImageDraw.Draw(bg); a = round(255 * (1 - k / 1.1))
        d.text((src[0], src[1] - 40 - k * 50), label, font=F("Black", 30), fill=(146, 64, 14, a), stroke_width=4, stroke_fill=(255, 255, 255, a), anchor="mm")

def phone_screen(T):
    s, d, pill = screen_base(T)
    if T < 10:  # BƯỚC 1: ăn bữa → Đã ăn
        d.text((22, 70), "Hôm nay", font=F("Black", 26), fill=NAVY)
        rows = [("Bữa sáng", "Phở bò · 420 kcal", True), ("Bữa trưa", "Cơm gà · 560 kcal", False), ("Bữa tối", "Chưa có món", False)]
        for k, (a, b, tap) in enumerate(rows):
            y = 130 + k * 92; rcard(d, (14, y, SW - 14, y + 80))
            d.text((32, y + 16), a, font=F("ExtraBold", 18), fill=NAVY); d.text((32, y + 44), b, font=F("SemiBold", 14), fill=MUTE)
            cx, cy = SW - 44, y + 40; done = tap and T >= 4.6
            if done:
                p = back((T - 4.6) / 0.35); r = 17 * p; d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREEN)
                if p > .6: d.line((cx - 8, cy, cx - 2, cy + 7, cx + 9, cy - 7), fill=(255, 255, 255), width=4, joint="curve")
            else: d.ellipse((cx - 17, cy - 17, cx + 17, cy + 17), outline=(148, 163, 184), width=3)
        d.text((SW / 2, 430), "Ăn xong chạm vòng tròn = Đã ăn", font=F("SemiBold", 14), fill=MUTE, anchor="mm")
    elif T < 16:  # BƯỚC 2: nước
        d.text((22, 70), "Uống nước", font=F("Black", 26), fill=NAVY)
        filled = 5 + sum(T >= t for t in (11.0, 11.7, 12.4))
        rcard(d, (14, 128, SW - 14, 400))
        v = filled * 0.25; d.text((32, 146), f"{v:.2f} L".replace(".", ",").replace(",00", ",0"), font=F("Black", 32), fill=NAVY); d.text((32, 190), "/ 2,0 L hôm nay", font=F("SemiBold", 15), fill=MUTE)
        for k in range(8):
            x = 36 + (k % 4) * 60; y = 232 + (k // 4) * 60
            d.rounded_rectangle((x, y, x + 40, y + 48), 9, fill=(14, 165, 233) if k < filled else (224, 242, 254), outline=(125, 211, 252), width=2)
        d.rounded_rectangle((32, 362, SW - 32, 376), 7, fill=(224, 242, 254)); d.rounded_rectangle((32, 362, 32 + (SW - 64) * filled / 8, 376), 7, fill=(14, 165, 233))
        if filled == 8: d.text((SW / 2, 432), "Đủ nước rồi!", font=F("ExtraBold", 18), fill=GREEN, anchor="mm")
    elif T < 21:  # BƯỚC 3: cân
        d.text((22, 70), "Cân nặng", font=F("Black", 26), fill=NAVY)
        rcard(d, (14, 128, SW - 14, 360)); d.text((SW / 2, 160), "Cân sáng nay", font=F("SemiBold", 16), fill=MUTE, anchor="mm")
        d.text((SW / 2, 236), "62,3", font=F("Black", 72), fill=NAVY, anchor="mm"); d.text((SW / 2, 296), "kg", font=F("Bold", 22), fill=MUTE, anchor="mm")
        saved = T >= 18.2; d.rounded_rectangle((40, 392, SW - 40, 448), 28, fill=GREEN if saved else BLUE)
        d.text((SW / 2, 420), "✓ Đã lưu" if saved else "Lưu", font=F("ExtraBold", 20), fill=(255, 255, 255), anchor="mm")
    elif T < 26:  # BƯỚC 4: chuỗi ngày
        d.text((22, 70), "Chuỗi ngày", font=F("Black", 26), fill=NAVY)
        n = 5 + min(2, int(max(0, T - 21.6) / 0.8))
        rcard(d, (14, 128, SW - 14, 330)); d.text((SW / 2, 196), f"{n} ngày liền", font=F("Black", 36), fill=(234, 88, 12), anchor="mm")
        for k in range(7):
            x = 30 + k * 38; on = k < n; d.ellipse((x, 250, x + 30, 280), fill=(251, 146, 60) if on else (241, 245, 249))
            if on: d.line((x + 8, 265, x + 13, 271, x + 23, 259), fill=(255, 255, 255), width=3)
        if T >= 23.4:
            p = back((T - 23.4) / 0.4); rcard(d, (30, 360, SW - 30, 500), fill=(255, 251, 235))
            tro = Image.open(os.path.join(V.ROOT, "public", "pet", "hieu-ung", "hieu-ung-03.webp")).convert("RGBA"); tro.thumbnail((round(80 * p) or 1, round(80 * p) or 1))
            s.alpha_composite(tro, (round(SW / 2 - tro.width / 2), round(400 - tro.height / 2)))
            d.text((SW / 2, 460), "Nhận: Lấp lánh vàng", font=F("ExtraBold", 17), fill=(146, 64, 14), anchor="mm")
    elif T < 30:
        pass
    elif T < 38:  # BƯỚC 5: cửa hàng
        d.text((22, 70), "Cửa hàng", font=F("Black", 26), fill=NAVY)
        stage = V.room("muahe", "trua").resize((SW - 28, round(V.H * (SW - 28) / V.W))).crop((0, 230, SW - 28, 430))
        mk = Image.new("L", stage.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, stage.width - 1, stage.height - 1), 16, fill=255)
        st = Image.new("RGBA", stage.size, (0, 0, 0, 0)); st.paste(stage, (0, 0), mk)
        dy = -math.sin(min(1, (T - 31.6) / 0.35) * math.pi) * 14 if 31.6 <= T < 31.95 else 0
        K.put_pi(st, K.pi_img("nam", "cuoilon" if T >= 31.6 else "vui", outfit(T)), stage.width / 2, 190, 150, dy, shadow=False)
        s.alpha_composite(st, (14, 118))
        items = ["muahe-nam-dau03", "muahe-nam-pk01", "muahe-nam-ao02", "muahe-nam-dau01", "muahe-nam-pk03", "muahe-nam-giay01"]
        for k, iid in enumerate(items):
            x = 14 + (k % 3) * 102; y = 400 + (k // 3) * 112; sel = k == 0 and T >= 31.4
            rcard(d, (x, y, x + 94, y + 104), 14); d.rounded_rectangle((x, y, x + 94, y + 104), 14, outline=BLUE if sel else (226, 232, 240), width=3 if sel else 1)
            ic = V.L(f"icon/{iid}.webp").copy(); ic.thumbnail((60, 60)); s.alpha_composite(ic, (x + 47 - ic.width // 2, y + 10))
            bought = k == 0 and T >= 35.0; d.text((x + 47, y + 86), "Đã mua" if bought else "150", font=F("ExtraBold", 13), fill=GREEN if bought else (146, 64, 14), anchor="mm")
        if T >= 31.4:
            done = T >= 34.6; d.rounded_rectangle((30, SH - 80, SW - 30, SH - 30), 25, fill=GREEN if done else BLUE)
            d.text((SW / 2, SH - 55), "Mua xong! Mặc luôn" if done else "Mua · 150 Hạt", font=F("ExtraBold", 18), fill=(255, 255, 255), anchor="mm")
    elif T < 42:  # BƯỚC 6: lên cấp
        d.text((22, 70), "Cấp của Pi", font=F("Black", 26), fill=NAVY)
        p = ease((T - 38.6) / 1.6); lvl = 3 if p >= 1 else 2
        rcard(d, (14, 128, SW - 14, 270)); d.text((32, 150), f"Cấp {lvl}", font=F("Black", 36), fill=(109, 40, 217))
        d.rounded_rectangle((32, 214, SW - 32, 234), 10, fill=(237, 233, 254)); d.rounded_rectangle((32, 214, 32 + (SW - 64) * (0.55 + 0.45 * p), 234), 10, fill=(124, 58, 237))
        for k, iid in enumerate(["tet-nam-ao01", "giangsinh-nam-dau01", "halloween-nam-dau02"]):
            x = 14 + k * 102; y = 300; rcard(d, (x, y, x + 94, y + 110), 14)
            ic = V.L(f"icon/{iid}.webp").copy(); ic.thumbnail((60, 60))
            if lvl < 3: ic.putalpha(ic.split()[3].point(lambda v: v // 3))
            s.alpha_composite(ic, (x + 47 - ic.width // 2, y + 14))
            d.text((x + 47, y + 92), "Mở khoá" if lvl >= 3 else "🔒 Cấp 3", font=F("ExtraBold", 13), fill=GREEN if lvl >= 3 else MUTE, anchor="mm")
    else:  # BƯỚC 7: chạm Pi
        d.text((22, 70), "Phòng của Pi", font=F("Black", 26), fill=NAVY)
        stage = V.room("muahe", "sang").resize((SW - 28, round(V.H * (SW - 28) / V.W))).crop((0, 120, SW - 28, 520))
        mk = Image.new("L", stage.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, stage.width - 1, stage.height - 1), 18, fill=255)
        st = Image.new("RGBA", stage.size, (0, 0, 0, 0)); st.paste(stage, (0, 0), mk)
        dy = -abs(math.sin((T - 43.0) * math.pi * 2)) * 22 if 43.0 <= T < 44.0 else 0
        K.put_pi(st, K.pi_img("nam", "cuoilon" if T >= 43 else "vui", outfit(T), mouth(T)), stage.width / 2, 370, 290, dy, shadow=False)
        sd = ImageDraw.Draw(st)
        for j in range(4):
            k = T - 43.0 - j * 0.12
            if 0 <= k < 1.3: K.heart(sd, stage.width / 2 - 60 + j * 40, 140 - k * 90, 12, (244, 63, 94, round(230 * (1 - k / 1.3))))
        s.alpha_composite(st, (14, 118))
        if T >= 43.3:
            txt = V.LINES["IDLE-01"]; n = int(len(txt) * ease((T - 43.3) / 3.0)); rcard(d, (20, 540, SW - 20, SH - 30))
            for k, l in enumerate(V.wrap(d, txt[:n], F("Bold", 17), SW - 70)): d.text((36, 556 + k * 26), l, font=F("Bold", 17), fill=NAVY)
    return s, pill

def phone_layer(T, a=1.0):
    s, pill = phone_screen(T)
    f = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, PW - 1, PH - 1), 46, fill=(24, 28, 40))
    mk = Image.new("L", s.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, SW - 1, SH - 1), 36, fill=255)
    f.paste(s, (12, 12), mk); d.rounded_rectangle((PW / 2 - 48, 22, PW / 2 + 48, 46), 12, fill=(24, 28, 40))
    return f, (SX + pill[0], SY + pill[1])

STEPS = [(3, 10, 1, ["Ăn xong bữa,", "chạm Đã ăn"], "+10 Hạt mỗi bữa"), (10, 16, 2, ["Uống đủ nước"], "+15 Hạt"), (16, 21, 3, ["Cân nặng"], "+20 Hạt"),
         (21, 26, 4, ["Giữ chuỗi ngày"], "+10 Hạt · nhận đồ thành tích"), (30, 38, 5, ["Dùng Hạt", "mua đồ cho Pi"], "Mặc thử trước, ưng thì mua"),
         (38, 42, 6, ["Pi lên cấp,", "mở đồ mới"], "Hạt nhận được = kinh nghiệm"), (42, 48.5, 7, ["Chạm vào Pi,", "Pi nói chuyện"], "Pi khen việc tốt bạn làm")]

def step_title(bg, T):
    for a, b, n, lines, sub in STEPS:
        if a <= T < b:
            t = T - a; s = back(t / 0.4)
            d = ImageDraw.Draw(bg)
            if s > 0:
                r = 34 * s; d.ellipse((60 + 34 - r, 60 + 34 - r, 60 + 34 + r, 60 + 34 + r), fill=BLUE); d.text((94, 94), str(n), font=F("Black", round(40 * s) or 1), fill=(255, 255, 255), anchor="mm")
            K.title(bg, lines, t - 0.1, x=130, y=36, size=58)
            if t > 0.6:
                a2 = round(255 * ease((t - 0.6) / 0.4)); y = 64 + 66 * len(lines) + 30
                tw = d.textlength(sub, font=F("ExtraBold", 26)) + 44; d.rounded_rectangle((150, y, 150 + tw, y + 52), 26, fill=(255, 247, 220, a2), outline=(240, 190, 60, a2), width=2)
                d.text((172, y + 26), sub, font=F("ExtraBold", 26), fill=(146, 64, 14, a2), anchor="lm")
            return

def frame(T):
    m = mouth(T); bob = 1 + 0.014 * math.sin(T * 2 * math.pi / 1.8)
    if T < 3:  # mở đầu
        bg = K.grad((236, 244, 255), (205, 222, 255)); t = T
        dy = -(1 - ease(t / 0.7)) * 520 if t < 0.7 else -abs(math.sin((t - 0.7) * math.pi * 2.2)) * 26 * max(0, 1 - (t - 0.7) / 0.9)
        K.put_pi(bg, K.pi_img("nam", "haohung", ["muahe-nam-ao01"]), 820, 670, 520, dy, bob)
        K.title(bg, ["Nuôi Pi", "thế nào?"], t - 0.4, x=90, y=200, size=86)
        return bg
    if 26 <= T < 30:  # bảng Hạt
        bg = K.grad((255, 236, 180), (252, 196, 90), radial=True); t = T - 26
        K.title(bg, ["Mỗi ngày", "tối đa 120 Hạt"], t - 0.1, x=70, y=60, size=64)
        c, xy, a = K.card(bg, (640, 110, 1220, 640), t - 0.3); d = ImageDraw.Draw(c)
        rows = [("Ăn một bữa (từ 100 kcal)", "+10"), ("Chụp ảnh món ăn", "+5"), ("Ăn từ 3 bữa trở lên", "+20"), ("Uống đủ nước", "+15"), ("Cân nặng", "+20"), ("Giữ chuỗi ngày đã ăn", "+10")]
        for k, (l, v) in enumerate(rows):
            if t < 0.5 + k * 0.18: continue
            y = 34 + k * 80; d.rounded_rectangle((26, y, 554, y + 66), 16, fill=(255, 251, 235)); d.text((50, y + 33), l, font=F("Bold", 24), fill=NAVY, anchor="lm")
            c.alpha_composite(K.seed_coin(34, 0), (430, y + 16)); d.text((474, y + 33), v, font=F("Black", 26), fill=(146, 64, 14), anchor="lm")
        K.place_card(bg, c, xy, a)
        K.put_pi(bg, K.pi_img("nam", "cuoilon", outfit(T)), 330, 700, 330, -abs(math.sin(t * math.pi * 1.6)) * 20, bob)
        return bg
    if T >= 48.5:  # kết
        return K.scene(10, T - 48.5, T)
    bg = K.blur_room("muahe", "sang", tint=(255, 255, 255))
    # Pi lớn bên trái phản ứng theo việc
    face = "vui"
    for t0 in (4.6, 12.4, 18.2, 23.4, 34.6):
        if t0 <= T < t0 + 1.4: face = "haohung"
    jump = 0
    for t0 in (5.0, 12.9, 18.6, 23.4, 35.0):
        if t0 <= T < t0 + 0.6: jump = -math.sin((T - t0) / 0.6 * math.pi) * 60
    K.put_pi(bg, K.pi_img("nam", face, outfit(T), m), 420, 700, 380, jump, bob)
    step_title(bg, T)
    ph, pill = phone_layer(T)
    a = ease((T - 3) / 0.5) if T < 3.5 else 1
    bg.alpha_composite(ph, (PX, round(PY + (1 - a) * 400)))
    for t0, src, lab in [(5.0, phone_xy(262, 178), "+10 Hạt"), (12.9, phone_xy(SW / 2, 400), "+15 Hạt"), (18.6, phone_xy(SW / 2, 420), "+20 Hạt"), (23.4, phone_xy(SW / 2, 230), "+10 Hạt")]:
        fly_coin(bg, T, t0, src, pill, lab)
    if 35.0 <= T < 36.2:
        d = ImageDraw.Draw(bg); k = T - 35.0; d.text((pill[0] - 40, pill[1] + 40 + k * 30), "−150", font=F("Black", 28), fill=(220, 38, 38, round(255 * (1 - k / 1.2))), anchor="mm")
        for j in range(10): ang = j * math.pi / 5 + k * 2; K.sparkle(d, SX + SW / 2 + math.cos(ang) * 140 * (0.4 + k), SY + 300 + math.sin(ang) * 140 * (0.4 + k), 16 * (1 - k / 1.2))
    touch(bg, T)
    return bg

def main():
    fr = os.path.join(OUT, "frames3"); shutil.rmtree(fr, ignore_errors=True); os.makedirs(fr)
    for k in range(int(TOTAL * FPS)): frame(k / FPS).convert("RGB").save(os.path.join(fr, f"{k:05d}.jpg"), quality=90)
    frame(32.2).convert("RGB").save(os.path.join(OUT, "pi-nuoi-poster.jpg"), quality=88)
    K.TOTAL = TOTAL; K.music(os.path.join(OUT, "nhac3.wav"))
    ins, flt = ["-i", os.path.join(OUT, "nhac3.wav")], ["[1:a]volume=0.5[m]"]
    # tiếng "ting" khi được Hạt
    for k, (g, i, t0) in enumerate(VOICE):
        ins += ["-i", V.P + f"voice/{g}/{i}.mp3"]; flt.append(f"[{k + 2}:a]adelay={int(t0 * 1000)}|{int(t0 * 1000)},volume=1.6[a{k}]")
    nv = len(VOICE); coins = [5.0, 12.9, 18.6, 23.4, 35.0]
    for j, t0 in enumerate(coins):
        ins += ["-f", "lavfi", "-t", "0.35", "-i", "sine=frequency=1568:sample_rate=44100"]
        flt.append(f"[{nv + 2 + j}:a]volume=0.25,afade=t=out:st=0.02:d=0.33,adelay={int(t0 * 1000)}|{int(t0 * 1000)}[c{j}]")
    taps = [t for t, _, _ in TAPS]
    for j, t0 in enumerate(taps):
        ins += ["-f", "lavfi", "-t", "0.06", "-i", "sine=frequency=700:sample_rate=44100"]
        flt.append(f"[{nv + 2 + len(coins) + j}:a]volume=0.25,afade=t=out:st=0:d=0.06,adelay={int(t0 * 1000)}|{int(t0 * 1000)}[k{j}]")
    srcs = "[m]" + "".join(f"[a{k}]" for k in range(nv)) + "".join(f"[c{j}]" for j in range(len(coins))) + "".join(f"[k{j}]" for j in range(len(taps)))
    mix = srcs + f"amix=inputs={1 + nv + len(coins) + len(taps)}:normalize=0,atrim=0:{TOTAL}[aout]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fr, "%05d.jpg"), *ins, "-filter_complex", ";".join(flt) + ";" + mix,
                    "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "112k", "-t", str(TOTAL), os.path.join(OUT, "pi-nuoi.mp4")], check=True)
    print(os.path.join(OUT, "pi-nuoi.mp4"), os.path.getsize(os.path.join(OUT, "pi-nuoi.mp4")) // 1024, "KB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 2:
        for s in sys.argv[2:]: frame(float(s)).convert("RGB").save(os.path.join(OUT, f"v3_{s}.jpg"), quality=85)
        sys.exit()
    main()
