# Fipilot Pet — sinh catalog + soát ảnh ghép

Chạy ở gốc repo:

```
python3 scripts/pet/fit.py                                           # điểm đặt áo (đo theo ảnh) + chỉnh tay → scripts/pet/anchors.json
python3 scripts/pet/gen_catalog.py src/pet/catalog.json scripts/pet/anchors.json   # tên, ô đeo, độ hiếm, cấp mở, giá, điểm đặt
H=260 COLS=10 python3 scripts/pet/compose.py src/pet/catalog.json public/pet /tmp/tat-ca-mon.jpg ao dau kinh tai_nghe deo cam_tay sau_lung duoi_chan hieu_ung moods
```

- Ảnh: `public/pet/<nhóm>/*.webp` (WebP q90, nền trong; món ≤ 600 px, thân 900 px). Không nằm trong bộ nhớ đệm PWA (chỉ tải khi mở màn Pet).
- `than/than-<nam|nu>-mac-ao.webp`: thân đã bỏ áo gốc (giữ đầu, tay, chân) — dùng khi mặc áo để áo mới che hết áo gốc.
- `than/no-nu.webp`: nơ bản nữ (lớp riêng, khách tháo được, đội mũ thì ẩn).
- Tâm trạng (không bán): hieu-ung-14 zZ (ngủ), 15 dấu ? (hỏi), 16 tức giận. hieu-ung-12 (nơ trùng) không dùng.
- Xem bản vẽ 3 màn: chạy `npm run dev` rồi mở `/__pet?s=home|shop|tryon|closet|entryA|entryB&v=nam|nu` (chỉ có ở bản dev).
