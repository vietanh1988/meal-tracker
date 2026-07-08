export const C = {
  protein:"#007AFF", carb:"#5AC8FA", fat:"#8E8E93", fiber:"#34C759",
  red:"#EF4444", gold:"#FACC15", green:"#00C896", blue:"#007AFF",
  primary:"#007AFF", secondary:"#36A3FF", deepBlue:"#0057FF", accent:"#7C3AED",
  mint:"#00C896", violet:"#7C3AED",
  bg:"#F8FAFC", card:"#FFF", surface:"#F1F5F9",
  border:"#E2E8F0",
  t1:"#0F172A", t2:"#475569", t3:"#64748B",
  redBg:"rgba(239,68,68,0.07)", goldBg:"rgba(250,204,21,0.1)", greenBg:"rgba(0,200,150,0.08)", blueBg:"rgba(0,122,255,0.06)",
  primaryBg:"rgba(0,122,255,0.08)", accentBg:"rgba(124,58,237,0.06)",
};

export const card={background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"};
export const lbl={fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase"};
export const inp={width:"100%",boxSizing:"border-box",padding:"8px 12px",fontSize:14,fontWeight:600,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.t1,outline:"none",fontFamily:"inherit",height:40};
export const redBtn={padding:"12px",fontSize:14,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",color:"#fff",cursor:"pointer",fontFamily:"inherit",width:"100%"};

// ============================================================
// DESIGN TOKENS — trích xuất từ số liệu thực tế đang dùng trong app
// (audit toàn bộ src/*.jsx bằng grep, KHÔNG bịa số mới).
// Dùng token khi VIẾT CODE MỚI hoặc SỬA LẠI code cũ; KHÔNG đổi hàng loạt
// các file đang chạy — làm vậy không đổi bất kỳ giá trị hiển thị nào,
// chỉ để về sau code mới nhất quán và dễ chỉnh 1 chỗ.
// Responsive (mob/pc): vẫn giữ cách cũ — dùng ternary `mob?A:B` tại chỗ
// gọi token (VD: fontSize: mob?fs.lg:fs.xl), KHÔNG gộp vào 1 token chung,
// để tránh vỡ layout do 2 màn hình cần số khác nhau.
// ============================================================

// fontSize — thang chính (10→22), số hiếm gặp hơn (24,28,32,36,40,48...)
// là các "số hero" cố ý (VD số calo to trên Dashboard) — không tokenize,
// giữ nguyên số cứng tại chỗ dùng.
export const fs = { xs:10, sm:11, md:12, base:13, lg:14, xl:15, "2xl":16, "3xl":17, "4xl":18, "5xl":20, "6xl":22 };

// fontWeight — 5 giá trị dùng phổ biến. 400/300 chỉ xuất hiện đúng 1 lần
// mỗi giá trị (MealsTab.jsx số mẫu "/200g" nhạt, App.jsx dấu "+" mảnh) —
// cố ý, không phải lỗi gõ nhầm, nên vẫn thêm token để chỗ khác tái dùng
// đúng ý đồ thiết kế đó nếu cần.
export const fw = { light:300, regular:400, medium:500, semibold:600, bold:700, extrabold:800, black:900 };

// lineHeight
export const lh = { tight:1, snug:1.1, snugMd:1.3, normal:1.4, relaxed:1.5, loose:1.6, loosest:1.7 };

// borderRadius — số nhỏ (3-6) cho control/badge nhỏ, số lớn (8-14) cho card/nút, 50%/999 cho tròn/pill
export const radius = { xs:3, sm:4, md:5, lg:6, xl:8, "2xl":10, "3xl":12, "4xl":14, "5xl":20, full:"50%", pill:999 };

// spacing — dùng cho gap, và ghép cặp để tạo padding (VD: `${sp.lg}px ${sp.xl}px` = "10px 14px")
export const sp = { xxs:1, xs:4, sm:5, md:6, lg:8, xl:10, "2xl":12, "3xl":14, "4xl":16, "5xl":20, "6xl":24 };
export const numFix={onFocus:e=>e.target.select(),onBlur:e=>{const el=e.target;if(el.value!==""&&!isNaN(Number(el.value)))el.value=String(Number(el.value));}};
