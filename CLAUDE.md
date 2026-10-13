# Fipilot AI — ghi chú cho Claude

React 18 + Vite PWA · Supabase `veodsvojxjmjhtrlaieq` · Vercel `app.fipilotai.com` (push `main` = deploy prod).

## Quy ước bắt buộc
- **Ngày giờ**: chỉ dùng `src/lib/dateVN.js` (giờ VN). Cấm `new Date().toISOString().slice(0,10)` và `getDay()` trực tiếp cho "hôm nay"/"thứ mấy".
  `profile.gymDays` dùng 0=T2 … 6=CN → `isGymDate(gymDays, dateStr)`.
- **Macro / bữa ăn**: `src/lib/mealMath.js` (hàm thuần, có test).
- **Dữ liệu bữa ăn**:
  - `daily_logs` (1 dòng / user / ngày VN) = nguồn sự thật theo ngày. Số "đã ăn" = `meals ∩ eaten_meals`; `total_*` = tổng mọi bữa đã ghi.
  - `meal_logs` = chỉ 2 "ô" thực đơn mẫu (train/rest) — KHÔNG dùng để biết hôm nay ăn gì.
  - Ghi `daily_logs` chỉ qua `useUserData`: `saveMealToCloud` / `toggleEaten` / `applyTemplate` / `removeDayMeal` / `moveDayMeal` (hàng đợi tuần tự). Không upsert thẳng.
- **Cân nặng**: `useWeightLog` — 1 lần cân/ngày, tuần + delta tự tính lại (`src/lib/weightMath.js`).
- **Theme**: token trong `src/theme.js`, icon PNG `public/icons`. UI mobile là app, không phải web. PC chỉ cần đủ chức năng admin.

## Quy trình đưa code lên prod (BẮT BUỘC)
- KHÔNG push thẳng `main`. Làm trên nhánh `ci/<tên-việc>` (hoặc `feat/**`, `fix/**`) dựng từ `origin/main` mới nhất rồi push.
- GitHub Actions `.github/workflows/e2e.yml` tự: dựng Supabase LOCAL (supabase/migrations + seed.sql, dữ liệu giả) → unit test → build → E2E Playwright (tests/e2e, chặn mọi gọi AI) → ĐẠT thì fast-forward vào `main` → Vercel deploy.
- Xem kết quả: `gh api repos/vietanh1988/meal-tracker/actions/runs?branch=<nhánh>`; log lỗi đọc qua annotation `gh api repos/vietanh1988/meal-tracker/check-runs/<job_id>/annotations` (tải log thô bị chặn).
- Đổi schema DB: thêm file `supabase/migrations/<14 số>_ten.sql` (CI dùng để dựng local) + đưa SQL cho chủ dự án chạy trên prod.
- Màn/nút mới: gắn `data-testid` cho nút chính và thêm/sửa bài E2E tương ứng.

## Kiểm tra trước khi push
```
npm test                      # node --test tests/*.test.mjs + tests/check-logic.mjs
bun test tests/integration    # chạy hook useUserData với React/Supabase giả
bun build src/main.jsx --outdir /tmp/out --packages external   # bắt lỗi cú pháp nếu không có node_modules
```
Sau push: xem log build trên Vercel, mở app kiểm tra màn đã sửa.

## Không làm
- Không gọi AI trả phí khi test.
- SQL đổi schema/hàm trên prod: đưa file cho chủ dự án chạy (hoặc qua connector Supabase), không tự chạy qua trình duyệt.
