#!/usr/bin/env python3
"""30/10 — Pi hồng (Pi nữ, chủ dự án chốt): tự đổi màu da Pi xanh → hồng, KHÔNG vẽ lại đồ.
Chạy sau mỗi lần build.py (build.py xoá cả public/pi):  python3 scripts/pi/pink.py
Sinh public/pi/hong/: body/* (thân, đầu, lá), faces|eyes|mouths/nu/*, items/<như bản xanh> + icon/<mã> (chỉ món nữ có đổi),
và src/pi/pink.json { ver, items: [mã món có bản hồng], checked: [mọi món nữ đã soát], left: {mã: số điểm da xanh còn trên thân} }.
Cách đổi:
  - thân / đầu / lá: mọi điểm màu xanh Pi (sắc 185–235°) xoay sang hồng;
  - mặt / mắt / miệng: da quanh mắt + má (xanh → tím → hồng) dồn về hồng; mắt đen giữ nguyên;
  - đồ: chỉ điểm đúng màu da Pi (xanh da trời sáng) + viền mép món nằm trên thân + vùng cánh tay (đồ cầm tay có tay vẽ sẵn).
    Vải / kính / vòng màu xanh đậm, tím, bạc giữ nguyên.
Soát: ghép Pi hồng + từng món, đếm điểm còn màu da xanh trên thân → pink.json.left (tests/pi-pink.test.mjs chặn món vượt ngưỡng).
"""
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PI = os.path.join(ROOT, "public", "pi")
OUT = os.path.join(PI, "hong")
MAN = json.load(open(os.path.join(ROOT, "src", "pi", "manifest.json"), encoding="utf-8"))
LEFT_MAX = 150  # điểm da xanh còn trên thân tối đa / món (test dùng cùng số)
SKIP = {}  # mã món: lý do giữ nguyên bản xanh (chưa có)

def hsv(a):
    rgb = a[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; nz = d > 1e-6; h = np.zeros_like(mx); dd = np.maximum(d, 1e-6)
    h = np.where((mx == r) & nz, ((g - b) / dd) % 6, h); h = np.where((mx == g) & nz, (b - r) / dd + 2, h); h = np.where((mx == b) & nz, (r - g) / dd + 4, h)
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx

def rgb(h, s, v):
    c = v * s; x = c * (1 - np.abs((h / 60) % 2 - 1)); m = v - c; hp = (h // 60).astype(int) % 6; z = 0 * c
    R = np.select([hp == i for i in range(6)], [c, x, z, z, x, c]); G = np.select([hp == i for i in range(6)], [x, c, c, x, z, z]); B = np.select([hp == i for i in range(6)], [z, z, x, c, c, x])
    return R + m, G + m, B + m

def load(rel): return Image.open(os.path.join(PI, rel)).convert("RGBA")
BODY = np.asarray(load("body/pi_than.webp"))[..., 3] > 20
BODYSIL = np.asarray(Image.fromarray((BODY * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
_ARM = {}
def armmask(side):
    if side not in _ARM:
        cut = np.asarray(load(f"body/pi_than_khong_tay_{side}.webp"))[..., 3] > 20
        _ARM[side] = np.asarray(Image.fromarray(((BODY & ~cut) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(61))) > 0
    return _ARM[side]

def skin_left(a):
    h, s, v = hsv(a); return (a[..., 3] > 0.5) & (h > 195) & (h < 217) & (s > 0.3) & (s < 0.85) & (v > 0.75)

def pink(im, mode="body", arm=None):
    a = np.asarray(im).astype(np.float32) / 255
    h, s, v = hsv(a); A = a[..., 3] > 0; H, S = h.copy(), s.copy()
    if mode == "face":
        sel = A & (h > 185) & (h < 345) & (s > 0.1) & (v > 0.6)
        t = np.clip((h - 205) / 120, 0, 1)
        H = np.where(sel, 335 + 12 * t, h)
        S = np.where(sel & (h < 235), s * 0.85, np.where(sel, np.maximum(s, 0.45), s))
        v = np.where(sel & (t > 0), np.clip(np.maximum(v, 0.93 - 0.05 * t), 0, 1), v)
    else:
        if mode == "body": sel = A & (h > 185) & (h < 235) & (s > 0.15)
        else:
            sel = A & (h > 195) & (h < 217) & (s > 0.12) & (v > 0.75)
            if arm: sel |= A & (h > 185) & (h < 235) & (s > 0.15) & armmask(arm)
            al = Image.fromarray(((a[..., 3] > 0.05) * 255).astype(np.uint8))
            edge = (a[..., 3] > 0.05) & ~(np.asarray(al.filter(ImageFilter.MinFilter(17))) > 0)
            sel |= edge & BODYSIL & (h > 185) & (h < 235) & (s > 0.15)
        H = np.where(sel, (h + 135) % 360, h); S = np.where(sel, s * 0.85, s)
    R, G, B = rgb(H, S, v); out = a.copy(); out[..., 0], out[..., 1], out[..., 2] = R, G, B
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA"), int(sel.sum())

def save(rel, im, q=90):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p, "WEBP", quality=q, method=6); return p

def icon(im):
    bb = im.getbbox(); pad = 10; N = im.size[0]
    crop = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(N, bb[2] + pad), min(N, bb[3] + pad)))
    n = max(crop.size); sq = Image.new("RGBA", (n, n), (0, 0, 0, 0)); sq.alpha_composite(crop, ((n - crop.size[0]) // 2, (n - crop.size[1]) // 2))
    return sq.resize((160, 160), Image.LANCZOS)

def main():
    if os.path.isdir(OUT):
        import shutil; shutil.rmtree(OUT)
    files = []
    for f in sorted(os.listdir(os.path.join(PI, "body"))):
        if f.endswith(".webp"): files.append(save(f"body/{f}", pink(load(f"body/{f}"))[0]))
    for d in ("faces", "eyes", "mouths"):
        for f in sorted(os.listdir(os.path.join(PI, d, "nu"))):
            if f.endswith(".webp"): files.append(save(f"{d}/nu/{f}", pink(load(f"{d}/nu/{f}"), "face")[0]))
    hb = {f: Image.open(os.path.join(OUT, "body", f)).convert("RGBA") for f in os.listdir(os.path.join(OUT, "body"))}
    face = Image.open(os.path.join(OUT, "faces", "nu", "vui.webp")).convert("RGBA")
    items, checked, left = [], [], {}
    for it in MAN["items"]:
        if it["g"] != "nu": continue
        checked.append(it["id"])
        src = load(it["file"]); arm = it.get("arm") if it["slot"] in ("tay", "gang") else None
        out, n = (src, 0) if it["id"] in SKIP else pink(src, "item", arm)
        if n:
            files.append(save(it["file"], out)); files.append(save(f"icon/{it['id']}.webp", icon(out), 82)); items.append(it["id"])
        # soát: Pi hồng mặc món này (cùng luật lớp với src/pi/piLayers.js)
        c = Image.new("RGBA", src.size, (0, 0, 0, 0))
        c.alpha_composite(hb[f"pi_than{'_khong_tay_' + it['arm'] if it.get('arm') else ''}.webp"])
        if it["slot"] == "ao": c.alpha_composite(hb["pi_dau.webp"])
        c.alpha_composite(face); c.alpha_composite(out)
        k = int((skin_left(np.asarray(c).astype(np.float32) / 255) & BODY).sum())
        if k: left[it["id"]] = k
    h = hashlib.md5()
    for p in sorted(files): h.update(open(p, "rb").read())
    meta = {"ver": h.hexdigest()[:10], "items": items, "checked": checked, "left": left, "left_max": LEFT_MAX, "skip": SKIP}
    json.dump(meta, open(os.path.join(ROOT, "src", "pi", "pink.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    bad = {k: v for k, v in left.items() if v > LEFT_MAX}
    print(f"{len(files)} file, {len(items)}/{len(checked)} món nữ có bản hồng, còn da xanh > {LEFT_MAX}: {bad or 'không'}")

if __name__ == "__main__": main()
