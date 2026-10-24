# 24/10 (chủ dự án gửi ảnh: mũ lòi viền lá, thủng quanh gốc lá) — ảnh mũ bộ pi_full khoét chỗ lá + còn viền lá cũ mờ.
# Không vẽ mới: bỏ viền mờ / chấm rời (alpha thấp, không dính phần đặc của mũ). Lỗ quanh gốc lá / mép mũ cắt phẳng: phải vẽ lại
# (thử vá bằng cv2.inpaint 24/10 làm hỏng băng đô → bỏ).
import numpy as np, cv2

def drop_leaf(a, leaf_alpha, wide=False):
    """24/10 (pi_hat_60): ảnh mũ tự vẽ thêm lá lệch so với lớp lá thật → bỏ điểm xanh lá quanh lá thật (mũ màu xanh lá: chỉ sát lá)"""
    hsv = cv2.cvtColor(np.ascontiguousarray(a[..., :3]), cv2.COLOR_RGB2HSV)
    green = (a[..., 3] > 0) & (hsv[..., 0] >= 30) & (hsv[..., 0] <= 85) & (hsv[..., 1] > 60) & (hsv[..., 2] > 60)
    op = a[..., 3] > 100
    green_hat = (green & op).sum() > 0.25 * max(1, op.sum())
    zone = cv2.dilate((leaf_alpha > 40).astype(np.uint8), np.ones((9, 9) if green_hat else (81, 81) if wide else (45, 45), np.uint8)) > 0
    rm = green & zone
    # nét viền tối của lá vẽ đúp: tối, sát chỗ vừa bỏ, ngoài phần đặc của mũ
    dark = (a[..., 3] > 0) & (hsv[..., 2] < 90)
    near = cv2.dilate(rm.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    core = cv2.morphologyEx(((a[..., 3] > 200) & ~rm).astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    rm |= dark & near & zone & ~(cv2.dilate(core, np.ones((3, 3), np.uint8)) > 0)
    a[rm, 3] = 0
    return int(rm.sum())

def fix_hat(a, leaf_alpha, leaf=False, wide=False):
    a = a.copy()
    n_leaf = drop_leaf(a, leaf_alpha, wide) if leaf else 0
    al = a[..., 3]
    solid = (al >= 200).astype(np.uint8)
    # (1) viền mờ / chấm rời
    near = cv2.dilate(solid, np.ones((5, 5), np.uint8)) > 0
    ghost = (al > 0) & ~near
    n, lab, st, _ = cv2.connectedComponentsWithStats((al > 30).astype(np.uint8), 8)
    for k in range(1, n):
        if st[k, 4] < 80: ghost |= lab == k
    a[ghost, 3] = 0
    n_frag = drop_fragments(a, leaf_alpha) if leaf else 0
    return a, int(ghost.sum()) + n_leaf + n_frag

def drop_fragments(a, leaf_alpha):
    """24/10 (chủ dự án: soát từng món) — mảnh vụn của mũ cũ lòi ra ngoài lá (len xám, thanh xám, chấm xanh trên đỉnh):
    phần thấy được (ngoài lá) tách khỏi khối mũ chính và nhỏ (< 1200px và < 4% khối chính) → bỏ, kể cả phần nấp sau lá
    phía trên đỉnh khối chính (lá đung đưa sẽ lộ). Tai thỏ / gạc to hơn ngưỡng nên giữ."""
    al = a[..., 3]
    vis = ((al > 30) & ~(leaf_alpha > 40)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(vis, 8)
    if n < 3: return 0
    main = 1 + int(np.argmax(st[1:, 4])); top = st[main, 1]
    rm = np.zeros(al.shape, bool)
    for k in range(1, n):
        if k != main and st[k, 4] < min(1200, 0.04 * st[main, 4]): rm |= lab == k
    if not rm.any(): return 0
    zone = cv2.dilate(rm.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    under = (al > 0) & (leaf_alpha > 40) & zone
    under[top:, :] = False
    rm |= under | ((cv2.dilate(rm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0) & (al > 0))
    a[rm, 3] = 0
    return int(rm.sum())
