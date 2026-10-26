#!/usr/bin/env python3
"""26/10 (chủ dự án: "video mô tả phải theo app thật") — video hướng dẫn nuôi Pi 16:9, điện thoại hiện MÀN THẬT của app:
ảnh + toạ độ nút do E2E chụp khi bấm thật (tests/e2e/mobile.zz-video.spec.mjs → nhánh shots/<nhánh>/shots/video).
Ngón tay chạm đúng chỗ nút thật, đồng Hạt bay tới chỗ app hiện Hạt. Pi lớn bên trái = tư thế Muse vẽ (scripts/pi/poses).
    python3 scripts/pi/video4.py <thư mục shots/video> <thư mục ra> [giây …]
"""
import json, math, os, shutil, subprocess, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
_a = sys.argv; sys.argv = [sys.argv[0], "/tmp/x"]
import video2 as K
import video as V
import video3 as P3  # tư thế Pi, tiêu đề bước, đồng Hạt bay
sys.argv = _a
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pi-video4"
W, H, FPS = K.W, K.H, K.FPS
F, ease, back = K.F, K.ease, K.back
BLUE = K.BLUE
# điện thoại: màn 390 × 844 (điểm CSS) thu về cao 640
KS = 680 / 844
SW, SH = round(390 * KS), 680
PW, PH = SW + 24, SH + 24
PX, PY = 880, 8
SX, SY = PX + 12, PY + 12

SHOT = {}
def shot(n):
    if n not in SHOT:
        im = Image.open(os.path.join(SRC, n + ".png")).convert("RGBA").resize((SW, SH), Image.LANCZOS)
        bx = json.load(open(os.path.join(SRC, n + ".json")))
        SHOT[n] = (im, bx)
    return SHOT[n]
def at(n, tid, dx=0.5, dy=0.5):
    """toạ độ trên khung video của nút tid ở ảnh n (giữa nút)"""
    b = shot(n)[1].get(tid)
    if not b: return (SX + SW / 2, SY + SH / 2)
    return (SX + (b["x"] + b["width"] * dx) * KS, SY + (b["y"] + b["height"] * dy) * KS)
ITEM = open(os.path.join(SRC, "item.txt")).read().strip().replace("pet-item-", "") if os.path.exists(os.path.join(SRC, "item.txt")) else None

# màn theo thời gian: (giây bắt đầu, ảnh)
SCREENS = [(3, "v01-truoc-an"), (5.15, "v02-da-an"), (7.6, "v03-the-pi"), (10, "v04-nuoc"), (11.55, "v05-nuoc-cham"), (13.0, "v06-nuoc-du"),
           (16, "v07-can"), (17.45, "v08-can-nhap"), (20.0, "v03-the-pi"), (21.6, "v09-pi"), (24.2, "v10-pi-viec"),
           (31, "v09-pi"), (32.2, "v11-shop"), (33.9, "v12-thu"), (36.1, "v13-da-mua"), (37.6, "v14-pi-mac"), (40.4, "v15-pi-noi")]
def screen_at(T):
    cur, prev, t0 = None, None, 0
    for a, n in SCREENS:
        if T >= a: prev, cur, t0 = cur, n, a
    return cur, prev, T - t0
# chạm: (giây, ảnh, nút)
TAPS = [(5.0, "v01-truoc-an", "eat-sang"), (11.4, "v04-nuoc", "water-cup-next"), (12.1, "v05-nuoc-cham", "water-cup-next"), (12.8, "v05-nuoc-cham", "water-cup-next"),
        (17.3, "v07-can", "weight-tile"), (19.0, "v08-can-nhap", "weight-save"), (21.4, "v03-the-pi", "pet-today-card"),
        (32.0, "v09-pi", "pet-open-shop"), (33.7, "v11-shop", None), (35.9, "v12-thu", "pet-buy"), (37.4, "v13-da-mua", "pet-wear"), (40.2, "v14-pi-mac", "pet-tap")]
TAPXY = [(t, at(n, tid) if tid else at(n, ITEM and f"pet-item-{ITEM}")) for t, n, tid in TAPS]
# đồng Hạt bay: (giây, từ, tới, chữ)
COINS = [(5.4, at("v01-truoc-an", "eat-sang"), at("v02-da-an", "pet-today-card", 0.7, 0.3), "+10 Hạt"),
         (13.2, at("v05-nuoc-cham", "water-cup-next"), at("v06-nuoc-du", "water-count"), "+15 Hạt"),
         (19.3, at("v08-can-nhap", "weight-save"), (SX + SW / 2, SY + 120), "+20 Hạt")]
STEPS = [(3, 10, 1, ["Ăn xong bữa,", "chạm Đã ăn"], "+10 Hạt mỗi bữa"), (10, 16, 2, ["Uống đủ nước"], "+15 Hạt"),
         (16, 21.4, 3, ["Cân 1 lần", "mỗi tuần"], "+20 Hạt mỗi tuần"), (21.4, 27, 4, ["Xem Hạt", "ở màn Pi"], "Chạm thẻ Pi ở Hôm nay"),
         (31, 40, 5, ["Dùng Hạt", "mua đồ cho Pi"], "Mặc thử trước, ưng thì mua"), (40, 46.5, 6, ["Chạm vào Pi,", "Pi nói chuyện"], "Pi khen việc tốt bạn làm")]
P3.STEPS = STEPS
POSE_T = [(3, 5.0, "bam-dien-thoai"), (5.0, 10, "an-com"), (10, 13.0, "bam-dien-thoai"), (13.0, 16, "uong-nuoc"), (16, 21.4, "dung-can"),
          (21.4, 24.2, "bam-dien-thoai"), (24.2, 27, "chi-tay"), (31, 36.1, "bam-dien-thoai")]
VOICE = [("nam", "AN-07", 5.6), ("nam", "DO-04", 36.6), ("nam", "IDLE-01", 40.6)]
VD = {(g, i): V.dur(V.P + f"voice/{g}/{i}.mp3") for g, i, _ in VOICE}
def mouth(T):
    for g, i, t0 in VOICE:
        if t0 <= T < t0 + VD[(g, i)] - 0.15: return V.VISEMES[int((T - t0) / 0.11) % len(V.VISEMES)]
    return None
TOTAL = 51.0

def touch(bg, T):
    d = ImageDraw.Draw(bg)
    for t0, (x, y) in TAPXY:
        k = T - t0
        if -0.35 <= k < 0:
            a = ease((k + 0.35) / 0.35); r = 26 - 5 * a
            d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, round(150 * a)), outline=(21, 101, 255, round(220 * a)), width=4)
        elif 0 <= k < 0.6:
            r = 20; d.ellipse((x - r, y - r, x + r, y + r), fill=(21, 101, 255, round(110 * (1 - k / 0.6))))
            rr = 20 + k * 80; d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=(21, 101, 255, round(200 * (1 - k / 0.6))), width=4)

def phone(T):
    cur, prev, t = screen_at(T)
    s = shot(cur)[0]
    if prev and t < 0.25: s = Image.blend(shot(prev)[0], s, ease(t / 0.25))
    f = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, PW - 1, PH - 1), 44, fill=(24, 28, 40))
    mk = Image.new("L", s.size, 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, SW - 1, SH - 1), 34, fill=255)
    f.paste(s, (12, 12), mk)
    return f

def big_pi(T):
    m = mouth(T)
    pn = next((n for a, b, n in POSE_T if a <= T < b), None)
    if pn: return P3.pose(pn)
    eq = [ITEM] if ITEM and T >= 37.4 and ITEM in V.IT else []
    face = "cuoilon" if 36.1 <= T < 40 else "vui"
    return K.pi_img("nam", face, eq, m)

def frame(T):
    bob = 1 + 0.014 * math.sin(T * 2 * math.pi / 1.8)
    if T < 3:
        bg = K.grad((236, 244, 255), (205, 222, 255)); t = T
        dy = -(1 - ease(t / 0.7)) * 520 if t < 0.7 else -abs(math.sin((t - 0.7) * math.pi * 2.2)) * 26 * max(0, 1 - (t - 0.7) / 0.9)
        K.put_pi(bg, P3.pose("vay-tay"), 820, 670, 520, dy, bob)
        K.title(bg, ["Nuôi Pi", "thế nào?"], t - 0.4, x=90, y=200, size=86)
        return bg
    if 27 <= T < 31:  # bảng Hạt (đúng POINTS trong app, trần 120/ngày)
        bg = K.grad((255, 236, 180), (252, 196, 90), radial=True); t = T - 27
        K.title(bg, ["Mỗi ngày", "tối đa 120 Hạt"], t - 0.1, x=70, y=60, size=64)
        c, xy, a = K.card(bg, (640, 110, 1220, 640), t - 0.3); d = ImageDraw.Draw(c)
        rows = [("Ăn một bữa (từ 100 kcal)", "+10"), ("Chụp ảnh món ăn", "+5"), ("Ăn từ 3 bữa trở lên", "+20"), ("Uống đủ nước", "+15"), ("Cân 1 lần trong tuần", "+20"), ("Giữ chuỗi từ ngày thứ 3", "+10")]
        for k, (l, v) in enumerate(rows):
            if t < 0.5 + k * 0.18: continue
            y = 34 + k * 80; d.rounded_rectangle((26, y, 554, y + 66), 16, fill=(255, 251, 235)); d.text((50, y + 33), l, font=F("Bold", 24), fill=K.NAVY, anchor="lm")
            c.alpha_composite(K.seed_coin(34, 0), (430, y + 16)); d.text((474, y + 33), v, font=F("Black", 26), fill=(146, 64, 14), anchor="lm")
        K.place_card(bg, c, xy, a)
        K.put_pi(bg, P3.pose("om-hat"), 330, 700, 330, -abs(math.sin(t * math.pi * 1.6)) * 20, bob)
        return bg
    if T >= 46.5:
        return K.scene(10, T - 46.5, T)
    bg = K.blur_room("muahe", "sang", tint=(255, 255, 255))
    jump = 0
    for t0 in (5.4, 13.2, 19.3, 37.4, 40.2):
        if t0 <= T < t0 + 0.6: jump = -math.sin((T - t0) / 0.6 * math.pi) * 60
    K.put_pi(bg, big_pi(T), 420, 700, 380, jump, bob)
    P3.step_title(bg, T)
    a = ease((T - 3) / 0.5) if T < 3.5 else 1
    bg.alpha_composite(phone(T), (PX, round(PY + (1 - a) * 400)))
    for t0, src, dst, lab in COINS: P3.fly_coin(bg, T, t0, src, dst, lab)
    touch(bg, T)
    return bg

SR = 44100
def sfx(kind):
    """tiếng hiệu ứng tự sinh (không dùng file ngoài) → wav 16 bit"""
    import random, struct, wave
    p = os.path.join(OUT, f"sfx_{kind}.wav")
    if os.path.exists(p): return p
    def tone(f0, f1, dur, vol, dec, harm=(1,)):
        out = []; ph = 0
        for i in range(int(SR * dur)):
            t = i / SR; f = f0 + (f1 - f0) * t / dur; ph += 2 * math.pi * f / SR
            env = min(1, t / 0.004) * math.exp(-t * dec)
            out.append(vol * env * sum(math.sin(ph * h) / h for h in harm))
        return out
    def mixs(*parts):
        n = max(off + len(x) for off, x in parts); o = [0.0] * n
        for off, x in parts:
            for i, v in enumerate(x): o[off + i] += v
        return o
    ms = lambda t: int(SR * t)
    rnd = random.Random(7)
    if kind == "tap": x = mixs((0, [0.5 * rnd.uniform(-1, 1) * math.exp(-i / SR * 260) for i in range(ms(0.03))]), (0, tone(1800, 1200, 0.04, 0.35, 90)))
    elif kind == "tick": x = mixs((0, tone(880, 900, 0.09, 0.45, 30, (1, 2))), (ms(0.07), tone(1320, 1340, 0.16, 0.45, 22, (1, 2))))
    elif kind == "water": x = mixs((0, tone(900, 280, 0.14, 0.6, 18)), (ms(0.05), tone(1400, 700, 0.08, 0.25, 30)))
    elif kind == "coin": x = mixs((0, tone(1976, 1976, 0.12, 0.4, 25, (1, 3))), (ms(0.08), tone(2637, 2637, 0.4, 0.45, 9, (1, 3))))
    elif kind == "buy": x = mixs((0, [0.4 * rnd.uniform(-1, 1) * math.exp(-i / SR * 40) for i in range(ms(0.12))]), (ms(0.06), tone(1568, 1568, 0.15, 0.4, 20, (1, 3))), (ms(0.14), tone(2093, 2093, 0.18, 0.4, 16, (1, 3))), (ms(0.22), tone(2637, 2637, 0.5, 0.45, 7, (1, 3))))
    elif kind == "sparkle": x = mixs(*[(ms(k * 0.07), tone(f, f, 0.35, 0.3, 10, (1, 2))) for k, f in enumerate([1319, 1568, 1976, 2637, 3136])])
    else: x = tone(260, 720, 0.28, 0.55, 8, (1, 2))  # boing khi chạm Pi
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, int(v * 32767)))) for v in x))
    return p

def main():
    fr = os.path.join(OUT, "frames4"); shutil.rmtree(fr, ignore_errors=True); os.makedirs(fr)
    for k in range(int(TOTAL * FPS)): frame(k / FPS).convert("RGB").save(os.path.join(fr, f"{k:05d}.jpg"), quality=90)
    frame(34.6).convert("RGB").save(os.path.join(OUT, "pi-nuoi-poster.jpg"), quality=88)
    K.TOTAL = TOTAL; K.music(os.path.join(OUT, "nhac4.wav"))
    ins, flt = ["-i", os.path.join(OUT, "nhac4.wav")], ["[1:a]volume=0.35[m]"]
    for k, (g, i, t0) in enumerate(VOICE):
        ins += ["-i", V.P + f"voice/{g}/{i}.mp3"]; flt.append(f"[{k + 2}:a]adelay={int(t0 * 1000)}|{int(t0 * 1000)},volume=1.6[a{k}]")
    nv = len(VOICE)
    # hiệu ứng tiếng (26/10, chủ dự án: "tích vào nước phải có tiếng"): chạm, tích Đã ăn, cốc nước, đồng Hạt, mua, mặc đồ, chạm Pi
    ev = [(t, "tap") for t, _ in TAPXY] + [(5.05, "tick"), (11.45, "water"), (12.15, "water"), (12.85, "water"), (19.05, "tick"),
          (35.95, "buy"), (37.45, "sparkle"), (40.25, "boing")] + [(c[0], "coin") for c in COINS]
    for j, (t0, kind) in enumerate(ev):
        ins += ["-i", sfx(kind)]; flt.append(f"[{nv + 2 + j}:a]adelay={int(t0 * 1000)}|{int(t0 * 1000)}[e{j}]")
    srcs = "[m]" + "".join(f"[a{k}]" for k in range(nv)) + "".join(f"[e{j}]" for j in range(len(ev)))
    mix = srcs + f"amix=inputs={1 + nv + len(ev)}:normalize=0,atrim=0:{TOTAL}[aout]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fr, "%05d.jpg"), *ins, "-filter_complex", ";".join(flt) + ";" + mix,
                    "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "112k", "-t", str(TOTAL), os.path.join(OUT, "pi-nuoi.mp4")], check=True)
    print(os.path.join(OUT, "pi-nuoi.mp4"), os.path.getsize(os.path.join(OUT, "pi-nuoi.mp4")) // 1024, "KB")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 3:
        for s in sys.argv[3:]: frame(float(s)).convert("RGB").save(os.path.join(OUT, f"v4_{s}.jpg"), quality=85)
        sys.exit()
    main()
