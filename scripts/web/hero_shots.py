# 23/11: chép ảnh màn thật (E2E mobile.zzz-hero, nhánh shots/ci-hero-shots) sang 2 điện thoại banner trang chủ web.
# Dùng: python3 scripts/web/hero_shots.py <thư mục chứa app-today.png, app-menu.png>
import sys
from PIL import Image
src = sys.argv[1]
for n in ("app-today", "app-menu"):
    im = Image.open(f"{src}/{n}.png").convert("RGB").resize((624, 1350), Image.LANCZOS)  # khung Phone 312×675, bản 2× cho màn nét
    im.save(f"web/public/img/{n}.webp", "WEBP", quality=80, method=6)
    print(n, "ok")
