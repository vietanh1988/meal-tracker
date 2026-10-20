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

## Áo vẽ liền thân (20/10)
- Mỗi áo có ảnh "thân mặc áo" ở `public/pet/than-ao/than-<nam|nu>[-khong-la]-<mã áo>.webp` (catalog: `item.body[variant].file / file_nl`). Mặc áo → thay cả thân, không đặt ảnh áo rời.
- Cách làm: ChatGPT vẽ Pi mặc áo (nền #FF00FF) → tách nền → chỉnh cỡ cho đỉnh lá và đế giày trùng thân gốc → bỏ phần đầu của ảnh mới (trên 52% chiều cao) → ghép đè ĐẦU GỐC (từ `than-*-mac-ao[-khong-la].webp`) để mắt, miệng, mũ, kính khớp như cũ.
- Ảnh món (ô cửa hàng) = phần thân mặc áo dưới cằm (cắt từ 58,5% chiều cao).
- Thêm áo mới: vẽ theo prompt mẫu, làm lại đúng các bước trên cho áo đó; không đụng món khác.
