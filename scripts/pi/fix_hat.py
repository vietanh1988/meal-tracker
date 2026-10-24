# 24/10 (chủ dự án gửi ảnh: mũ lòi viền lá, thủng quanh gốc lá) — ảnh mũ bộ pi_full khoét chỗ lá + còn viền lá cũ mờ.
# Không vẽ mới: bỏ viền mờ / chấm rời (alpha thấp, không dính phần đặc của mũ). Lỗ quanh gốc lá / mép mũ cắt phẳng: phải vẽ lại
# (thử vá bằng cv2.inpaint 24/10 làm hỏng băng đô → bỏ).
import numpy as np, cv2

def fix_hat(a, leaf_alpha):
    a = a.copy(); al = a[..., 3]
    solid = (al >= 200).astype(np.uint8)
    # (1) viền mờ / chấm rời
    near = cv2.dilate(solid, np.ones((5, 5), np.uint8)) > 0
    ghost = (al > 0) & ~near
    n, lab, st, _ = cv2.connectedComponentsWithStats((al > 30).astype(np.uint8), 8)
    for k in range(1, n):
        if st[k, 4] < 80: ghost |= lab == k
    a[ghost, 3] = 0
    return a, int(ghost.sum())
