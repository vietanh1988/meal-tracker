"""Ghép món lên thân theo catalog.json → ảnh soát. python3 compose.py catalog.json public/pet out.jpg [slot...]"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

cat = json.load(open(sys.argv[1])); root = sys.argv[2]; out = sys.argv[3]
only = set(sys.argv[4:])
import os; H = int(os.environ.get("H", 300))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)

def place(canvas, file, a, bw, bh, ox, oy):
    im = Image.open(f'{root}/{file}').convert('RGBA')
    w = a['w'] * bw; h = a['h'] * bh if 'h' in a else w * im.height / im.width
    im = im.resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
    canvas.alpha_composite(im, (round(ox + a['x'] * bw - w / 2), round(oy + a['y'] * bh - h / 2)))

def render(v, equip, mood=None, bow=True):
    b = cat['bodies'][v]; bh = H; bw = H * b['w'] / b['h']
    pad = 60
    c = Image.new('RGBA', (round(bw) + 2 * pad, bh + 2 * pad), (238, 243, 251, 255))
    ox = oy = pad
    for L in cat['layers']:
        if L == 'than':
            body = Image.new('RGBA', c.size, (0, 0, 0, 0))
            place(body, b['file_ao'] if 'ao' in equip else b['file'], {'x': .5, 'y': .5, 'w': 1}, bw, bh, ox, oy)
            if 'dau' in equip and equip['dau'].get('cover'):  # mũ trùm: bỏ phần thân phía trên đường cắt (lá, chỏm đầu)
                cut = round(oy + b['hat_cut'] * bh); body.paste((0, 0, 0, 0), (0, 0, body.width, cut))
            c.alpha_composite(body)
        elif L == 'tay':
            if 'cam_tay' in equip: place(c, b['hand']['file'], b['hand'], bw, bh, ox, oy)
        elif L == 'mat': place(c, 'mat-doi/' + ('mat-doi-nam-01.webp' if v == 'nam' else 'mat-doi-nu-13.webp'), b['eyes'], bw, bh, ox, oy)
        elif L == 'mieng': place(c, 'mieng/mieng-to-01.webp', b['mouth'], bw, bh, ox, oy)
        elif L == 'bow':
            if v == 'nu' and bow and 'dau' not in equip: place(c, b['bow']['file'], b['bow'], bw, bh, ox, oy)
        elif L == 'tam_trang':
            if mood: m = cat['moods'][mood]; place(c, m['file'], m['anchor'][v], bw, bh, ox, oy)
        elif L in equip:
            it = equip[L]; place(c, it['file'], it['anchor'][v], bw, bh, ox, oy)
    return c

tiles = []
for it in cat['items']:
    if only and it['slot'] not in only and it['id'] not in only: continue
    for v in it['variants']:
        t = render(v, {it['slot']: it})
        d = ImageDraw.Draw(t); d.text((6, 4), f"{it['name']}", fill=(15, 23, 42), font=font)
        d.text((6, 22), f"{it['id']} · {'nam' if v=='nam' else 'nữ'} · {it['rarity']} · c{it['level']}", fill=(100, 116, 139), font=font)
        tiles.append(t)
if 'moods' in only:
    for v in ('nam', 'nu'):
        for m in cat['moods']:
            t = render(v, {}, m); ImageDraw.Draw(t).text((6, 4), f"Tâm trạng: {m} · {'nam' if v=='nam' else 'nữ'}", fill=(15, 23, 42), font=font); tiles.append(t)
cols = int(os.environ.get("COLS", 8))
tw = max(t.width for t in tiles); th = max(t.height for t in tiles)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), (255, 255, 255))
for i, t in enumerate(tiles):
    sheet.paste(t.convert('RGB'), ((i % cols) * tw, (i // cols) * th))
sheet.save(out, quality=82)
print(len(tiles), sheet.size)
