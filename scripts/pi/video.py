#!/usr/bin/env python3
"""26/10 (chủ dự án: "tự làm video giới thiệu Pi") — dựng video dọc 720×1280 giới thiệu Pi từ ảnh thật của app
(public/pi: thân, mặt, miệng, đồ, phòng) + giọng thu sẵn (public/pi/voice). Không gọi AI.
    python3 scripts/pi/video.py <thư mục ra>   → pi-gioi-thieu.mp4 (H.264 + AAC) + pi-gioi-thieu.webp (ảnh bìa)
"""
import json, math, os, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, "public", "pi") + "/"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pi-video"
FR = os.path.join(OUT, "frames")
W, H, FPS = 720, 1280, 24
man = json.load(open(os.path.join(ROOT, "src", "pi", "manifest.json")))
IT = {x["id"]: x for x in man["items"]}
RUG = {"tet": (0.5, 0.83), "trungthu": (0.55, 0.785), "halloween": (0.5, 0.79), "giangsinh": (0.55, 0.84), "muadong": (0.55, 0.79), "muahe": (0.5, 0.8)}
VISEMES = ["vua", "o", "to", "he", "meu", "vua", "ngam"]
FONT = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
f = lambda w, s: ImageFont.truetype(FONT.format(w), s)
NAVY, BLUE, GOLD = (11, 41, 102), (0, 98, 240), (245, 166, 35)

_c = {}
def L(path):
    if path not in _c: _c[path] = Image.open(P + path).convert("RGBA")
    return _c[path]

def pi(g, face="vui", eq=(), mouth=None, eyes=None):
    """Ghép Pi 768×768 như app: thứ tự lớp manifest.order, thân cụt tay theo món, mũ trùm ẩn lá, áo có lớp đầu gốc."""
    eq = {IT[i]["slot"]: IT[i] for i in eq if i in IT}
    arm = next((x.get("arm") for x in eq.values() if x.get("arm")), None)
    cover = eq.get("dau", {}).get("cover")
    c = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
    for o in man["order"]:
        if o == "than": c.alpha_composite(L(f"body/pi_than{'_khong_tay_' + arm if arm else ''}.webp"))
        elif o == "dau_pi":
            if "ao" in eq: c.alpha_composite(L("body/pi_dau.webp"))
        elif o == "mat_pi": c.alpha_composite(L(f"eyes/{g}/{eyes}.webp") if mouth else L(f"faces/{g}/{face}.webp"))
        elif o == "mieng":
            if mouth: c.alpha_composite(L(f"mouths/{g}/{mouth}.webp"))
        elif o == "la":
            if not cover: c.alpha_composite(L("body/pi_la.webp"))
        elif o in eq: c.alpha_composite(L(eq[o]["file"]))
    return c

def room(ev, t):
    im = L(f"rooms/phong_{ev}_{t}.webp")
    s = max(W / im.width, H / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = max(0, min(r.width - W, round(r.width * RUG[ev][0] - W / 2)))
    return r.crop((x, r.height - H, x + W, r.height)).convert("RGBA")

def ease_out(t): return 1 - (1 - t) ** 3
def bounce(t):  # rơi xuống, nảy 2 lần
    if t >= 1: return 0
    if t < 0.55: return -(1 - ease_out(t / 0.55)) * 700
    t2 = (t - 0.55) / 0.45
    return -abs(math.sin(t2 * math.pi * 2)) * 60 * (1 - t2)

def place(bg, piimg, cx, feet, h=560, dy=0, sq=1.0):
    """đặt Pi: chân ở (cx, feet), cao h (từ lá tới chân = 600/768 khung), sq = bóp dọc (nhún)"""
    k = h / 600
    w0 = round(768 * k); h0 = round(768 * k * sq)
    im = piimg.resize((w0, h0), Image.LANCZOS)
    x = round(cx - 384 * k); y = round(feet + dy - 720 * k * sq)
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    sw = 200 * k * (1 - min(1, abs(dy) / 500) * 0.5)
    d.ellipse((cx - sw, feet - 16 * k, cx + sw, feet + 16 * k), fill=(20, 30, 60, 70))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    bg.alpha_composite(im, (x, y))

def card(bg, title, sub=None, y=70, alpha=1.0):
    d0 = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(d0)
    ft, fs = f("ExtraBold", 50), f("SemiBold", 28)
    tw = d.textlength(title, font=ft); sw = d.textlength(sub, font=fs) if sub else 0
    bw = max(tw, sw) + 72; bh = 96 + (46 if sub else 0)
    x0 = (W - bw) / 2
    d.rounded_rectangle((x0, y, x0 + bw, y + bh), 34, fill=(255, 255, 255, round(236 * alpha)))
    d.text((W / 2, y + 26), title, font=ft, fill=NAVY + (round(255 * alpha),), anchor="mt")
    if sub: d.text((W / 2, y + 92), sub, font=fs, fill=(71, 85, 105, round(255 * alpha)), anchor="mt")
    bg.alpha_composite(d0)

def wrap(d, text, font, maxw):
    out, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if d.textlength(t, font=font) <= maxw: line = t
        else: out.append(line); line = w
    if line: out.append(line)
    return out

def bubble(bg, text, y, side="pi", alpha=1.0, color=None):
    d0 = Image.new("RGBA", bg.size, (0, 0, 0, 0)); d = ImageDraw.Draw(d0)
    fn = f("Bold", 30)
    lines = wrap(d, text, fn, 520)
    bw = max(d.textlength(l, font=fn) for l in lines) + 56; bh = 40 * len(lines) + 40
    x0 = 40 if side == "pi" else W - 40 - bw
    fill = color or ((255, 255, 255) if side == "pi" else (0, 98, 240))
    tc = NAVY if side == "pi" else (255, 255, 255)
    r = (x0, y, x0 + bw, y + bh)
    d.rounded_rectangle(r, 28, fill=fill + (round(240 * alpha),))
    for i, l in enumerate(lines): d.text((x0 + 28, y + 20 + i * 40), l, font=fn, fill=tc + (round(255 * alpha),))
    bg.alpha_composite(d0)
    return bh

def coin(size=64):
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.ellipse((2, 2, size - 2, size - 2), fill=(250, 204, 21), outline=(180, 110, 10), width=max(2, size // 20))
    d.ellipse((size * .18, size * .18, size * .82, size * .82), outline=(217, 140, 10), width=max(2, size // 22))
    cx = size / 2
    d.line((cx, size * .7, cx, size * .42), fill=(22, 120, 60), width=max(2, size // 14))
    d.ellipse((cx - size * .24, size * .3, cx, size * .46), fill=(34, 160, 80))
    d.ellipse((cx, size * .24, cx + size * .24, size * .42), fill=(34, 160, 80))
    return c

def sparkle(bg, cx, cy, t, n=6, r=120):
    d = ImageDraw.Draw(bg)
    for i in range(n):
        a = i * 2 * math.pi / n + t * 2
        rr = r * (0.6 + 0.6 * t); x = cx + math.cos(a) * rr; y = cy + math.sin(a) * rr
        s = 14 * (1 - t)
        if s > 1: d.polygon([(x, y - s), (x + s * .3, y - s * .3), (x + s, y), (x + s * .3, y + s * .3), (x, y + s), (x - s * .3, y + s * .3), (x - s, y), (x - s * .3, y - s * .3)], fill=(255, 220, 80, 230))

def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())

LINES = {  # câu thu sẵn (src/pi/chatLines.json)
    "IDLE-01": "Bấm vào Pi là Pi vui rồi. Có gì cần Pi giúp không?",
    "AN-07": "Xong! Pi đã cất bữa ăn vào nhật ký. Cái cây calo hôm nay vẫn xanh tốt.",
    "DO-04": "Món này Pi chờ lên cấp lâu lắm mới mua được. Giờ là của Pi rồi!",
    "SANG-02": "Sáng rồi sáng rồi! Hôm nay mình gieo hạt nhiệm vụ đầu tiên là gì đây?",
    "IDLE-02": "Pi ở đây nè. Mình xem nhiệm vụ, xem calo, hay xem đồ mới trước?",
}
VOICE = [("nam", "IDLE-01", 1.0), ("nam", "AN-07", 7.3), ("nam", "DO-04", 15.0), ("nu", "SANG-02", 23.2), ("nu", "IDLE-02", 32.4)]
VD = {(g, i): dur(P + f"voice/{g}/{i}.mp3") for g, i, _ in VOICE}
def speaking(t, g):
    for gg, i, t0 in VOICE:
        if gg == g and t0 <= t < t0 + VD[(gg, i)] - 0.15: return (gg, i, t0)
    return None
def mouth_at(t, t0): return VISEMES[int((t - t0) / 0.11) % len(VISEMES)]

NAM_SET = ["muahe-nam-ao01", "muahe-nam-dau03", "muahe-nam-pk01", "muahe-nam-pk03", "muahe-nam-giay01"]
NU_DIP = [("halloween", "toi", ["halloween-nu-ao03", "halloween-nu-dau02"]), ("giangsinh", "sang", ["giangsinh-nu-ao01", "giangsinh-nu-dau01", "giangsinh-nu-pk03"]),
          ("tet", "trua", ["tet-nu-ao01", "tet-nu-dau05"]), ("trungthu", "toi", ["trungthu-nu-ao01", "trungthu-nu-dau01"])]
TOTAL = 42.0
COIN = coin(72); COIN_S = coin(40)

def frame(t):
    if t < 22.5:  # Pi nam ở phòng mùa hè
        ev, tt = "muahe", ("sang" if t < 13 else "trua")
        bg = room(ev, tt)
        g = "nam"; sp = speaking(t, g)
        eq = []
        if t >= 13.8: eq = NAM_SET[:min(len(NAM_SET), 1 + int((t - 13.8) / 1.4))]
        face = "vui" if t < 6.5 else "haohung" if t < 13 else "cuoilon"
        dy = bounce((t - 0.2) / 1.2) if t < 1.4 else 0
        sq = 1 + 0.012 * math.sin(t * 2 * math.pi / 2.2)
        # nhún khi mặc món mới
        if t >= 13.8:
            k = (t - 13.8) % 1.4
            if k < 0.35 and int((t - 13.8) / 1.4) < len(NAM_SET): dy = -math.sin(k / 0.35 * math.pi) * 34
        img = pi(g, face, eq, mouth=mouth_at(t, sp[2]) if sp else None, eyes=face)
        place(bg, img, W / 2, 1075, 600, dy, sq)
        if t >= 13.8:
            k = (t - 13.8) % 1.4; n = int((t - 13.8) / 1.4)
            if n < len(NAM_SET) and k < 0.6: sparkle(bg, W / 2, 700, k / 0.6, 8, 150)
        if t < 6.5: card(bg, "Gặp Pi", "Bạn đồng hành nhỏ trong Fipilot AI", alpha=min(1, max(0, (t - 0.8) / 0.4)))
        elif t < 13:
            card(bg, "Làm việc tốt, nhận Hạt", "Ăn đúng bữa · uống đủ nước · cân đều", alpha=min(1, (t - 6.5) / 0.4))
            # đồng Hạt bay lên ô đếm
            d = ImageDraw.Draw(bg)
            n = min(6, max(0, int((t - 7.2) / 0.8) + 1)) if t >= 7.2 else 0
            pill = (W - 220, 300, W - 40, 368)
            d.rounded_rectangle(pill, 34, fill=(255, 247, 220, 245), outline=(240, 190, 60), width=3)
            bg.alpha_composite(COIN_S, (pill[0] + 16, pill[1] + 14))
            d.text((pill[0] + 70, pill[1] + 34), f"{n * 10 + 120}", font=f("ExtraBold", 34), fill=(146, 64, 14), anchor="lm")
            for i in range(n + 1):
                t0 = 7.2 + i * 0.8
                if t0 <= t < t0 + 0.7 and i < 6:
                    k = (t - t0) / 0.7; x = 200 + (pill[0] + 20 - 200) * ease_out(k); y = 760 + (pill[1] - 760) * ease_out(k) - math.sin(k * math.pi) * 120
                    bg.alpha_composite(COIN, (round(x), round(y)))
                    d.text((round(x) + 36, round(y) - 18), "+10", font=f("ExtraBold", 30), fill=(146, 64, 14), anchor="mm")
        else: card(bg, "Dùng Hạt mua đồ cho Pi", "Hơn 300 món theo 6 bộ sưu tập", alpha=min(1, (t - 13) / 0.4))
        if sp: bubble(bg, LINES[sp[1]], 1120, "pi")
        return bg
    if t < 31.5:  # Pi nữ đổi phòng theo dịp
        i = min(3, int((t - 22.5) / 2.25)); k = (t - 22.5) - i * 2.25
        ev, tt, eq = NU_DIP[i]
        bg = room(ev, tt)
        if k < 0.35 and i > 0:  # mờ chuyển phòng
            pe, pt, peq = NU_DIP[i - 1]; old = room(pe, pt); place(old, pi("nu", "vui", peq), W / 2, 1075, 600)
        g = "nu"; sp = speaking(t, g)
        img = pi(g, "cuoilon" if i % 2 else "vui", eq, mouth=mouth_at(t, sp[2]) if sp else None, eyes="cuoilon" if i % 2 else "vui")
        place(bg, img, W / 2, 1075, 600, -math.sin(min(1, k / 0.4) * math.pi) * 28 if k < 0.4 else 0, 1 + 0.012 * math.sin(t * 2.8))
        if k < 0.35 and i > 0: bg = Image.blend(old, bg, k / 0.35)
        card(bg, "Phòng đổi theo dịp, theo giờ", "Pi nam hay Pi nữ theo hồ sơ của bạn", alpha=min(1, (t - 22.5) / 0.4))
        if sp: bubble(bg, LINES[sp[1]], 1120, "pi")
        return bg
    if t < 38.2:  # hỏi Pi
        bg = room("muadong", "toi"); g = "nu"; sp = speaking(t, g)
        place(bg, pi(g, "vui", ["muadong-nu-ao01", "muadong-nu-dau04"], mouth=mouth_at(t, sp[2]) if sp else None, eyes="vui"), W / 2, 1060, 560, 0, 1 + 0.012 * math.sin(t * 2.8))
        card(bg, "Chạm vào Pi, Pi nói chuyện", "Hỏi Pi về bữa ăn bất cứ lúc nào", alpha=min(1, (t - 31.5) / 0.4))
        if t >= 32.0: bubble(bg, "Pi ơi!", 300, "me", alpha=min(1, (t - 32.0) / 0.3))
        if sp: bubble(bg, LINES[sp[1]], 1120, "pi")
        return bg
    # kết: mời dùng thử
    bg = room("muahe", "sang")
    ov = Image.new("RGBA", bg.size, (0, 54, 217, 215)); bg.alpha_composite(ov)
    k = t - 38.2
    for j, (g, x) in enumerate([("nam", W / 2 - 150), ("nu", W / 2 + 150)]):
        dy = -abs(math.sin((k + j * 0.25) * math.pi * 1.6)) * 26
        place(bg, pi(g, "cuoilon", NAM_SET[:2] if g == "nam" else ["muahe-nu-ao01", "muahe-nu-dau01"]), x, 1060, 430, dy)
    d = ImageDraw.Draw(bg); a = round(255 * min(1, k / 0.4))
    logo = L("../logo.png") if os.path.exists(P + "../logo.png") else None
    if logo:
        lg = logo.resize((120, 120), Image.LANCZOS); bg.alpha_composite(lg, (W // 2 - 60, 150))
    d.text((W / 2, 310), "Fipilot AI", font=f("ExtraBold", 64), fill=(255, 255, 255, a), anchor="mt")
    d.text((W / 2, 400), "Ăn đúng calo, có Pi đi cùng", font=f("SemiBold", 34), fill=(219, 234, 254, a), anchor="mt")
    bw = 460; d.rounded_rectangle((W / 2 - bw / 2, 480, W / 2 + bw / 2, 566), 43, fill=(255, 255, 255, a))
    d.text((W / 2, 523), "Dùng thử miễn phí", font=f("ExtraBold", 36), fill=BLUE + (a,), anchor="mm")
    d.text((W / 2, 600), "fipilotai.com", font=f("Bold", 34), fill=(255, 255, 255, a), anchor="mt")
    return bg

def main():
    shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR)
    n = int(TOTAL * FPS)
    for i in range(n):
        frame(i / FPS).convert("RGB").save(os.path.join(FR, f"{i:05d}.jpg"), quality=90)
        if i == int(3.2 * FPS): frame(i / FPS).convert("RGB").resize((720, 1280)).save(os.path.join(OUT, "pi-gioi-thieu.webp"), quality=80)
    # âm thanh: các câu thu sẵn đặt đúng giây
    ins, flt = [], []
    for k, (g, i, t0) in enumerate(VOICE):
        ins += ["-i", P + f"voice/{g}/{i}.mp3"]; flt.append(f"[{k + 1}:a]adelay={int(t0 * 1000)}|{int(t0 * 1000)}[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(VOICE))) + f"amix=inputs={len(VOICE)}:normalize=0,apad,atrim=0:{TOTAL}[aout]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(FR, "%05d.jpg"), *ins,
                    "-filter_complex", ";".join(flt) + ";" + mix, "-map", "0:v", "-map", "[aout]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "96k", "-t", str(TOTAL), os.path.join(OUT, "pi-gioi-thieu.mp4")], check=True)
    print(os.path.join(OUT, "pi-gioi-thieu.mp4"), os.path.getsize(os.path.join(OUT, "pi-gioi-thieu.mp4")) // 1024, "KB")

if __name__ == "__main__":
    if len(sys.argv) > 2:  # xem nhanh 1 khung: video.py <ra> <giây>
        os.makedirs(OUT, exist_ok=True); frame(float(sys.argv[2])).convert("RGB").save(os.path.join(OUT, f"t{sys.argv[2]}.jpg")); sys.exit()
    main()
