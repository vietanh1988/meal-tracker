"""Sinh src/pet/catalog.json: món đồ + điểm đặt (tỉ lệ theo thân).
anchor: x, y = tâm món (phần của rộng / cao thân), w = rộng món (phần của rộng thân).
"""
import json, sys

OUT = sys.argv[1]

NAMES = {
 'ao-roi': ['Áo khoác thể thao xanh','Áo khoác trắng','Áo hoodie xanh đậm','Áo vest học sinh','Bộ phi hành gia','Áo phao xanh','Khăn len xanh',
            'Áo hoodie hồng','Áo khoác kem','Váy vàng','Váy trắng nơ','Váy tím công chúa','Áo khoác hồng tim'],
 'doi-dau': ['Mũ lưỡi trai xanh','Mũ lưỡi trai đen','Mũ lưỡi trai xanh trắng','Mũ tai bèo be','Mũ tai bèo xanh rêu','Mũ lưỡi trai đen trắng',
             'Nơ hồng to','Mũ rơm hoa','Mũ lưỡi trai hồng','Băng đô tai mèo','Vương miện vàng','Vương miện hồng ngọc'],
 'kinh-tai-nghe': ['Kính tròn đen','Kính râm đen','Kính râm xanh','Tai nghe xanh','Tai nghe đen','Kính tim hồng','Kính tròn hồng',
                   'Kính râm nâu','Tai nghe hồng','Tai nghe tai mèo'],
 'phu-kien': ['Balo xanh','Túi đeo hông','Bình nước nhỏ','Bình nước xanh','Bình giữ nhiệt','Quả tạ','Chùm bóng xanh','Ván trượt xanh',
              'Balo hồng','Túi xách hồng','Giỏ hoa','Bình nước hồng','Khăn quàng hồng','Ván trượt hồng','Bông hoa'],
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
HOLD_SCALE = {'phu-kien-07': 1.5, 'phu-kien-15': 1.2}  # chùm bóng bay to hơn, hoa to hơn chút
BODY_HAND = {'nam': (0.852, 0.7828, 588, 900), 'nu': (0.8515, 0.7828, 559, 900)}
COVER = {f'doi-dau-{i:02d}' for i in (1, 2, 3, 4, 5, 6, 8, 9)}  # mũ trùm kín đỉnh đầu → ẩn lá + chỏm đầu dưới mũ
for it in items:
    if it['id'] in COVER: it['cover'] = True
    if it['id'] in HOLD:
        hd = HOLD[it['id']]; it['file_hold'] = hd['file']; it['anchor'] = {}
        for v in it['variants']:
            hx, hy, bwp, bhp = BODY_HAND[v]
            wf = hd['src_w'] / 100 * 0.15 * HOLD_SCALE.get(it['id'], 1); hf = wf * bwp * hd['src_h'] / hd['src_w'] / bhp
            it['anchor'][v] = A(round(hx + (0.5 - hd['hand_x']) * wf, 4), round(hy + (0.5 - hd['hand_y']) * hf, 4), round(wf, 4))
        continue
    over = ANCH.get(it['id'], {})
    it['anchor'] = {}
    for v in it['variants']:
        a = default(it, v); a.update(over.get('all', {})); a.update(over.get(v, {}))
        it['anchor'][v] = a

catalog = {
  'bodies': {
    'nam': {'file': 'than/than-nam.webp', 'file_ao': 'than/than-nam-mac-ao.webp', 'w': 588, 'h': 900,
            'eyes': A(0.5, 0.345, 0.36), 'mouth': A(0.5, 0.445, 0.12),
            'hand': {'file': 'than/tay-phai-nam.webp', **A(0.852, 0.7828, 0.1259)}, 'hat_cut': 0.27,
            'file_nl': 'than/than-nam-khong-la.webp', 'file_ao_nl': 'than/than-nam-mac-ao-khong-la.webp',
            'leaf': {'file': 'than/la-nam.webp', **A(0.4643, 0.0828, 0.3503), 'px': 0.80, 'py': 0.97}},
    'nu': {'file': 'than/than-nu.webp', 'file_ao': 'than/than-nu-mac-ao.webp', 'w': 559, 'h': 900,
           'eyes': A(0.5, 0.40, 0.40), 'mouth': A(0.5, 0.50, 0.13),
           'bow': {'file': 'than/no-nu.webp', **A(0.55, 0.20, 0.55)},
           'hand': {'file': 'than/tay-phai-nu.webp', **A(0.8515, 0.7828, 0.1252)}, 'hat_cut': 0.30,
           'file_nl': 'than/than-nu-khong-la.webp', 'file_ao_nl': 'than/than-nu-mac-ao-khong-la.webp',
           'leaf': {'file': 'than/la-nu.webp', **A(0.4365, 0.0822, 0.4043), 'px': 0.76, 'py': 0.97}},
  },
  # thứ tự vẽ từ dưới lên
  'layers': ['duoi_chan', 'sau_lung', 'than', 'ao', 'deo', 'mat', 'mieng', 'kinh', 'tai_nghe', 'bow', 'dau', 'cam_tay', 'tay', 'hieu_ung', 'tam_trang'],
  'slots': {'dau': 'Đội đầu', 'kinh': 'Kính', 'tai_nghe': 'Tai nghe', 'ao': 'Áo', 'deo': 'Khăn / túi', 'cam_tay': 'Cầm tay',
            'sau_lung': 'Sau lưng', 'duoi_chan': 'Dưới chân', 'hieu_ung': 'Hiệu ứng'},
  'moods': {m: {'file': f, 'anchor': {'nam': A(x, y, w), 'nu': A(x + 0.02, y + 0.1, w)}} for m, f, x, y, w in [
      ('ngu', 'hieu-ung/hieu-ung-14.webp', 0.84, 0.17, 0.26),
      ('hoi', 'hieu-ung/hieu-ung-15.webp', 0.86, 0.19, 0.18),
      ('gian', 'hieu-ung/hieu-ung-16.webp', 0.82, 0.24, 0.22)]},
  'items': items,
}
json.dump(catalog, open(OUT, 'w'), ensure_ascii=False, indent=1)
print(len(items), {r: sum(1 for i in items if i['rarity'] == r) for r in plan})
