#!/usr/bin/env python3
"""26/10: ảnh màn hình cho trang Hướng dẫn + trang Pi trên web, lấy từ ảnh chụp E2E (nhánh shots/<nhánh>, phông Inter).
   python3 scripts/web/guide_shots.py <thư mục shots>   → web/public/img/huong-dan/*.webp (rộng 360, bo góc, ≤ 60 KB)
Tên tài khoản thử (e2e_tester) được làm mờ."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1]
OUT = os.path.join(ROOT, "web", "public", "img", "huong-dan"); os.makedirs(OUT, exist_ok=True)
# tên file web ← ảnh E2E, (phần trên, phần dưới) theo tỉ lệ chiều cao để cắt, vùng làm mờ (tỉ lệ khung)
PICK = {
    "onb-chao": ("onb-chao", (0, 1), []), "onb-co-the": ("onb-co-the", (0, 1), []), "onb-loss-hua": ("onb-loss-hua", (0, 1), []),
    "hom-nay": ("journey-1-01-hom-nay", (0, 1), [(0.03, 0.015, 0.36, 0.04)]),
    "ghi-bua": ("ghi-bua", (0, 1), [(0.03, 0.015, 0.36, 0.04)]), "gio-mon": ("journey-1-03-gio-mon", (0, 1), [(0.03, 0.015, 0.36, 0.04)]),
    "goi-y": ("the-den-gio-goi-y", (0, 1), [(0.03, 0.015, 0.36, 0.04)]), "tinh-calo": ("kiem-tra-calo", (0, 1), []),
    "chup-mon": ("chup-anh", (0, 1), []), "sua-bua": ("journey-6-02-sua-bua", (0, 1), []),
    "thuc-don": ("thuc-don", (0, 1), []), "thuc-don-ai": ("thuc-don-ai", (0, 1), []), "giam-can": ("loss-today", (0, 1), [(0.03, 0.015, 0.36, 0.04)]),
    "van-dong": ("activity-sheet", (0, 1), []), "can-nang": ("tien-do-can-nang", (0, 1), []), "so-do": ("so-do", (0, 1), []),
    "tong-ket": ("tong-ket-thang", (0, 1), []), "nhac-nho": ("nhac-nho", (0, 1), []), "goi-cuoc": ("goi-cuoc", (0, 1), []),
    "pi-man": ("pet-speaking", (0, 1), [(0.0, 0.11, 1.0, 0.2)]), "pi-cua-hang": ("pet-tryon-multi", (0, 1), []), "pi-tu-do": ("pet-closet", (0, 1), []),
    "pi-hoi": ("pet-chat", (0, 1), []), "pi-the": ("pet-user-gym", (0, 0.62), [(0.03, 0.015, 0.36, 0.04)]),
}
W = 360
def out(name, im):
    p = os.path.join(OUT, name + ".webp")
    for q in (80, 72, 64, 56, 48):
        im.save(p, quality=q, method=6)
        if os.path.getsize(p) <= 60 * 1024: break
    print(name, im.size, os.path.getsize(p) // 1024, "KB")
for name, (src, (a, b), blur) in PICK.items():
    f = os.path.join(SRC, src + ".png")
    if not os.path.exists(f): print("thiếu", src); continue
    im = Image.open(f).convert("RGB")
    for (x0, y0, x1, y1) in blur:
        box = tuple(round(v) for v in (x0 * im.width, y0 * im.height, x1 * im.width, y1 * im.height))
        im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(14)), box[:2])
    im = im.crop((0, round(a * im.height), im.width, round(b * im.height)))
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 26, fill=255)
    c = Image.new("RGBA", im.size, (0, 0, 0, 0)); c.paste(im, (0, 0), m)
    ImageDraw.Draw(c).rounded_rectangle((0, 0, im.width - 1, im.height - 1), 26, outline=(214, 223, 236, 255), width=2)
    out(name, c)
