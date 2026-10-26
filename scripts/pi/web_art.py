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
