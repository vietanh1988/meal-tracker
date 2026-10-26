#!/usr/bin/env python3
"""26/10: ảnh minh hoạ trang /pi trên web (ghép Pi thật như app, dùng hàm của video.py) → web/public/img/pi/*.webp"""
import os, sys
sys.argv = [sys.argv[0], "/tmp/pi-art"]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video as V
from PIL import Image
OUT = os.path.join(V.ROOT, "web", "public", "img", "pi"); os.makedirs(OUT, exist_ok=True)
def save(im, name, w):
    im = im.convert("RGB"); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    for q in (82, 74, 66, 58, 50):
        im.save(os.path.join(OUT, name), quality=q, method=6)
        if os.path.getsize(os.path.join(OUT, name)) <= 90 * 1024: break
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")
# 1. Pi nam + Pi nữ trong phòng mùa hè (ảnh ngang 16:10)
bg = V.room("muahe", "sang").resize((1080, 1920))
bg = bg.crop((0, 1920 - 1080 * 10 // 16 - 120, 1080, 1920 - 120))
cv = bg.copy()
V.place(cv, V.pi("nam", "cuoilon", V.NAM_SET[:3]), 360, 610, 470)
V.place(cv, V.pi("nu", "vui", ["muahe-nu-ao01", "muahe-nu-dau01"]), 720, 610, 470)
save(cv, "pi-nam-nu.webp", 800)
# 2. 4 phòng theo dịp (lưới 2×2) có Pi nữ mặc đồ dịp
tiles = []
for ev, tt, eq in V.NU_DIP:
    r = V.room(ev, tt); V.place(r, V.pi("nu", "vui", eq), V.W / 2, 1075, 600)
    tiles.append(r.crop((0, 220, 720, 1180)).resize((360, 480)))
g = Image.new("RGB", (740, 980), (255, 255, 255))
for i, t in enumerate(tiles): g.paste(t.convert("RGB"), ((i % 2) * 380, (i // 2) * 500))
save(g, "pi-phong-theo-dip.webp", 600)
# 3. mặc đồ từng bước: 4 Pi nam đứng cạnh nhau, thêm dần món
row = Image.new("RGBA", (1600, 560), (238, 244, 255, 255))
for i in range(4):
    V.place(row, V.pi("nam", "vui" if i == 0 else "cuoilon", V.NAM_SET[:i + (1 if i else 0) + (1 if i == 3 else 0)]), 200 + i * 400, 520, 430)
save(row, "pi-mac-do.webp", 800)
# 4. ảnh bìa video
# 5. Pi cho thẻ mời cuối trang + 4 tâm trạng (đứng nguyên con, nền trong)
def solo(g, face, eq, name, w):
    im = V.pi(g, face, eq).crop((200, 110, 568, 730)); im.thumbnail((w, w * 2), Image.LANCZOS)
    im.save(os.path.join(OUT, name), quality=86, method=6); print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")
solo("nam", "cuoilon", V.NAM_SET[:3], "pi-cta.webp", 220)
for f, n in [("vui", "mood-vui"), ("suynghi", "mood-hoi"), ("ngu", "mood-ngu"), ("yeu", "mood-mung")]: solo("nam", f, [], n + ".webp", 120)
# 6. đồ thành tích (ảnh bộ Pet cũ, giữ mã)
PET = os.path.join(V.ROOT, "public", "pet")
for src, n in [("hieu-ung/hieu-ung-03.webp", "tr-03"), ("hieu-ung/hieu-ung-06.webp", "tr-06"), ("hieu-ung/hieu-ung-17.webp", "tr-17"), ("hieu-ung/hieu-ung-02.webp", "tr-02"), ("hieu-ung/hieu-ung-04.webp", "tr-04"), ("doi-dau/doi-dau-11.webp", "tr-11")]:
    p = os.path.join(PET, src)
    if not os.path.exists(p): print("thiếu", src); continue
    im = Image.open(p).convert("RGBA"); im = im.crop(im.getbbox()); im.thumbnail((128, 128), Image.LANCZOS); im.save(os.path.join(OUT, n + ".webp"), quality=86, method=6)
