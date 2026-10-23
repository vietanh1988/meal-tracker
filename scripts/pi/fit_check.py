#!/usr/bin/env python3
"""23/10 (chủ dự án: "nhiều món lệch lắm, so khớp từng ảnh") — soát TỪNG món Pi so với thân, ghi kết quả vào src/pi/fit.json
(test tests/pet-catalog.test.mjs đọc file này: món lỗi phải nằm trong danh sách chờ vẽ lại, không thì CI đỏ).
    python3 scripts/pi/fit_check.py [--sheet <ảnh duyệt.jpg>]
Đo trên khung 768 (chân Pi y=720), thân public/pi/body/pi_than.webp, mặt public/pi/faces/<bản>/vui.webp:
  - cắt phẳng: mép thẳng đứng ≥ 40px ở đồ cầm tay (mép mảng thân dán kèm / vật bị cắt), ≥ 95px ở món khác
  - mảng thân dán kèm: da xanh của Pi nằm trong ảnh món ngoài chỗ được phép (đầu / bụng) ≥ 2500px
  - đội đầu: lệch tâm ngang · mũ không ôm đầu (viền đầu phía trên vành mũ che < 10%; 23/10 hạ từ 45%: mũ nhỏ đội đỉnh đầu kiểu chibi là đúng, soát mắt 8 món đã vẽ lại)
  - đồ cầm tay: mảng trắng tinh phẳng ≥ 100px đè lên thân (chỗ cắt bàn tay để sót)
  - kính / mặt nạ: không ôm 2 mắt · lệch tâm
  - cổ: không nằm ở vùng cổ · giày: đáy giày cách chân > 14px, cắt phẳng ≥ 60px
  - đeo lưng / áo: viền thân thừa (nét mảnh bám ngoài bóng thân) > 450px
"""
import json, os, re, sys
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
B = os.path.join(ROOT, "public", "pi")
man = json.load(open(os.path.join(ROOT, "src", "pi", "manifest.json"), encoding="utf-8"))
N = man["canvas"]; FEET = man["feet"][1]; CX = man["feet"][0]
rd = lambda p: np.asarray(Image.open(os.path.join(B, p)).convert("RGBA"))
body = rd("body/pi_than.webp"); solid = body[..., 3] > 200
yy, xx = np.mgrid[0:N, 0:N]

# hình học thân: bề rộng từng hàng; đầu = phần trên chỗ hẹp nhất (cổ) giữa y 300–560
rows = [(np.where(solid[y])[0]) for y in range(N)]
ext = [(r.min(), r.max()) if len(r) else (None, None) for r in rows]
width = np.array([(e[1] - e[0]) if e[0] is not None else 0 for e in ext])
neck = 300 + int(np.argmin(np.where(width[300:560] > 0, width[300:560], 9999)))
head_top = int(np.argmax(width > 0))
# lá trên đỉnh: hàng bắt đầu của đầu tròn = nơi bề rộng vượt 60% bề rộng lớn nhất của đầu
head_w = width[head_top:neck].max()
head_start = head_top + int(np.argmax(width[head_top:neck] > 0.6 * head_w))
HW = head_w
_hsv = cv2.cvtColor(np.ascontiguousarray(body[..., :3]), cv2.COLOR_RGB2HSV)
green = (_hsv[..., 0] > 35) & (_hsv[..., 0] < 90)
HEAD_Y = int(np.argmax([(solid[y] & ~green[y]).sum() > 0.6 * HW for y in range(N)]))  # đỉnh đầu tròn (dưới lá)
head = solid & ~green & (yy < neck) & (yy >= HEAD_Y - 12)
NEAR = (cv2.dilate(solid.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))) > 0) & ~solid
K13 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
HEAD_IN = cv2.erode(head.astype(np.uint8), np.ones((41, 41), np.uint8)) > 0

def blue_mask(rgb):
    hsv = cv2.cvtColor(np.ascontiguousarray(rgb[..., :3]), cv2.COLOR_RGB2HSV)
    return (hsv[..., 0] >= 95) & (hsv[..., 0] <= 125) & (hsv[..., 1] > 64)

# 2 mắt (mặt vui): vùng đen đậm trong vùng mặt
def eyes(g):
    f = rd(f"faces/{g}/vui.webp")
    hsv = cv2.cvtColor(np.ascontiguousarray(f[..., :3]), cv2.COLOR_RGB2HSV)
    m = ((f[..., 3] > 200) & (hsv[..., 2] < 60)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    big = sorted([i for i in range(1, n)], key=lambda i: -st[i, cv2.CC_STAT_AREA])[:2]
    return sorted([tuple(cen[i]) for i in big])
EYES = {g: eyes(g) for g in ("nam", "nu")}

def straight_cut(a):
    """mép thẳng ĐỨNG: 1 cột mà alpha đổi đặc ↔ trong suốt ≥ 40 hàng liền (vật bị cắt dọc theo mảng dán).
    Mép ngang thẳng (vành mũ, đế giày) là kiểu vẽ bình thường → không tính."""
    al = a[..., 3]
    op = al > 200
    best = 0
    for axis in (0,):
        o = op
        edge = o[:, :-1] & ~o[:, 1:] | ~o[:, :-1] & o[:, 1:]   # chuyển trạng thái giữa 2 cột liền
        # mép thẳng đứng: cùng 1 cột chuyển trạng thái nhiều hàng liền
        e = edge.T  # [cột, hàng]
        for c in range(e.shape[0]):
            col = e[c]
            if col.sum() < 40: continue
            run = mx = 0
            for v in col:
                run = run + 1 if v else 0
                mx = max(mx, run)
            best = max(best, mx)
    return best

def check(it):
    a = rd(it["file"]); al = a[..., 3] > 128
    ys, xs = np.where(al)
    out = []
    if not len(xs): return ["ảnh rỗng"]
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    cx = (x0 + x1) / 2
    s = it["slot"]
    # mép cắt thẳng đứng: đồ cầm tay ≥ 40px (mép mảng thân dán kèm / vật bị cắt); món khác ≥ 95px; đồ đeo lưng nằm sau thân → bỏ qua
    cut = straight_cut(a) if s != "lung" else 0
    if cut >= (40 if s in ("tay", "gang", "toc") else 60 if s == "giay" else 95): out.append(f"cắt phẳng {cut}px")
    # viền thân thừa: nét mảnh (< 13px) bám sát ngoài bóng thân (≤ 7px) — bản sao viền thân vẽ lẫn, lộ ra quanh người
    if s in ("lung", "ao"):
        a8 = al.astype(np.uint8)
        thin = (a8 > 0) & (cv2.morphologyEx(a8, cv2.MORPH_OPEN, K13) == 0) & NEAR
        if thin.sum() > 450: out.append(f"viền thân thừa quanh người {int(thin.sum())}px")
    skin = al & blue_mask(a) & solid
    if s in ("tay", "gang"):
        arm = solid & ((xx < 0.374 * N) | (xx > 0.633 * N)) & (yy >= 0.615 * N) & (yy <= 0.825 * N)
        arm = cv2.dilate(arm.astype(np.uint8), np.ones((11, 11), np.uint8)) > 0
        c = int((skin & ~arm).sum())
        if c > 2500: out.append(f"dán kèm mảng thân {c}px")
        # 23/10 (soát bộ pi_fix_53): Muse cắt chỗ bàn tay rồi để lại mảng TRẮNG TINH phẳng đè lên thân cạnh tay
        wt = (a[..., 3] > 200) & (s == "tay") & (a[..., :3].min(-1) >= 253)
        n, lab, st, _ = cv2.connectedComponentsWithStats(wt.astype(np.uint8), 8)
        wp = [int(st[k, 4]) for k in range(1, n) if st[k, 4] >= 100 and solid[lab == k].mean() > 0.5]
        if wp: out.append(f"mảng trắng thừa cạnh tay {max(wp)}px")
    if s in ("dau",):
        if abs(cx - CX) > 0.05 * HW * 1.2 and (x1 - x0) > 0.5 * HW: out.append(f"lệch tâm {cx - CX:+.0f}px")
        # mũ / băng đô: so với vùng đầu (thân trừ lá) phía trên vành (hàng thấp nhất món còn che cột giữa).
        # Viền đầu 20px bên trong bóng đầu phải được món che phần lớn — lộ nhiều = mũ nhỏ / hẹp hơn đầu, thấy đầu xanh 2 bên
        col = al[:neck, int(CX)]
        if col[HEAD_Y:].any():
            yb = HEAD_Y + int(np.where(col[HEAD_Y:])[0].max())
            R = head & (yy < yb)
            ring = R & ~HEAD_IN
            cov = (al & R).sum() / max(1, R.sum()); ec = (al & ring).sum() / max(1, ring.sum())
            band_type = re.search(r"^(vương miện|băng đô|vòng|kẹp|cài|nơ|dây)", it["name"], re.I)  # đeo quanh / trên đầu, không trùm
            if cov > 0.3 and ec < 0.10 and not band_type: out.append(f"mũ không ôm đầu (che viền đầu {ec:.0%})")
    if s == "mat":
        ok = all(x0 - 4 <= ex <= x1 + 4 and y0 - 4 <= ey <= y1 + 4 for ex, ey in EYES[it["g"]])
        if not ok: out.append("không ôm 2 mắt")
        if abs(cx - CX) > 0.06 * HW: out.append(f"lệch tâm {cx - CX:+.0f}px")
    if s == "co":
        cy = (y0 + y1) / 2
        if not (neck - 50 <= cy <= neck + 110): out.append(f"không ở cổ (giữa y={cy:.0f}, cổ {neck})")
        if abs(cx - CX) > 0.08 * HW: out.append(f"lệch tâm {cx - CX:+.0f}px")
    if s == "giay":
        if abs(y1 - FEET) > 14: out.append(f"đáy giày cách chân {y1 - FEET:+.0f}px")
    return out

# 24/10 duyệt bằng mắt (bộ pi_fix_30): OK = báo nhầm (vật vốn có cạnh thẳng đứng); BAD = lỗi máy không bắt được
# (24/10: bộ pi_full thay 234 món → duyệt mắt lại từ đầu; ghi vào đây món nào duyệt xong)
EYE_OK = {"tet-nam-pk08": "cuộn thư dựng đứng (bản fix_30 đã duyệt)", "muahe-nu-pk05": "ly thẳng thành (bản fix_30 đã duyệt)"}
EYE_BAD = {}
res = {}
for it in man["items"]:
    r = [] if it["id"] in EYE_OK else check(it)
    if it["id"] in EYE_BAD: r = r + [EYE_BAD[it["id"]]]
    if r: res[it["id"]] = r
for rid in man.get("redo", []):  # catalog của Muse ghi món chờ vẽ lại
    res.setdefault(rid, []).append("Muse ghi chờ vẽ lại (redo)")
geo = {"neck": neck, "head_top": HEAD_Y, "head_w": int(HW), "eyes": EYES}
json.dump({"geo": {k: (v if k != "eyes" else {g: [[round(x), round(y)] for x, y in e] for g, e in v.items()}) for k, v in geo.items()}, "bad": res},
          open(os.path.join(ROOT, "src", "pi", "fit.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"cổ y={neck}, đỉnh đầu y={HEAD_Y}, đầu rộng {HW}px, mắt {EYES}")
print(f"{len(res)} / {len(man['items'])} món có lỗi")
from collections import Counter
print(Counter(r.split(" ")[0] + " " + r.split(" ")[1] for v in res.values() for r in v))

if "--sheet" in sys.argv:
    out = sys.argv[sys.argv.index("--sheet") + 1]
    from PIL import ImageDraw
    ids = list(res)
    cols, W, H = 8, 220, 260
    sheet = Image.new("RGB", (cols * W, max(1, (len(ids) + cols - 1) // cols) * H), "white"); d = ImageDraw.Draw(sheet)
    byid = {x["id"]: x for x in man["items"]}
    for i, iid in enumerate(ids):
        it = byid[iid]
        im = Image.new("RGBA", (N, N), (238, 243, 250, 255))
        for L in man["order"]:
            f = (f"body/pi_than{'_khong_tay_' + it['arm'] if it.get('arm') else ''}.webp" if L == "than" else f"faces/{it['g']}/vui.webp" if L == "mat_pi" else it["file"] if L == it["slot"] else None)
            if f: im.alpha_composite(Image.open(os.path.join(B, f)).convert("RGBA"))
        x, y = (i % cols) * W, (i // cols) * H
        sheet.paste(im.crop((110, 60, 658, 740)).resize((W, H - 30)).convert("RGB"), (x, y))
        d.text((x + 2, y + H - 29), iid, fill=(0, 0, 0)); d.text((x + 2, y + H - 16), "; ".join(res[iid])[:40], fill=(200, 0, 0))
    sheet.save(out, quality=82)
