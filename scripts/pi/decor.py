#!/usr/bin/env python3
"""26/10 (chủ dự án duyệt): hoạ tiết góc thẻ Pi ở Hôm nay theo dịp — cắt từ ảnh món (bỏ da xanh bàn tay Pi), ~160px WebP.
   python3 scripts/pi/decor.py <thư mục pi_assets_clean>"""
import sys, os, numpy as np, cv2
from PIL import Image
SRC = sys.argv[1].rstrip("/") + "/items/"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public", "pi", "decor")
PICK = {"tet": "tet/do_tet_nam_pk06.webp", "trungthu": "trungthu/do_trungthu_nam_pk01.webp", "halloween": "halloween/do_halloween_nam_pk06.webp", "giangsinh": "giangsinh/do_giangsinh_nam_pk09.webp"}
os.makedirs(OUT, exist_ok=True)
for ev, f in PICK.items():
    a = np.array(Image.open(SRC + f).convert("RGBA"))
    h = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2HSV)
    skin = (h[..., 0] >= 95) & (h[..., 0] <= 128) & (h[..., 1] > 60) & (a[..., 3] > 40)
    n, lab, st, _ = cv2.connectedComponentsWithStats(skin.astype(np.uint8), 8)
    rm = np.zeros(skin.shape, bool)
    for i in range(1, n):
        if st[i, 4] > 300: rm |= lab == i  # chỉ mảng da lớn (bàn tay), giữ chấm xanh nhỏ của món
    rm = cv2.dilate(rm.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    a[rm, 3] = 0
    al = (a[..., 3] > 40).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(al, 8)
    if n > 1:
        k = 1 + int(np.argmax(st[1:, 4])); keep = np.zeros(al.shape, bool)
        for i in range(1, n):
            if st[i, 4] >= 0.15 * st[k, 4]: keep |= lab == i
        a[~keep, 3] = 0
    if ev == "giangsinh":  # dây treo quả châu mảnh, lệch → bỏ nét mảnh
        op = cv2.morphologyEx((a[..., 3] > 40).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); a[op == 0, 3] = 0
    im = Image.fromarray(a); im = im.crop(im.getbbox()); im.thumbnail((160, 160), Image.LANCZOS)
    im.save(os.path.join(OUT, f"{ev}.webp"), quality=88, method=6)
    print(ev, im.size, os.path.getsize(os.path.join(OUT, f"{ev}.webp")))
