# 🏋️ Meal Tracker
**Phát triển bởi Việt Anh Seoer**

Ứng dụng theo dõi bữa ăn, macro dinh dưỡng và cân nặng — tích hợp AI (Claude / Gemini / GPT).

---

## Stack
- **Frontend**: React + Vite
- **Auth + Database**: Supabase
- **AI**: Claude / Gemini / GPT qua Supabase Edge Function
- **Deploy**: Vercel
- **PWA**: cài được lên màn hình điện thoại

---

## Bước 1 — Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project
2. Vào **SQL Editor** → paste toàn bộ `supabase/schema.sql` → Run
3. Vào **Settings → API** → copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

---

## Bước 2 — Setup local

```bash
git clone https://github.com/your-username/meal-tracker.git
cd meal-tracker

cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env

npm install
npm run dev
```

Mở `http://localhost:5173`

---

## Bước 3 — Deploy Supabase Edge Function (ẩn AI keys)

```bash
# Cài Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Set API keys (không bao giờ commit keys vào git)
supabase secrets set ANTHROPIC_KEY=sk-ant-api03-...
supabase secrets set GEMINI_KEY=AIzaSy...
supabase secrets set OPENAI_KEY=sk-...

# Deploy Edge Function
supabase functions deploy ai-macro
```

---

## Bước 4 — Deploy lên Vercel

```bash
# Cài Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

Hoặc:
1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import repository
3. Thêm Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy → có link `meal-tracker.vercel.app`

---

## Bước 5 — PWA (cài lên điện thoại)

Sau khi deploy xong:
- **iPhone**: mở Safari → Share → "Add to Home Screen"
- **Android**: Chrome → menu → "Install app"

App sẽ xuất hiện ngoài màn hình như app thật.

---

## Cấu trúc project

```
meal-tracker/
├── src/
│   ├── App.jsx              # UI chính (giữ nguyên từ Claude Artifact)
│   ├── main.jsx
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   └── aiService.js     # Gọi AI API
│   └── hooks/
│       ├── useAuth.js       # Login / Register / Logout
│       ├── useProfile.js    # Hồ sơ người dùng
│       └── useWeightLog.js  # Lịch sử cân nặng
├── supabase/
│   ├── schema.sql           # Tạo tables
│   └── functions/
│       └── ai-macro/        # Edge Function ẩn AI keys
├── public/                  # PWA icons
├── .env.example
├── vite.config.js           # Vite + PWA config
├── package.json
└── README.md
```

---

## Database tables

| Table | Mô tả |
|-------|-------|
| `profiles` | Hồ sơ: chiều cao, cân nặng, mục tiêu |
| `weight_logs` | Lịch sử cân nặng theo tuần |
| `meal_logs` | Lịch sử bữa ăn đã nhập |
| `food_cache` | Cache AI tính macro (dùng chung) |
