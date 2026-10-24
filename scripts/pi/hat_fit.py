# 24/10 (chủ dự án: "mũ lòi nhiều phần, toàn bé" / "fix triệt để mũ lệch") — tự canh vị trí mặc định cho mũ TRÙM đầu.
# Đo: đáy vành ở giữa đầu, bề rộng mũ sát vành, bề rộng đầu cùng hàng → phóng đều cho mũ rộng bằng đầu +6%, canh giữa,
# đưa đáy vành về ngay trên lông mày (y ≤ BRIM_Y). Kết quả = tf0 (app vẽ như vị trí Quản trị chỉnh; Quản trị chỉnh tay thì đè).
# Băng đô / vương miện / bịt tai / kẹp / kính / khăn voan (đeo quanh đầu) không đụng.
import re, numpy as np
BAND = re.compile(r"(^(vương miện|băng đô|vòng|kẹp|cài|nơ|dây|bịt tai|trâm|khăn voan|kính|mũ đèn lồng))|quai", re.I)  # "quai": dây quai thòng xuống làm sai đáy vành
BRIM_Y = 322          # đáy vành tối đa (ngay trên mắt, mắt ở y≈362)
def hat_tf(a, body_alpha, name, c):
    if BAND.search(name): return None
    al = a[..., 3] > 128; bd = body_alpha > 128
    cols = al[:, 330:438]
    ys = np.where(cols.any(1))[0]
    if not len(ys): return None
    yb = int(ys.max())
    best = None
    for y in range(max(0, yb - 40), yb - 3):
        xs = np.where(al[y])[0]
        if len(xs) and (best is None or xs.max() - xs.min() > best[1] - best[0]): best = (int(xs.min()), int(xs.max()), y)
    if not best: return None
    x0, x1, yw = best
    yt = min(yb, BRIM_Y) - 10
    hx = np.where(bd[yt])[0]
    if not len(hx): return None
    hw, w = int(hx.max() - hx.min()), x1 - x0
    s = 1.0
    if w < hw * 1.0: s = min(1.5, hw * 1.06 / max(1, w))
    ty_target = min(yb * 1.0, BRIM_Y) if yb > BRIM_Y else yb   # vành sụp che mắt → đẩy lên
    if s == 1.0 and ty_target == yb: return None
    cx, cy = c; mx = (x0 + x1) / 2
    tx = round(384 - (cx + s * (mx - cx)))
    ty = round(ty_target - (cy + s * (yb - cy)))
    return {"x": tx, "y": ty, "s": round(s, 3), "w": 1, "h": 1, "r": 0, "fx": False}
