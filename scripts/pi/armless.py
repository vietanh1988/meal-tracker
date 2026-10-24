# 24/10 (chủ dự án: món cầm hộp quà ra 2 tay) — thân Pi bỏ 1 cánh tay cho đồ cầm tay vẽ cánh tay giơ lên.
# Cắt theo ĐƯỜNG NẾP tay có sẵn trên thân (nét tối giữa tay và mình, đo từng hàng), chỗ vai không có nếp thì nội suy;
# vẽ lại viền tối 3px theo màu viền gốc → mình Pi liền, không bị cắt thẳng.
import numpy as np, cv2
def armless(body, side):
    b = body.copy(); al = b[..., 3] > 128; lum = b[..., :3].astype(int).mean(-1)
    H, W = al.shape
    rng = (282, 312) if side == "trai" else (W - 312, W - 282)   # khoảng x của nếp tay (khung 768)
    y0, y1 = 470, 622
    pts = {}
    for y in range(y0, y1 + 1):
        xs = [x for x in range(rng[0], rng[1]) if al[y, x] and lum[y, x] < 95]
        if xs: pts[y] = (min(xs) if side == "trai" else max(xs))
    ys = sorted(pts)
    if len(ys) < 5: return b
    yk = np.array(ys); xk = np.array([pts[y] for y in ys], float)
    xc = np.interp(np.arange(y0, y1 + 1), yk, xk)
    xc = np.convolve(np.pad(xc, 6, mode="edge"), np.ones(13) / 13, mode="valid")  # mượt
    col = np.median(b[(b[..., 3] > 200) & (lum < 70)][:, :3], 0).astype(np.uint8)
    for i, y in enumerate(range(y0, y1 + 1)):
        c = int(round(xc[i]))
        if side == "trai":
            b[y, :c, 3] = 0
            b[y, c:c + 3, :3] = col; b[y, c:c + 3, 3] = 255
        else:
            b[y, c + 1:, 3] = 0
            b[y, c - 2:c + 1, :3] = col; b[y, c - 2:c + 1, 3] = 255
    return b
