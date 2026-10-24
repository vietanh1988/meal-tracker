# 24/10 (soát từng món): món giơ tay dùng thân cụt tay → khe hở trong suốt giữa tay của món và vai thân (lộ nền trắng).
# Lấp khe: vùng vai, chỗ đóng kín (closing) của (thân ∪ món) mà cả hai đều trống → tô bằng màu lân cận (inpaint) vào ảnh món.
import numpy as np, cv2

def fill_gap(item, body, side="trai", k=41):
    a = item.copy(); H, W = a.shape[:2]
    zone = np.zeros((H, W), bool)
    x0, x1 = (240, 345) if side == "trai" else (W - 345, W - 240)
    zone[430:640, x0:x1] = True
    U = ((a[..., 3] > 128) | (body[..., 3] > 128)).astype(np.uint8)
    C = cv2.morphologyEx(U, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) > 0
    # lỗ kín trong (thân ∪ món) ở vùng vai (nách bị tay của món khép lại) cũng lấp
    inv = (1 - U).astype(np.uint8); ff = inv.copy(); cv2.floodFill(ff, None, (0, 0), 2)
    holes = (ff == 1)
    gap = (C | holes) & ~(U > 0) & zone & (a[..., 3] < 128)
    hsv = cv2.cvtColor(np.ascontiguousarray(body[..., :3]), cv2.COLOR_RGB2HSV)
    skin = (body[..., 3] > 200) & (hsv[..., 0] >= 95) & (hsv[..., 0] <= 125) & (hsv[..., 2] > 150) & zone
    col = np.median(body[skin][:, :3], 0) if skin.any() else np.array([110, 190, 245])
    a[gap, :3] = col.astype(np.uint8); a[gap, 3] = 255
    # mép da của tay món giáp khoảng trống mà chưa có nét viền (tay bị cắt theo tay gốc) → vẽ viền tối 2px
    ihsv = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2HSV)
    iskin = (a[..., 3] > 200) & (ihsv[..., 0] >= 95) & (ihsv[..., 0] <= 125) & (ihsv[..., 2] > 150)
    empty = ((a[..., 3] < 60) & (body[..., 3] < 60)).astype(np.uint8)
    edge = iskin & (cv2.dilate(empty, np.ones((5, 5), np.uint8)) > 0) & zone
    lum = body[..., :3].astype(int).mean(-1)
    ocol = np.median(body[(body[..., 3] > 200) & (lum < 70)][:, :3], 0).astype(np.uint8)
    a[edge, :3] = ocol
    n = int(gap.sum()) + int(edge.sum())
    return a, n
