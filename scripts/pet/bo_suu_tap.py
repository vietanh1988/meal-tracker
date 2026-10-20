"""Bộ sưu tập Noel / Tết / Cổ trang (ChatGPT 20/10) → scripts/pet/bo-suu-tap.json (gen_catalog.py nối vào catalog).
Ảnh: public/pet/bo-suu-tap/<bộ>-NN.webp (đồ rời, tách nền + phóng 3×), <bộ>-ao-NN.webp (ô cửa hàng của áo),
thân mặc áo: public/pet/than-ao/than-<bản>[-khong-la]-<bộ>-ao-NN.webp (scripts/pet/bo-suu-tap/merge.py).
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage
R = 'public/pet'
B = {'nam': (588, 900), 'nu': (559, 900)}
BRIM = {'nam': 0.322, 'nu': 0.37}
CONE = {'nam': 0.27, 'nu': 0.31}
HAND = {'nam': (0.852, 0.7828), 'nu': (0.8515, 0.7828)}
BOTH = ['nam', 'nu']

def bb(file):
    im = Image.open(f'{R}/{file}'); return im, im.split()[3].point(lambda p: 255 if p > 40 else 0).getbbox()
def fitw(file, v, bottom, cw, cx=.5):
    im, (l, t, r, b) = bb(file); bw, bh = B[v]; s = cw * bw / (r - l)
    return {'x': round(cx + (im.width / 2 - (l + r) / 2) * s / bw, 4), 'y': round((bottom * bh - b * s + im.height * s / 2) / bh, 4), 'w': round(im.width * s / bw, 4)}
def fitc(file, v, cy, cw, cx=.5):
    im, (l, t, r, b) = bb(file); bw, bh = B[v]; s = cw * bw / (r - l)
    return {'x': round(cx + (im.width / 2 - (l + r) / 2) * s / bw, 4), 'y': round(cy + (im.height / 2 - (t + b) / 2) * s / bh, 4), 'w': round(im.width * s / bw, 4)}
def fitband(file, v, arc_top, end_y, cw):
    im, (l, t, r, b) = bb(file); bw, bh = B[v]; sx = cw * bw / (r - l); sy = (end_y - arc_top) * bh / (b - t)
    return {'x': round(.5 + (im.width / 2 - (l + r) / 2) * sx / bw, 4), 'y': round((arc_top * bh - t * sy + im.height * sy / 2) / bh, 4), 'w': round(im.width * sx / bw, 4), 'h': round(im.height * sy / bh, 4)}
def hold(file, v, scale=1.0):
    """Đồ cầm tay vẽ kèm bàn tay: tìm bàn tay xanh trong ảnh → tâm bàn tay trùng tâm bàn tay thân, cỡ nắm tay = cỡ tay thân."""
    im = Image.open(f'{R}/{file}').convert('RGBA'); a = np.array(im).astype(int)
    blue = (a[..., 3] > 128) & (a[..., 2] > 190) & (a[..., 0] < 175) & (a[..., 1] > 140) & (a[..., 2] - a[..., 0] > 50)
    lab, n = ndimage.label(blue); sz = ndimage.sum(blue, lab, range(1, n + 1)); m = lab == (np.argmax(sz) + 1)
    ys, xs = np.nonzero(m); fist = xs.max() - xs.min()
    hx_, hy_ = xs.mean() / im.width, ys.mean() / im.height
    bw, bh = B[v]; hx, hy = HAND[v]
    wf = im.width / fist * 0.17 * scale; hf = wf * bw * im.height / im.width / bh
    return {'x': round(hx + (0.5 - hx_) * wf, 4), 'y': round(hy + (0.5 - hy_) * hf, 4), 'w': round(wf, 4)}
FX = {'x': 0.5, 'y': 0.11, 'w': 0.92}

# (mã, tên, ô, bản, độ hiếm, cấp, kiểu đặt, tham số, cờ)
C = {
 'noel': ('Noel', [
  ('Mũ ông già Noel', 'dau', BOTH, 'rare', 2, 'cap', .80, 'cover'),
  ('Băng đô tuần lộc', 'dau', BOTH, 'common', 1, 'band', .86, 'leaf'),
  ('Mũ len Noel', 'dau', ['nam'], 'common', 1, 'cap', .74, 'cover'),
  ('Băng đô nơ Noel', 'dau', ['nu'], 'common', 1, 'band', .80, 'leaf'),
  ('Khăn len caro', 'deo', ['nam'], 'common', 1, 'scarf', None, ''),
  ('Khăn lông Noel', 'deo', ['nu'], 'common', 1, 'scarf', None, ''),
  ('Hộp quà Noel', 'cam_tay', BOTH, 'common', 1, 'hold', 1.0, ''),
  ('Gậy kẹo Noel', 'cam_tay', BOTH, 'common', 1, 'hold', 1.1, ''),
  ('Chuông Noel', 'cam_tay', ['nu'], 'common', 2, 'hold', 1.0, ''),
  ('Túi quà Noel', 'sau_lung', ['nam'], 'rare', 3, 'back', None, ''),
  ('Tuyết rơi', 'hieu_ung', BOTH, 'rare', 3, 'fx', None, ''),
  ('Sao Noel', 'hieu_ung', BOTH, 'common', 2, 'fx', None, ''),
 ], [('Áo len tuần lộc', ['nam'], 'common', 1), ('Bộ ông già Noel', ['nam'], 'legendary', 4), ('Váy Noel', ['nu'], 'rare', 2), ('Áo choàng Noel', ['nu'], 'rare', 3)]),
 'tet': ('Tết', [
  ('Khăn đóng đỏ', 'dau', ['nam'], 'common', 1, 'cap', .74, ''),
  ('Băng đô hoa mai', 'dau', ['nu'], 'common', 1, 'band', .84, 'leaf'),
  ('Nón lá', 'dau', ['nu'], 'rare', 2, 'cone', 1.0, 'noleaf'),
  ('Mũ lân', 'dau', ['nam'], 'legendary', 4, 'lion', .86, 'noleaf'),
  ('Bao lì xì', 'cam_tay', BOTH, 'common', 1, 'hold', 1.0, ''),
  ('Cành mai', 'cam_tay', ['nu'], 'common', 1, 'hold', 1.1, ''),
  ('Lồng đèn đỏ', 'cam_tay', BOTH, 'common', 2, 'hold', 1.0, ''),
  ('Bánh chưng', 'cam_tay', ['nam'], 'common', 1, 'hold', 1.0, ''),
  ('Hộp mứt Tết', 'cam_tay', BOTH, 'common', 2, 'hold', 1.0, ''),
  ('Túi gấm đỏ', 'deo', BOTH, 'common', 2, 'hip', None, ''),
  ('Pháo hoa', 'hieu_ung', BOTH, 'rare', 3, 'fx', None, ''),
  ('Hoa mai rơi', 'hieu_ung', BOTH, 'common', 2, 'fx', None, ''),
 ], [('Áo dài gấm xanh', ['nam'], 'rare', 2), ('Áo dài gấm đỏ', ['nam'], 'common', 1), ('Áo dài đỏ hoa mai', ['nu'], 'common', 1), ('Áo tứ thân vàng', ['nu'], 'rare', 3)]),
 'co-trang': ('Cổ trang', [
  ('Mũ cánh chuồn', 'dau', ['nam'], 'rare', 3, 'cap', .96, 'cover'),
  ('Mũ miện vua', 'dau', ['nam'], 'legendary', 5, 'crown', (.262, .312, .52, .58), ''),
  ('Mũ phượng', 'dau', ['nu'], 'legendary', 5, 'crown', (.262, .312, .66, .72), ''),
  ('Trâm cài hoa sen', 'dau', ['nu'], 'common', 2, 'pin', None, ''),
  ('Nón quai thao', 'dau', ['nu'], 'rare', 3, 'cone', 1.04, 'noleaf'),
  ('Quạt giấy', 'cam_tay', BOTH, 'common', 2, 'hold', 1.1, ''),
  ('Kiếm gỗ', 'cam_tay', ['nam'], 'rare', 3, 'hold', 1.0, ''),
  ('Ô giấy đỏ', 'cam_tay', ['nu'], 'rare', 3, 'hold', 1.1, ''),
  ('Cuộn thư tre', 'cam_tay', ['nam'], 'common', 2, 'hold', 1.0, ''),
  ('Bút lông', 'cam_tay', BOTH, 'common', 2, 'hold', 1.0, ''),
  ('Cánh sen bay', 'hieu_ung', BOTH, 'rare', 4, 'fx', None, ''),
  ('Mây ngũ sắc', 'hieu_ung', BOTH, 'rare', 4, 'fx', None, ''),
 ], [('Áo giao lĩnh xanh', ['nam'], 'rare', 3), ('Long bào', ['nam'], 'legendary', 6), ('Áo nhật bình hồng', ['nu'], 'rare', 3), ('Áo tấc xanh ngọc', ['nu'], 'rare', 4)]),
}
PRICE = {'common': 150, 'rare': 400, 'legendary': 1000}
out = []
for col, (label, items, outfits) in C.items():
    for i, (name, slot, vs, rar, lv, kind, p, flag) in enumerate(items, 1):
        iid = f'{col}-{i:02d}'; f = f'bo-suu-tap/{iid}.webp'
        it = {'id': iid, 'name': name, 'file': f, 'slot': slot, 'rarity': rar, 'level': lv, 'price': PRICE[rar], 'variants': vs, 'collection': col, 'collection_name': label}
        anc = {}
        for v in BOTH:  # điểm đặt cho cả 2 thân (Quản trị đổi bản được)
            if kind == 'cap': anc[v] = fitw(f, v, BRIM[v], p)
            elif kind == 'band': anc[v] = fitband(f, v, .165, .37, p)
            elif kind == 'crown': anc[v] = fitw(f, v, p[0] if v == 'nam' else p[1], p[2] if v == 'nam' else p[3])
            elif kind == 'pin': anc[v] = fitc(f, v, .19 if v == 'nam' else .22, .42, .66)
            elif kind == 'scarf': anc[v] = fitc(f, v, .67 if v == 'nam' else .655, .56 if v == 'nam' else .60)
            elif kind == 'back': anc[v] = fitc(f, v, .64, 1.0)
            elif kind == 'cone': anc[v] = fitw(f, v, CONE[v], p)  # nón rộng vành: vành ngang trán, cắt chỏm đầu cao hơn
            elif kind == 'lion': anc[v] = fitw(f, v, BRIM[v] - .04, p)
            elif kind == 'hip': anc[v] = fitc(f, v, .795, .30, .70)
            elif kind == 'hold': anc[v] = hold(f, v, p)
            else: anc[v] = dict(FX)
        it['anchor'] = anc
        if flag == 'cover': it['cover'] = True
        if flag == 'noleaf': it['hide_leaf'] = True
        if flag == 'leaf': it['behind_leaf'] = True
        if slot == 'cam_tay': it['file_hold'] = f; it['hands'] = ['phai', 'trai']
        out.append(it)
    for j, (name, vs, rar, lv) in enumerate(outfits, 1):
        iid = f'{col}-ao-{j:02d}'
        out.append({'id': iid, 'name': name, 'file': f'bo-suu-tap/{iid}.webp', 'slot': 'ao', 'rarity': rar, 'level': lv, 'price': PRICE[rar], 'variants': vs, 'collection': col, 'collection_name': label,
                    'anchor': {v: {'x': .5, 'y': .735, 'w': .98} for v in vs},
                    'body': {v: {'file': f'than-ao/than-{v}-{iid}.webp', 'file_nl': f'than-ao/than-{v}-khong-la-{iid}.webp'} for v in vs}})
json.dump(out, open("scripts/pet/bo-suu-tap.json", "w"), ensure_ascii=False, indent=1)
print(len(out))
