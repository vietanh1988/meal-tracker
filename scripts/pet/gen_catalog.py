"""Sinh src/pet/catalog.json: món đồ + điểm đặt (tỉ lệ theo thân).
anchor: x, y = tâm món (phần của rộng / cao thân), w = rộng món (phần của rộng thân).
"""
import json, sys

OUT = sys.argv[1]

NAMES = {
 'ao-roi': ['Áo khoác thể thao xanh','Áo khoác trắng','Áo hoodie xanh đậm','Áo vest học sinh','Bộ phi hành gia','Áo khoác jean','Khăn len xanh',
            'Áo hoodie hồng','Áo len kem','Váy vàng','Váy trắng nơ','Váy tím công chúa','Áo khoác hồng tim'],
 'doi-dau': ['Mũ lưỡi trai xanh','Mũ lưỡi trai đen','Mũ lưỡi trai xanh trắng','Mũ tai bèo be','Mũ tai bèo xanh rêu','Mũ lưỡi trai đen trắng',
             'Nơ hồng to','Mũ rơm hoa','Mũ lưỡi trai hồng','Băng đô tai mèo','Vương miện vàng','Vương miện hồng ngọc'],
 'kinh-tai-nghe': ['Kính tròn đen','Kính râm đen','Kính râm xanh','Tai nghe xanh','Tai nghe đen','Kính tim hồng','Kính tròn hồng',
                   'Kính râm nâu','Tai nghe hồng','Tai nghe tai mèo'],
 'phu-kien': ['Balo xanh','Túi đeo hông','Chai nước suối','Bình thể thao xanh','Bình giữ nhiệt inox','Quả tạ','Chùm bóng xanh','Ván trượt xanh',
              'Balo hồng','Túi xách hồng','Giỏ hoa','Bình giữ nhiệt hồng','Khăn quàng hồng','Ván trượt hồng','Hoa cúc trắng'],
 'hieu-ung': ['Tim xanh','Ngôi sao','Lấp lánh','Tia nước','Đồng xu','Cúp vàng','Vòng nước','Mây trắng','Mây bông','Gió mát','Tim hồng',
              None,'Hoa anh đào',None,None,None,'Cầu vồng'],
}

HEADPHONES = {4, 5, 9, 10}
SLOT_PK = {1:'sau_lung',9:'sau_lung',2:'deo',13:'deo',8:'duoi_chan',14:'duoi_chan'}

# độ hiếm
LEGEND = {'doi-dau-11','doi-dau-12','ao-roi-05','ao-roi-12','hieu-ung-17','hieu-ung-06','kinh-tai-nghe-10','phu-kien-08'}
RARE = {'ao-roi-03','ao-roi-04','ao-roi-06','ao-roi-10','ao-roi-11','doi-dau-05','doi-dau-08','doi-dau-10','kinh-tai-nghe-04',
        'kinh-tai-nghe-05','kinh-tai-nghe-06','kinh-tai-nghe-09','phu-kien-01','phu-kien-09','phu-kien-14','phu-kien-07',
        'hieu-ung-03','hieu-ung-05','hieu-ung-11','hieu-ung-13'}

def A(x, y, w, **k):
    d = {'x': x, 'y': y, 'w': w}; d.update(k); return d

items = []
for folder, names in NAMES.items():
    for i, name in enumerate(names, 1):
        if not name: continue
        iid = f'{folder}-{i:02d}'
        if folder == 'ao-roi':
            slot = 'deo' if i == 7 else 'ao'
            variants = ['nam', 'nu'] if i == 7 else ['nam'] if i <= 7 else ['nu']
        elif folder == 'doi-dau': slot = 'dau'; variants = ['nam', 'nu']
        elif folder == 'kinh-tai-nghe': slot = 'tai_nghe' if i in HEADPHONES else 'kinh'; variants = ['nam', 'nu']
        elif folder == 'phu-kien': slot = SLOT_PK.get(i, 'cam_tay'); variants = ['nam', 'nu']
        else: slot = 'hieu_ung'; variants = ['nam', 'nu']
        rarity = 'legendary' if iid in LEGEND else 'rare' if iid in RARE else 'common'
        items.append({'id': iid, 'name': name, 'file': f'{folder}/{iid}.webp', 'slot': slot, 'rarity': rarity, 'variants': variants})

# cấp mở + giá theo bảng chốt 20/10
plan = {'common': [1]*12 + [2]*6 + [3]*6 + [4]*6 + [5]*5,
        'rare': [3]*4 + [4]*4 + [5]*4 + [6]*4 + [7]*4,
        'legendary': [5] + [6]*2 + [7] + [8]*2 + [9] + [10]}
price_common = {1: 100, 2: 120, 3: 150, 4: 180, 5: 200}
for r in plan:
    lst = [it for it in items if it['rarity'] == r]
    assert len(lst) == len(plan[r]), (r, len(lst))
    for it, lv in zip(lst, plan[r]):
        it['level'] = lv
        it['price'] = price_common[lv] if r == 'common' else 400 if r == 'rare' else 1000

# điểm đặt (chỉnh tay sau khi soát ảnh ghép)
# Balo: quai đeo vẽ riêng (ChatGPT 20/10), nằm đè lên áo ở lớp 'quai'; balo vẫn ở lớp sau lưng
QUAI = {'phu-kien-01': 'phu-kien/phu-kien-01-quai-', 'phu-kien-09': 'phu-kien/phu-kien-09-quai-'}
ANCH = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
EYE_Y = {'nam': 0.345, 'nu': 0.40}
def default(it, v):
    s = it['slot']
    if s == 'dau': return A(0.5, 0.165 if v == 'nam' else 0.19, 0.80)
    if s == 'kinh': return A(0.5, EYE_Y[v], 0.52 if v == 'nam' else 0.56)
    if s == 'tai_nghe': return A(0.5, 0.36, 1.06)
    if s == 'ao': return A(0.5, 0.735, 0.98)
    if s == 'deo': return A(0.5, 0.64, 0.6)
    if s == 'sau_lung': return A(0.8, 0.66, 0.42)
    if s == 'duoi_chan': return A(0.5, 0.965, 0.95)
    if s == 'cam_tay': return A(0.9, 0.74, 0.24)
    return A(0.85, 0.2 if v == 'nam' else 0.29, 0.28)
# Đồ cầm tay vẽ kèm bàn tay đang nắm (ChatGPT 20/10): đặt tâm bàn tay trong ảnh trùng tâm bàn tay của thân.
# Cỡ: 100 px trên tấm vẽ = 0,15 bề rộng thân (bàn tay vẽ lớn hơn tay thân một chút để che kín).
HOLD = json.load(open('scripts/pet/hands.json'))
HOLD_SCALE = {'phu-kien-06': 1.2, 'phu-kien-07': 1.6, 'phu-kien-15': 1.3, 'phu-kien-03': 1.1, 'phu-kien-04': 1.1, 'phu-kien-05': 1.1, 'phu-kien-12': 1.1}  # chùm bóng bay to hơn, hoa to hơn chút
BODY_HAND = {'nam': (0.852, 0.7828, 588, 900), 'nu': (0.8515, 0.7828, 559, 900)}
# 20/10 chốt: kho đồ theo bản Pi — Pi nam chỉ thấy đồ nam + đồ chung, Pi nữ chỉ thấy đồ nữ + đồ chung (đồ thành tích đều là đồ chung)
ONLY_NAM = {'doi-dau-01', 'doi-dau-02', 'doi-dau-03', 'doi-dau-05', 'doi-dau-06', 'kinh-tai-nghe-01', 'kinh-tai-nghe-02', 'kinh-tai-nghe-03',
            'kinh-tai-nghe-08', 'kinh-tai-nghe-04', 'kinh-tai-nghe-05', 'phu-kien-01', 'phu-kien-04', 'phu-kien-06', 'phu-kien-07', 'phu-kien-08',
            'ao-roi-07', 'hieu-ung-01', 'hieu-ung-10'}
ONLY_NU = {'doi-dau-07', 'doi-dau-08', 'doi-dau-09', 'doi-dau-10', 'doi-dau-12', 'kinh-tai-nghe-06', 'kinh-tai-nghe-07', 'kinh-tai-nghe-09',
           'kinh-tai-nghe-10', 'phu-kien-09', 'phu-kien-10', 'phu-kien-11', 'phu-kien-12', 'phu-kien-13', 'phu-kien-14', 'phu-kien-15',
           'hieu-ung-11', 'hieu-ung-13'}
COVER = {f'doi-dau-{i:02d}' for i in (1, 2, 3, 4, 5, 6, 8, 9)}  # mũ trùm kín đỉnh đầu → ẩn lá + chỏm đầu dưới mũ
for it in items:
    if it['id'] in COVER: it['cover'] = True
    if it['slot'] == 'ao':  # 20/10: áo vẽ liền thân (ChatGPT) + đầu gốc ghép đè → mặc áo thì thay cả thân; ảnh món = phần thân mặc áo (ô cửa hàng)
        it['body'] = {v: {'file': f"than-ao/than-{v}-{it['id']}.webp", 'file_nl': f"than-ao/than-{v}-khong-la-{it['id']}.webp"} for v in it['variants']}
    if it['id'] in ('doi-dau-10', 'kinh-tai-nghe-04', 'kinh-tai-nghe-05', 'kinh-tai-nghe-09', 'kinh-tai-nghe-10'): it['behind_leaf'] = True  # vòng qua đỉnh đầu, đi SAU cuống lá
    if it['id'] in QUAI:
        it['front'] = [{'file': QUAI[it['id']] + 'trai.webp', **A(0.30, 0.712, 0.22)}, {'file': QUAI[it['id']] + 'phai.webp', **A(0.70, 0.712, 0.22)}]
    if it['id'] == 'phu-kien-02':
        it['name'] = 'Túi đeo hông'; it['anchor'] = {v: A(0.5, 0.80, 0.70) for v in it['variants']}; continue  # bản vẽ lại 20/10: nhìn thẳng, có dây quanh eo
    if it['slot'] == 'cam_tay':
        it['hands'] = ['phai', 'trai']   # luật 20/10: mọi đồ cầm tay cầm được ở tay trái hoặc tay phải, cả nam lẫn nữ; tay trái dùng ảnh lật ngang
    if it['id'] in HOLD:
        hd = HOLD[it['id']]; it['file_hold'] = hd['file']; it['anchor'] = {}
        if hd.get('icon'): it['file'] = hd['file']  # bản vẽ lại 20/10 khác món cũ → ô cửa hàng dùng luôn ảnh cầm
        for v in it['variants']:
            hx, hy, bwp, bhp = BODY_HAND[v]
            wf = hd['src_w'] / hd.get('fist', 113.3) * 0.17 * HOLD_SCALE.get(it['id'], 1); hf = wf * bwp * hd['src_h'] / hd['src_w'] / bhp
            it['anchor'][v] = A(round(hx + (0.5 - hd['hand_x']) * wf, 4), round(hy + (0.5 - hd['hand_y']) * hf, 4), round(wf, 4))
        continue
    over = ANCH.get(it['id'], {})
    it['anchor'] = {}
    for v in it['variants']:
        a = default(it, v); a.update(over.get('all', {})); a.update(over.get(v, {}))
        it['anchor'][v] = a

# chia kho theo bản SAU khi đã tính điểm đặt cho cả 2 thân → Quản trị đổi Nam / Nữ / Cả hai vẫn có điểm đặt
for it in items:
    if it['id'] in ONLY_NAM: it['variants'] = ['nam']
    elif it['id'] in ONLY_NU: it['variants'] = ['nu']

# bộ sưu tập Noel / Tết / Cổ trang (scripts/pet/bo_suu_tap.py → bo-suu-tap.json)
import os
if os.path.exists('scripts/pet/bo-suu-tap.json'): items += json.load(open('scripts/pet/bo-suu-tap.json'))

catalog = {
  'bodies': {
    'nam': {'file': 'than/than-nam.webp', 'file_ao': 'than/than-nam-mac-ao.webp', 'w': 588, 'h': 900,
            'eyes': A(0.5, 0.345, 0.36), 'mouth': A(0.5, 0.445, 0.12),
            'hand': {'file': 'than/tay-phai-nam.webp', **A(0.852, 0.7828, 0.1259)}, 'hand_left': [0.1395, 0.788], 'hand_l': {'file': 'than/tay-trai-nam.webp', **A(0.1395, 0.788, 0.1259)}, 'hat_cut': 0.27,
            'file_nl': 'than/than-nam-khong-la.webp', 'file_ao_nl': 'than/than-nam-mac-ao-khong-la.webp',
            'leaf': {'file': 'than/la-nam.webp', **A(0.4643, 0.0828, 0.3503), 'px': 0.80, 'py': 0.97}},
    'nu': {'file': 'than/than-nu.webp', 'file_ao': 'than/than-nu-mac-ao.webp', 'w': 559, 'h': 900,
           'eyes': A(0.5, 0.40, 0.40), 'mouth': A(0.5, 0.50, 0.13),
           'bow': {'file': 'than/no-nu.webp', **A(0.55, 0.20, 0.55)},
           'hand': {'file': 'than/tay-phai-nu.webp', **A(0.8515, 0.7828, 0.1252)}, 'hand_left': [0.1395, 0.788], 'hand_l': {'file': 'than/tay-trai-nu.webp', **A(0.1395, 0.788, 0.1252)}, 'hat_cut': 0.30,
           'file_nl': 'than/than-nu-khong-la.webp', 'file_ao_nl': 'than/than-nu-mac-ao-khong-la.webp',
           'leaf': {'file': 'than/la-nu.webp', **A(0.4365, 0.0822, 0.4043), 'px': 0.76, 'py': 0.97}},
  },
  # thứ tự vẽ từ dưới lên
  'layers': ['duoi_chan', 'sau_lung', 'than', 'ao', 'quai', 'deo', 'mat', 'mieng', 'kinh', 'tai_nghe', 'bow', 'dau', 'cam_tay', 'tay', 'hieu_ung', 'tam_trang'],
  'slots': {'dau': 'Đội đầu', 'kinh': 'Kính', 'tai_nghe': 'Tai nghe', 'ao': 'Áo', 'deo': 'Khăn / túi', 'cam_tay': 'Cầm tay',
            'sau_lung': 'Sau lưng', 'duoi_chan': 'Dưới chân', 'hieu_ung': 'Hiệu ứng'},
  'moods': {m: {'file': f, 'anchor': {'nam': A(x, y, w), 'nu': A(x + 0.02, y + 0.1, w)}} for m, f, x, y, w in [
      ('ngu', 'hieu-ung/hieu-ung-14.webp', 0.84, 0.17, 0.26),
      ('hoi', 'hieu-ung/hieu-ung-15.webp', 0.86, 0.19, 0.18),
      ('gian', 'hieu-ung/hieu-ung-16.webp', 0.82, 0.24, 0.22)]},
  'items': items,
}
# 20/10 (chủ dự án: khăn nằm trên ngực): khăn quàng thường quấn sát dưới cằm như khăn bộ sưu tập (bo_suu_tap.py kind scarf)
def _fitw(file, v, bottom, cw):
    from PIL import Image as _I
    im = _I.open(f'public/pet/{file}'); l, t, r, b = im.split()[3].point(lambda p: 255 if p > 40 else 0).getbbox()
    bw, bh = {'nam': (588, 900), 'nu': (559, 900)}[v]; sc = cw * bw / (r - l)
    return {'x': round(.5 + (im.width / 2 - (l + r) / 2) * sc / bw, 4), 'y': round((bottom * bh - b * sc + im.height * sc / 2) / bh, 4), 'w': round(im.width * sc / bw, 4)}
def _fitTop(file, v, top, cw):  # mép trên khăn ngay dưới miệng (khăn dài → canh theo mép trên, không theo đáy)
    from PIL import Image as _I
    im = _I.open(f'public/pet/{file}'); l, t, r, b = im.split()[3].point(lambda p: 255 if p > 40 else 0).getbbox()
    bw, bh = {'nam': (588, 900), 'nu': (559, 900)}[v]; sc = cw * bw / (r - l)
    return {'x': round(.5 + (im.width / 2 - (l + r) / 2) * sc / bw, 4), 'y': round((top * bh - t * sc + im.height * sc / 2) / bh, 4), 'w': round(im.width * sc / bw, 4)}
for it in items:
    if it['id'] in ('ao-roi-07', 'phu-kien-13'):
        it['anchor'] = {'nam': _fitTop(it['file'], 'nam', .535, .66), 'nu': _fitTop(it['file'], 'nu', .595, .58)}
    if it['id'] == 'halloween-06':  # khăn ma cà rồng: dải dài → canh mép trên dưới miệng, hẹp hơn thân
        it['anchor'] = {'nam': _fitTop(it['file'], 'nam', .545, .58), 'nu': _fitTop(it['file'], 'nu', .60, .52)}
    if it['id'] == 'bong-da-06':  # khăn cổ vũ: dải dài → canh mép trên dưới miệng
        it['anchor'] = {'nam': _fitTop(it['file'], 'nam', .545, .62), 'nu': _fitTop(it['file'], 'nu', .60, .55)}
    if it['id'] == 'bong-da-02':  # băng buộc trán: trán Pi nam thấp hơn → hạ thêm
        it['anchor']['nam']['y'] = round(it['anchor']['nam']['y'] + .035, 4)
    if it['id'] == 'halloween-12':  # ma nhỏ bay cạnh đầu (giữa đầu thì che lá)
        it['anchor'] = {v: {'x': .80, 'y': .13, 'w': .48} for v in it['anchor']}
# 20/10 (chủ dự án: mũ đội lệch, mũ Noel như bị cắt đầu): mũ canh giữa theo VÀNH MŨ (đáy mũ) chứ không theo cả khung ảnh —
# quả bông mũ Noel, lưỡi trai chìa sang một bên làm khung ảnh lệch → mũ lệch, phần đầu đã cắt chỏm lộ ra bên kia.
# Mũ lưỡi trai: lấy tâm phần chỏm (15–50% chiều cao) vì lưỡi trai nằm ở đáy. Tâm đầu Pi đo từ thân gốc (y 0,30).
HEAD_X = {'nam': 0.523, 'nu': 0.516}
HAT_DX = {'halloween-01': 0.07, 'bong-da-02': 0.10}  # mũ phù thuỷ: vành trái chìa dài hơn vành phải → dời sang phải (theo bề rộng ảnh)
CAPS = {'doi-dau-01', 'doi-dau-02', 'doi-dau-03', 'doi-dau-06', 'doi-dau-09'}
def _brim_cx(file, cap):
    from PIL import Image as _I
    import numpy as _np
    al = _np.array(_I.open(f'public/pet/{file}').convert('RGBA'))[..., 3] > 40
    ys, xs = _np.nonzero(al); t, b = ys.min(), ys.max(); h = b - t
    lo, hi = (t + 0.15 * h, t + 0.5 * h) if cap else (b - 0.15 * h, b)
    sel = (ys >= lo) & (ys <= hi)
    return (xs[sel].min() + xs[sel].max()) / 2 / al.shape[1]
for it in items:
    if it['slot'] != 'dau' or it.get('behind_head') or any(w in it['name'] for w in ('Trâm', 'Kẹp')): continue
    try: cx = _brim_cx(it['file'], it['id'] in CAPS or it['id'] in ('doi-dau-08', 'bong-da-02'))  # 08: vành trước chìa lệch → canh theo thân mũ
    except Exception: continue
    for v, a in (it.get('anchor') or {}).items():
        if not a or 'w' not in a: continue
        a['x'] = round(a['x'] + HEAD_X.get(v, .52) - (a['x'] - a['w'] / 2 + cx * a['w']), 4)
        a['x'] = round(a['x'] + HAT_DX.get(it['id'], 0) * a['w'], 4)
        if it['id'] in CAPS:  # lưỡi trai trước nhỏ so với đầu Pi → to thêm 10%, giữ nguyên đáy vành
            from PIL import Image as _I
            iw, ih = _I.open(f"public/pet/{it['file']}").size
            bw, bh = {'nam': (588, 900), 'nu': (559, 900)}[v]
            hh = a['w'] * bw * ih / iw / bh
            a['w'] = round(a['w'] * 1.1, 4); a['y'] = round(a['y'] - hh * 0.05, 4)
            a['x'] = round(a['x'] + (cx - 0.5) * a['w'] * 0.1 / 1.1, 4)
# 20/10: áo liền thân vẽ tay ở chỗ khác thân gốc → dò tâm bàn tay (màu da Pi) trong ảnh thân mặc áo, đồ cầm tay dời theo
import numpy as np
from PIL import Image
from scipy import ndimage
def _hand_centers(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(int); H, W = a.shape[:2]
    R, G, B, Al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    skin = (Al > 128) & (B > 200) & (G > 150) & (R > 70) & (R < 190) & (B - R > 55) & (G - R > 25)
    out = []
    for x0, x1 in ((.66, 1), (0, .34)):
        m = np.zeros_like(skin); m[int(H * .66):int(H * .9), int(W * x0):int(W * x1)] = True; m &= skin
        lab, n = ndimage.label(m)
        if n == 0: out.append(None); continue
        sz = ndimage.sum(m, lab, range(1, n + 1)); k = int(np.argmax(sz)) + 1
        if sz[k - 1] < 600: out.append(None); continue
        ys, xs = np.nonzero(lab == k); out.append((xs.mean() / W, ys.mean() / H))
    return out
# độ lệch của máy dò trên thân gốc nữ (thân gốc nam mặc áo xanh, dò không ra) → trừ đi để khớp điểm tay của catalog
_BIAS_R, _BIAS_L = (0.0065, 0.004), (-0.0085, 0.0)
for it in items:
    for v, bd in (it.get('body') or {}).items():
        try: r, l = _hand_centers(f"public/pet/{bd['file']}")
        except Exception: continue
        if r: bd['hand'] = [round(r[0] - _BIAS_R[0], 4), round(r[1] - _BIAS_R[1], 4)]
        if l: bd['hand_l'] = [round(l[0] - _BIAS_L[0], 4), round(l[1] - _BIAS_L[1], 4)]
json.dump(catalog, open(OUT, 'w'), ensure_ascii=False, indent=1)
print(len(items), {r: sum(1 for i in items if i['rarity'] == r) for r in plan})
