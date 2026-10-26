#!/usr/bin/env python3
"""23/10 — Đưa bộ ảnh Pi (Muse AI, pi_assets_clean.zip) vào app. Chạy lại mỗi khi có bộ ảnh mới:
    python3 scripts/pi/build.py <thư mục pi_assets_clean>
24/10: dùng bộ pi_full (pi_assets_clean mới: thêm body/pi_la.webp, eyes/, mouths/).
Bộ ảnh ĐÃ làm sạch vệt xanh / viền thừa sẵn (README của bộ) → script KHÔNG xử lý lại ảnh đồ / mặt / thân, chỉ:
  - chép body/, faces/, items/ (WebP 768x768, chân Pi tại 384,720) vào public/pi/ giữ nguyên đường dẫn;
  - phòng: thu về rộng 768 (giữ tỉ lệ 2:3) cho nhẹ;
  - icon từng món: cắt vùng có hình, vuông 160 (public/pi/icon/<mã>.webp);
  - đồ cầm tay (ô tay / gang) có vẽ cánh tay giơ lên → ghi "arm": "trai" | "phai" và sinh thân đã ẩn cánh tay gốc bên đó
    (public/pi/body/pi_than_khong_tay_<bên>.webp) để khỏi thành 2 tay;
  - sinh src/pi/manifest.json cho app.
"""
import json, os, re, shutil, sys
import numpy as np
import cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean_tay import clean as clean_tay
from fix_hat import fix_hat
from hat_fit import hat_tf

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "pi")
MAN = os.path.join(ROOT, "src", "pi", "manifest.json")
ICON_PX, ROOM_W = 160, 768
EVENTS = ["tet", "trungthu", "halloween", "giangsinh", "muadong", "muahe"]
TIMES = ["sang", "trua", "toi"]

cat = json.load(open(os.path.join(SRC, "pi_catalog.json"), encoding="utf-8"))
N = cat.get("canvas", [768, 768])[0]
K = N / 1024
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)

def put(rel, src=None, im=None, q=82):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    if src: shutil.copyfile(src, p)
    else: im.save(p, "WEBP", quality=q, method=4)
    return os.path.getsize(p)

total = 0
for d in ("body", "faces", "eyes", "mouths"):  # 24/10 pi_full: eyes/ + mouths/ cho lúc Pi nói
    for dp, _, fs in os.walk(os.path.join(SRC, d)):
        for f in fs:
            if f.endswith(".webp"):
                s = os.path.join(dp, f); total += put(os.path.relpath(s, SRC), src=s)

body = np.asarray(Image.open(os.path.join(SRC, cat["body"])).convert("RGBA"))
solid = body[..., 3] > 200
# 24/10 pi_full: lá là lớp riêng (body/pi_la.webp) vẽ đè lên mũ + đung đưa → thân trong app bỏ phần lá (khỏi lộ lá gốc khi lá lắc)
LEAF = None
if cat.get("leaves") and os.path.exists(os.path.join(SRC, cat["leaves"])):
    LEAF = np.asarray(Image.open(os.path.join(SRC, cat["leaves"])).convert("RGBA"))
    lm = LEAF[..., 3] > 200  # chỉ chỗ lá phủ kín (mép lá giữ ở thân → không hở khe ở gốc lá dưới mũ)
    nb = body.copy(); nb[lm, 3] = 0
    # 24/10 (mũ trùm đầu ẩn hẳn lá): viền lá mờ còn sót trên thân lộ ra thành bóng lá trắng → bỏ mọi điểm KHÔNG phải da / viền xanh của đầu trong vùng lá
    _hsv = cv2.cvtColor(np.ascontiguousarray(body[..., :3]), cv2.COLOR_RGB2HSV)
    _head = (_hsv[..., 0] >= 95) & (_hsv[..., 0] <= 130) & (_hsv[..., 1] > 60)
    _zone = cv2.dilate((LEAF[..., 3] > 0).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    nb[_zone & ~_head, 3] = 0
    total += put("body/pi_than.webp", im=Image.fromarray(nb), q=90)
    body_noleaf = nb
else:
    body_noleaf = body
yy, xx = np.mgrid[0:N, 0:N]
ys, xs = np.where(solid)
bbox = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
# cánh tay gốc của thân (đo trên khung 1024 rồi quy về khung hiện tại)
ARM_Y = (630 * K, 845 * K)
arm_l = solid & (xx < 383 * K) & (yy >= ARM_Y[0]) & (yy <= ARM_Y[1])
arm_r = solid & (xx > 648 * K) & (yy >= ARM_Y[0]) & (yy <= ARM_Y[1])

def blue_mask(rgb):
    hsv = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2HSV)
    return (hsv[..., 0] >= 95) & (hsv[..., 0] <= 125) & (hsv[..., 1] > 0.25 * 255)

def raised_arm(a):
    """cánh tay giơ lên: món che phần lớn vùng tay gốc nhưng ở đó gần như không còn da xanh, da xanh lại nằm ngoài thân"""
    skin = (a[..., 3] > 128) & blue_mask(a[..., :3])
    for side, zone in (("trai", arm_l), ("phai", arm_r)):
        if ((a[..., 3] > 128) & zone).sum() < 0.25 * zone.sum(): continue
        # 23/10 (bộ sạch + pi_fix_53): món tay đã vẽ khớp lên tay gốc → ẩn tay gốc lại lộ lỗ / mất tay (soát mắt 25 món: không ẩn đẹp hơn).
        # Chỉ ẩn khi món vẽ phủ gần kín vùng tay gốc (≥ 85%) và có cánh tay mới bên ngoài thân.
        if ((a[..., 3] > 128) & zone).sum() >= 0.85 * zone.sum() and (skin & zone).sum() < 0.3 * zone.sum() and (skin & ~zone & ~solid).sum() > 800 * K * K: return side
    return None

# 24/10 (chủ dự án: hộp quà ra 2 tay): thân bỏ 1 tay cắt theo nếp tay + vẽ lại viền (scripts/pi/armless.py), không cắt thẳng
from armless import armless
from arm_gap import fill_gap
ARMLESS = {side: armless(body_noleaf, side) for side in ("trai", "phai")}
for side in ("trai", "phai"):
    total += put(f"body/pi_than_khong_tay_{side}.webp", im=Image.fromarray(ARMLESS[side]), q=88)
# 25/10 (chủ dự án: "ghép xong thừa tay"): thân CỤT ĐẦU TAY — giữ cánh tay, bỏ đoạn đầu tay từ y=TIP_Y (khung 768) trở xuống.
# Món cầm tay vẽ riêng có bàn tay Pi đặt ở đầu tay buông → app dùng thân này (arm = "dau<bên>"), bàn tay vẽ nối vào chỗ cắt → hết 2 tay.
# fit_check.py soát bàn tay vẽ che kín mép cắt (≥ 95%), hở → món vào fit.json (chưa bán).
TIP_Y = 560
ARM_PIX = {side: (body_noleaf[..., 3] > 40) & (ARMLESS[side][..., 3] <= 40) for side in ("trai", "phai")}
_yy = np.mgrid[0:body_noleaf.shape[0], 0:body_noleaf.shape[1]][0]
TIP = {side: ARM_PIX[side] & (_yy * 768 // body_noleaf.shape[0] >= TIP_Y) for side in ("trai", "phai")}
_xx = np.mgrid[0:body_noleaf.shape[0], 0:body_noleaf.shape[1]][1]
for side in ("trai", "phai"):
    # 26/10: dưới y=TIP_Y lấy từ thân cụt cả tay (ARMLESS — giữ viền hông thân), không xoá trơn (xoá trơn làm hông thân cụt thẳng, mất viền)
    _half = (_xx < body_noleaf.shape[1] // 2) if side == "trai" else (_xx >= body_noleaf.shape[1] // 2)
    _low = (_yy * 768 // body_noleaf.shape[0] >= TIP_Y) & _half
    _cut = body_noleaf.copy(); _cut[_low] = ARMLESS[side][_low]
    total += put(f"body/pi_than_khong_tay_dau{side}.webp", im=Image.fromarray(_cut), q=88)
# món vẽ cánh tay riêng (giơ lên / bưng ra trước) KHÔNG đè tay gốc → dùng thân bỏ tay bên đó. Soát mắt 24/10 từng món ứng viên
# (da xanh ngoài thân ≥ 1000px, phủ vùng tay gốc < 40%); món không vẽ bàn tay (đũa phép, xẻng, chong chóng) giữ tay gốc.
# 24/10 soát từng món: vệt lá cũ sót xa gốc lá (vùng rộng; KHÔNG áp chung vì vòng hoa có lá thật)
# 24/10 tối (chủ dự án chốt): món Muse vẽ RIÊNG trên nền trong suốt → chỉ đặt đè lên, KHÔNG chạy bộ cắt lá / vụn (cắt nhầm mũ xanh lá)
STANDALONE = {  # 25/10: món vẽ riêng đã duyệt ghép
              "halloween-nam-pk08", "giangsinh-nam-pk09", "halloween-nam-pk09", "halloween-nu-pk10", "muadong-nam-pk06", "muadong-nam-pk08", "giangsinh-nu-pk07", "giangsinh-nam-dau01", "giangsinh-nam-dau02", "giangsinh-nam-dau03", "giangsinh-nam-dau04", "giangsinh-nam-dau05", "giangsinh-nam-pk03", "giangsinh-nam-pk12", "giangsinh-nu-dau01", "giangsinh-nu-dau02", "giangsinh-nu-dau04", "giangsinh-nu-pk03", "halloween-nam-dau01", "halloween-nam-dau02", "halloween-nam-dau05", "halloween-nam-pk04", "halloween-nu-dau01", "muadong-nam-dau01", "muadong-nam-dau02", "muadong-nam-dau03", "muadong-nam-dau05", "muadong-nam-pk01", "muadong-nam-pk02", "muadong-nam-pk11", "muadong-nu-dau01", "muadong-nu-dau03", "muadong-nu-dau04", "muadong-nu-pk01", "muadong-nu-pk02", "muahe-nam-dau01", "muahe-nam-dau02", "muahe-nam-dau03", "muahe-nam-dau04", "muahe-nam-pk12", "muahe-nu-dau01", "muahe-nu-dau02", "muahe-nu-dau04", "tet-nam-dau01", "tet-nam-dau02", "tet-nam-dau03", "tet-nam-dau04", "tet-nam-pk03", "tet-nam-pk11", "tet-nu-dau01", "tet-nu-dau02", "tet-nu-dau03", "tet-nu-dau05", "tet-nu-pk04", "tet-nu-pk11", "trungthu-nam-dau01", "trungthu-nam-dau02", "trungthu-nam-dau03", "trungthu-nam-dau04", "trungthu-nam-dau05", "trungthu-nam-pk09", "trungthu-nam-pk10", "trungthu-nam-pk11", "trungthu-nu-dau02", "trungthu-nu-dau05", "trungthu-nu-pk10", "giangsinh-nam-giay01", "muahe-nu-giay02", "giangsinh-nam-giay02", "giangsinh-nam-giay03", "giangsinh-nu-giay01", "giangsinh-nu-giay02", "giangsinh-nu-giay03", "halloween-nam-giay02", "halloween-nam-giay03", "halloween-nu-giay01", "halloween-nu-giay03", "muadong-nam-giay01", "muadong-nam-giay02", "muadong-nam-giay03", "muadong-nu-giay01", "muadong-nu-giay03", "muahe-nam-giay01", "muahe-nam-giay02", "muahe-nu-giay01", "muahe-nu-giay03", "tet-nam-giay01", "tet-nam-giay03", "tet-nu-giay01", "tet-nu-giay02", "tet-nu-giay03", "trungthu-nam-giay01", "trungthu-nam-giay02", "trungthu-nam-giay03", "trungthu-nu-giay01", "trungthu-nu-giay02", "trungthu-nu-giay03", "muahe-nam-giay03", "halloween-nam-giay01", "tet-nam-giay02", "halloween-nu-giay02", "muadong-nu-giay02", "muahe-nam-pk05", "halloween-nu-pk09", "muadong-nam-pk09", "muadong-nu-pk09", "muahe-nu-pk08", "tet-nam-pk06", "tet-nam-pk05", "giangsinh-nu-pk08", "muahe-nam-pk09", "tet-nam-pk09", "tet-nam-pk10", "trungthu-nam-pk07", "giangsinh-nam-pk07", "muadong-nam-pk05", "muadong-nam-pk10", "muahe-nam-pk07", "giangsinh-nu-pk09", "halloween-nu-pk06", "halloween-nu-pk08", "muadong-nu-pk07", "muahe-nu-pk11", "trungthu-nu-pk03", "trungthu-nu-pk05", "trungthu-nu-pk11"}
# 26/10 (chủ dự án: "làm sao tốt nhất đi" — Muse vẽ tay hỏng 3 lần): món cầm tay dùng 1 bàn tay chuẩn (nắm tay Pi lấy từ đũa sao halloween-nu-pk06,
# làm lại viền) đè lên món. Nguồn của các món này = CHỈ món, cán / thân đi qua điểm cầm (265, 590).
HAND = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_std.png")).convert("RGBA")
GRIP = {"halloween-nam-pk08", "giangsinh-nam-pk09", "halloween-nam-pk09", "halloween-nu-pk10", "muadong-nam-pk06", "muadong-nam-pk08", "giangsinh-nu-pk07", "muadong-nam-pk09", "muadong-nu-pk09", "muahe-nu-pk08", "tet-nam-pk06", "tet-nam-pk05", "giangsinh-nu-pk08", "muahe-nam-pk09", "tet-nam-pk09", "tet-nam-pk10", "trungthu-nam-pk07"}
SHOE_SCALE = {}  # 25/10: guốc tet-nu-giay02 vẽ lại đúng cỡ
LEAF_WIDE = {"giangsinh-nam-dau05", "trungthu-nam-dau03", "muahe-nam-dau05", "trungthu-nu-dau02"}
ARM_HIDE = {"muadong-nu-pk08": "trai", "muahe-nam-pk10": "trai", "tet-nu-pk05": "trai", "trungthu-nam-pk04": "trai", "trungthu-nam-pk06": "trai", "muadong-nam-pk07": "trai", "muadong-nu-pk10": "trai", "trungthu-nam-pk03": "trai", "muahe-nu-pk07": "trai",  # 26/10 chủ dự án "để ý mấy cái 2 tay": món vẽ tay giơ cầm + tay gốc buông = 2 tay → ẩn tay gốc
            "giangsinh-nam-pk07": "trai", "muadong-nam-pk08": "trai", "muadong-nu-pk08": "trai", "muahe-nam-pk05": "trai",
            "muahe-nam-pk10": "trai", "halloween-nu-pk08": "trai", "trungthu-nam-pk04": "trai", "trungthu-nam-pk06": "trai"}

# 23/10 (chủ dự án: "mặc áo vào lỗi, không có nọng cằm"): ảnh áo của Muse vẽ đè một mảng da lên phần dưới đầu → mất bóng cằm.
# Sinh lớp "đầu" = thân gốc trong hình elip của đầu (đo trên thân: tâm 384,362 · bán trục 166 x 143 ở khung 768, đáy cằm y≈505),
# vẽ ĐÈ lên áo (dưới khăn cổ / mặt) → cằm luôn là cằm gốc, cổ áo nằm dưới cằm. Không sửa ảnh món.
HEAD_E = (512 * K, 483 * K, 221 * K, 191 * K)
ell = (((xx - HEAD_E[0]) / HEAD_E[2]) ** 2 + ((yy - HEAD_E[1]) / HEAD_E[3]) ** 2 <= 1).astype(np.float32)
ell = cv2.GaussianBlur(ell, (0, 0), 2)
head = body.copy(); head[..., 3] = (body[..., 3] * ell).astype(np.uint8)
total += put("body/pi_dau.webp", im=Image.fromarray(head), q=86)

# 24/10 soát mắt: món (không phải đồ cầm tay) còn nét viền lơ lửng dính vào món → dọn như đồ cầm tay (cả ngoài thân)
CLEAN_STRAY_EXTRA = {"muadong-nam-ao01"}
items = []
# 25/10 (chủ dự án chốt): balo / túi đeo lưng → ô "Túi" đeo chéo, vẽ đè lên áo (Pi luôn quay mặt trước, đồ sau lưng chỉ lộ vài mẩu)
TUI = {"giangsinh-nam-pk12": "Túi người tuyết đeo chéo", "muadong-nam-pk11": "Túi len nâu đeo chéo", "trungthu-nam-pk11": None,
       "tet-nam-pk11": None, "tet-nu-pk11": None, "muahe-nam-pk12": "Túi chống nước xanh đeo chéo"}
for it in cat["items"]:
    s = os.path.join(SRC, it["file"])
    if not os.path.exists(s): print("thiếu", it["file"]); continue
    m = re.search(r"do_(\w+?)_(nam|nu)_([a-z]+)(\d+)\.webp$", it["file"])
    iid = f"{it['ev']}-{it['g']}-{m.group(3)}{m.group(4)}"
    if iid in TUI:
        it = {**it, "slot": "tui", **({"name": TUI[iid]} if TUI[iid] else {})}
    total += put(it["file"], src=s)
    im = Image.open(s).convert("RGBA")
    if iid in GRIP:  # 26/10: món cầm cán / thân — Muse chỉ vẽ món, build đặt BÀN TAY CHUẨN lên trên (scripts/pi/hand_std.png, nắm ở đầu tay trái buông)
        im = im.copy(); im.alpha_composite(HAND.resize(im.size, Image.LANCZOS)); total += put(it["file"], im=im, q=90)
    if (it["slot"] in ("tay", "gang") and iid not in STANDALONE) or iid in CLEAN_STRAY_EXTRA:  # 25/10: món cầm tay vẽ riêng (có bàn tay Pi) → không gọt
        a_, n_ = clean_tay(np.asarray(im), (body[..., 3] > 128) if iid not in CLEAN_STRAY_EXTRA else (body[..., 3] > -1))
        if n_ >= 40: im = Image.fromarray(a_); total += put(it["file"], im=im, q=90)
    if it["slot"] in ("tay", "gang") and iid not in STANDALONE:  # 24/10 soát từng món: mẩu da xanh rời nằm dưới tầm tay (chổi halloween-nam-pk07 lòi mẩu cạnh chân)
        _a = np.asarray(im).copy(); _n, _lab, _st, _ = cv2.connectedComponentsWithStats((_a[..., 3] > 60).astype(np.uint8), 8)
        _big = _st[1:, 4].max() if _n > 1 else 0; _rm = np.zeros(_a.shape[:2], bool)
        for _k in range(1, _n):
            if _st[_k, 4] < min(1500, _big) and _st[_k, 1] * N / 768 >= 640 * N / 768 and blue_mask(_a[..., :3])[_lab == _k].mean() > 0.8: _rm |= _lab == _k
        if _rm.any():
            _rm = cv2.dilate(_rm.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0; _a[_rm, 3] = 0; im = Image.fromarray(_a); total += put(it["file"], im=im, q=90)
    if it["slot"] == "giay" and iid not in STANDALONE:  # 24/10 soát từng món: giày tối màu tách nền lỗi → viền trắng răng cưa + mảng da chân dán đè cổ giày
        _a = np.asarray(im).copy(); _op = _a[..., 3] > 100
        if _op.any() and np.median(_a[_op][:, :3].astype(int).mean(-1)) < 80:
            _hsv = cv2.cvtColor(np.ascontiguousarray(_a[..., :3]), cv2.COLOR_RGB2HSV)
            _empty = (_a[..., 3] < 60).astype(np.uint8)
            _edge = cv2.dilate(_empty, np.ones((7, 7), np.uint8)) > 0
            _wh = (_a[..., 3] > 0) & (_hsv[..., 1] < 50) & (_hsv[..., 2] > 150) & _edge
            _sk = (_a[..., 3] > 0) & blue_mask(_a[..., :3]) & (_hsv[..., 2] > 170) & (body[..., 3] > 200)   # da chân (xanh SÁNG; xanh navy tối là bóng da giày) dán kèm: thân thật nằm ngay dưới → bỏ cho lộ chân thật
            _rm = _wh | _sk
            if _rm.sum() > 50:
                _a[_rm, 3] = 0; im = Image.fromarray(_a); total += put(it["file"], im=im, q=90); print("làm sạch giày", iid, int(_wh.sum()), int(_sk.sum()))
    if it["slot"] == "lung":  # 24/10 soát từng món: đồ lưng khoét rộng hơn thân (áo choàng len) → khe hở lộ nền ôm quanh người; lấp khe hẹp bằng màu viền Pi
        _a = np.asarray(im).copy(); _b = body[..., 3] > 128
        _U = ((_a[..., 3] > 100) | _b).astype(np.uint8)
        _C = cv2.morphologyEx(_U, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))) > 0
        _band = (cv2.dilate(_b.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0) & ~_b
        _gap = _C & ~(_U > 0) & _band
        if _gap.sum() > 150:
            _lum = body[..., :3].astype(int).mean(-1); _a[_gap, :3] = np.median(body[(body[..., 3] > 200) & (_lum < 70)][:, :3], 0).astype(np.uint8); _a[_gap, 3] = 255
            im = Image.fromarray(_a); total += put(it["file"], im=im, q=90); print("lấp khe lưng", iid, int(_gap.sum()))
    if it["slot"] in ("ao", "co", "lung", "mat") and LEAF is not None:  # 24/10: mắt (kính) còn viền đầu mờ quanh mặt  # 24/10 (pi_fix_6): áo / cổ / lưng cũng còn chấm mờ lơ lửng
        _a, _g = fix_hat(np.asarray(im), LEAF[..., 3])
        if _g: im = Image.fromarray(_a); total += put(it["file"], im=im, q=90)
    if it["slot"] in ("dau", "toc") and LEAF is not None and iid not in STANDALONE:  # 24/10: kẹp tóc cũng còn viền lá ma / lá vẽ đúp
        _a, _g = fix_hat(np.asarray(im), LEAF[..., 3], leaf=True, wide=iid in LEAF_WIDE)
        if _g: im = Image.fromarray(_a); total += put(it["file"], im=im, q=90)
    bb = im.getbbox()
    if not bb: print("ảnh rỗng", it["file"]); continue
    pad = 10
    crop = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(N, bb[2] + pad), min(N, bb[3] + pad)))
    sq_n = max(crop.size); sq = Image.new("RGBA", (sq_n, sq_n), (0, 0, 0, 0)); sq.alpha_composite(crop, ((sq_n - crop.size[0]) // 2, (sq_n - crop.size[1]) // 2))
    total += put(f"icon/{iid}.webp", im=sq.resize((ICON_PX, ICON_PX), Image.LANCZOS))
    row = {"id": iid, "ev": it["ev"], "g": it["g"], "slot": it["slot"], "name": it["name"], "file": it["file"],
           "c": [round((bb[0] + bb[2]) / 2), round((bb[1] + bb[3]) / 2)]}  # 24/10: tâm món (gốc xoay / phóng khi Quản trị chỉnh vị trí)
    if iid in SHOE_SCALE:  # 24/10 soát từng món: guốc vẽ to gấp đôi chân → thu nhỏ quanh tâm, giữ đáy chạm chân
        _s = SHOE_SCALE[iid]; _cy = row["c"][1]; _yb = bb[3]
        row["tf0"] = {"x": 0, "y": round(_yb - (_cy + (_yb - _cy) * _s)), "s": _s, "w": 1, "h": 1, "r": 0, "fx": False}
    if it["slot"] == "dau" and iid in STANDALONE and not re.search(r"^(vương miện|băng đô|vòng|kẹp|cài|nơ|dây|trâm|bờm|bịt tai|kính)", it["name"], re.I):
        row["cover"] = True  # 24/10: CHỈ mũ vẽ riêng (STANDALONE) trùm đầu → app ẩn hẳn lá; mũ cũ khoét chỗ lá → giữ lá đè lên (ẩn lá lộ mép khoét)
    if it["slot"] == "dau" and iid not in STANDALONE:  # 24/10: tự canh cỡ / vị trí mũ trùm cho vừa đầu (tf0); mũ vẽ riêng đã đúng chỗ → không canh
        _tf = hat_tf(np.asarray(im), body[..., 3], it["name"], row["c"])
        if _tf: row["tf0"] = _tf
    if it["slot"] in ("tay", "gang"):
        # 23/10: TẮT ẩn tay gốc — soát mắt 25 món của bộ sạch: món tay vẽ khớp tay gốc, ẩn đi chỉ lộ lỗ / mất tay. Giữ hàm để dùng lại nếu bộ sau vẽ tay giơ lên thật.
        if iid in STANDALONE:  # 25/10: món vẽ riêng — bàn tay Pi vẽ ở đầu tay buông → thân cụt đầu tay bên đó
            _a = np.asarray(im); _sk = (_a[..., 3] > 128) & blue_mask(_a[..., :3])
            for _sd in ("trai", "phai"):
                _z = cv2.dilate(TIP[_sd].astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
                if (_sk & _z).sum() * 768 * 768 // (_a.shape[0] * _a.shape[1]) >= 300: row["arm"] = "dau" + _sd; break
        side = None if iid in STANDALONE else ARM_HIDE.get(iid) or (raised_arm(np.asarray(im)) if os.environ.get("PI_HIDE_ARM") else None)
        if side:
            row["arm"] = side
            _a, _n = fill_gap(np.asarray(im), ARMLESS[side], side)  # lấp khe hở giữa tay của món và vai thân cụt tay
            if _n: total += put(it["file"], im=Image.fromarray(_a), q=90)
    items.append(row)

rooms = {}
for ev in EVENTS:
    for t in TIMES:
        p = os.path.join(SRC, "rooms", f"phong_{ev}_{t}.webp")
        if not os.path.exists(p): print("thiếu phòng", ev, t); continue
        im = Image.open(p).convert("RGB")
        total += put(f"rooms/phong_{ev}_{t}.webp", im=im.resize((ROOM_W, round(im.size[1] * ROOM_W / im.size[0])), Image.LANCZOS), q=78)
        rooms.setdefault(ev, []).append(t)

man = {
    "v": 2, "canvas": N, "feet": cat.get("anchor_feet", [N / 2, N * 0.9375]), "bbox": bbox, "room": [ROOM_W, ROOM_W * 3 // 2],
    "events": {k: v["name"] for k, v in cat["events"].items()},
    "slots": {**cat["slots"], "tui": "Túi"},
    # 24/10 pi_full: mieng = miệng khi nói (mat_pi lúc đó là mắt không miệng), la = lá đè lên mũ
    "order": ["lung", "than", "giay", "ao", "dau_pi", "tui", "co", "mat_pi", "mieng", "mat", "toc", "dau", "la", "gang", "tay"],
    "visemes": sorted(f[:-5] for f in os.listdir(os.path.join(SRC, "mouths", "nam"))) if os.path.isdir(os.path.join(SRC, "mouths")) else [],
    "leaf": bool(LEAF is not None),
    # món chờ vẽ lại theo catalog (redo: "do_halloween_nu_ao04 (…)") → app không bán
    "redo": [re.sub(r"^do_(\w+?)_(nam|nu)_([a-z]+\d+).*$", r"\1-\2-\3", r.split(" ")[0]) for r in cat.get("redo", [])],
    "faces": cat["faces"]["list"], "rooms": rooms, "items": items,
}
# 24/10 pi_full mục 4–5: giọng thu sẵn (voice/samples/<nam|nu>/<id>.mp3 + index.json) và bộ câu thoại (game/pi_chat_lines.json)
PKG = os.path.dirname(os.path.abspath(SRC))
vidx = os.path.join(PKG, "voice", "samples", "index.json")
if os.path.exists(vidx):
    ids = []
    for row in json.load(open(vidx, encoding="utf-8")):
        ok = True
        for g in ("nam", "nu"):
            f = os.path.join(PKG, "voice", "samples", g, f"{row['id']}.mp3")
            if os.path.exists(f): total += put(f"voice/{g}/{row['id']}.mp3", src=f)
            else: ok = False; print("thiếu giọng", g, row["id"])
        if ok: ids.append(row["id"])
    json.dump({"ids": sorted(ids)}, open(os.path.join(ROOT, "src", "pi", "voice.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"giọng thu sẵn: {len(ids)} câu x 2 bản")
lines_src = os.path.join(PKG, "game", "pi_chat_lines.json")
if os.path.exists(lines_src):
    shutil.copyfile(lines_src, os.path.join(ROOT, "src", "pi", "chatLines.json"))
persona = os.path.join(PKG, "game", "pi_persona_prompt.md")
if os.path.exists(persona):
    shutil.copyfile(persona, os.path.join(ROOT, "src", "pi", "persona.md"))

# 24/10: mã phiên bản bộ ảnh = băm nội dung mọi file trong public/pi → app gắn ?v= vào đường dẫn (điện thoại không giữ ảnh cũ trùng tên)
import hashlib
_h = hashlib.sha1()
for _dp, _, _fs in sorted(os.walk(OUT)):
    for _f in sorted(_fs):
        _h.update(_f.encode()); _h.update(open(os.path.join(_dp, _f), "rb").read())
man["ver"] = _h.hexdigest()[:10]
os.makedirs(os.path.dirname(MAN), exist_ok=True)
json.dump(man, open(MAN, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(items)} món ({sum(1 for x in items if x.get('arm'))} ẩn tay gốc), {sum(len(v) for v in rooms.values())} phòng, thân {bbox}, ảnh {total/1024/1024:.1f} MB")

# 23/10 (chủ dự án): mỗi lần ghép bộ ảnh là soát khớp TỪNG món với thân luôn (món lỗi → src/pi/fit.json, app tạm không bán)
import subprocess
subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "pi", "fit_check.py")], check=True)
