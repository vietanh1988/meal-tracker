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
export const redBtn={padding:"14px 16px",fontSize:16,fontWeight:900,letterSpacing:"0.2px",border:"none",borderRadius:14,background:"linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)",boxShadow:"0 4px 12px rgba(0,0,0,0.18)",color:"#fff",cursor:"pointer",fontFamily:"inherit",width:"100%",minHeight:48};

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

// ============================================================
// NỀN TỐI "BLUE DARK" (bản vẽ 48, chốt 14/10) — dùng cho màn Tôi + các trang con của Tôi
// (Tài khoản, Gói cước/Lượt AI, Chuyển khoản, Nhắc nhở, Lịch tập & bữa, Mục tiêu & macro,
//  Giới thiệu, Điều khoản, Thông báo, Góp ý) và Đăng nhập/Đăng ký/Quên MK.
// KHÔNG dùng cho Hôm nay, Thực đơn, Tiến độ, Ghi bữa, Kiểm tra calo, Chat AI (giữ header xanh + thân sáng).
// Sheet / hộp thoại bật lên trên các màn này vẫn nền trắng (dễ đọc, dễ nhập).
// ============================================================
// ============================================================
// Nền sáng các tab Hôm nay / Thực đơn / Tiến độ (bản vẽ 69 → 77, chốt 14/10):
// nền xanh nhạt nối tiếp header xanh; thẻ trắng PHẲNG (không viền, không bóng), bo 20.
// Riêng thẻ "bữa đến giờ" ở Hôm nay dùng kiểu nổi mềm cùng màu nền (LT.raise / LT.inset).
// ============================================================
export const LT = {
  bg: "linear-gradient(180deg,#D3E2FF 0%,#E0EBFF 35%,#EAF1FF 100%)",
  top: "#D3E2FF",           // màu đầu trang (thanh giờ iPhone ở tab Thực đơn / Tiến độ)
  base: "#E0EBFF",          // màu nền đặc (vùng kéo quá)
  tone: "#DCE7FF",          // màu nền ở vùng thẻ bữa đến giờ (thẻ nổi mềm cùng màu nền)
  raise: "8px 8px 20px rgba(30,64,175,0.16), -6px -6px 16px rgba(255,255,255,0.9)",
  raiseSm: "4px 4px 10px rgba(30,64,175,0.14), -4px -4px 10px rgba(255,255,255,0.9)",
  inset: "inset 3px 3px 6px rgba(30,64,175,0.12), inset -3px -3px 6px rgba(255,255,255,0.85)",
  line: "#EEF2FA",          // kẻ giữa các dòng trong thẻ
  soft: "#EEF4FF",          // nền nút phụ / ô phụ trong thẻ
  shadow: "0 8px 24px rgba(30,64,175,0.08), 0 1px 2px rgba(30,64,175,0.06)",
};
export const ltCard = { background: "#FFFFFF", border: "none", borderRadius: 20, boxShadow: "none" };

export const DK = {
  bg: "radial-gradient(circle at 85% 4%, rgba(60,140,255,0.35) 0%, rgba(60,140,255,0) 40%), radial-gradient(circle at 10% 60%, rgba(0,200,255,0.10) 0%, rgba(0,200,255,0) 45%), linear-gradient(180deg,#0F4585 0%,#03386F 18%,#022B57 45%,#012244 75%,#011B37 100%)",
  base: "#022B57",          // màu nền đặc (thanh trạng thái iPhone, vùng kéo quá)
  t1: "#FFFFFF",            // chữ chính
  t2: "rgba(255,255,255,0.78)", // chữ phụ
  t3: "rgba(255,255,255,0.62)", // chữ mờ / nhãn nhóm
  line: "rgba(255,255,255,0.12)", // kẻ giữa các dòng
  chev: "rgba(255,255,255,0.6)",
  link: "#7CC2FF",          // chữ link / nhấn trên nền tối
  green: "#4ADE9B", red: "#FFB4B4", amber: "#FCD34D",
  field: "rgba(255,255,255,0.08)",   // ô nhập
  fieldLine: "rgba(255,255,255,0.22)",
  chip: "rgba(255,255,255,0.10)",    // nút chọn chưa chọn
  chipLine: "rgba(255,255,255,0.20)",
  track: "rgba(255,255,255,0.14)",   // nền thanh % / công tắc tắt
};
// Thẻ kính mờ trên nền tối
export const dkGlass = {
  background: "linear-gradient(180deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.07) 100%)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 10px 26px rgba(0,16,70,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
};
export const dkCard = { ...dkGlass, borderRadius: 18 };
// Nhãn nhóm "THEO DÕI & DINH DƯỠNG"
export const dkSec = { display: "block", padding: "18px 18px 8px 18px", fontSize: 13, fontWeight: 800, color: DK.t3 };
// Ô nhập trên nền tối
export const dkInp = { height: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${DK.fieldLine}`, background: DK.field, fontFamily: "inherit", fontSize: 16, color: "#FFFFFF", boxSizing: "border-box", width: "100%", outline: "none" };
// CSS phụ cho khối có class "fpd" (nền tối): placeholder, focus, hover, ô chọn ngày giờ
export const DK_CSS = `
.fpm .fpd input::placeholder,.fpm .fpd textarea::placeholder{color:rgba(255,255,255,0.45)}
.fpm .fpd input:focus,.fpm .fpd textarea:focus,.fpm .fpd select:focus{border-color:#7CC2FF !important;background:rgba(255,255,255,0.14) !important}
.fpm .fpd :focus-visible{outline-color:#7CC2FF}
.fpm .fpd input.pw-inner:focus{background:transparent !important;border-color:transparent !important}
.fpm .fpd .pw-box:focus-within{border-color:#7CC2FF !important;background:rgba(255,255,255,0.14) !important}
/* Chrome/Safari tự điền (email, mật khẩu đã lưu) tô nền trắng-xanh + chữ đen → giữ nền trong suốt, chữ trắng như ô thường */
.fpm .fpd input:-webkit-autofill,.fpm .fpd input:-webkit-autofill:hover,.fpm .fpd input:-webkit-autofill:focus,.fpm .fpd input:autofill{-webkit-text-fill-color:#FFFFFF !important;caret-color:#FFFFFF;-webkit-box-shadow:0 0 0 1000px transparent inset !important;transition:background-color 600000s 0s,color 600000s 0s !important;font-size:16px}
.fpm .fpd input[type=time],.fpm .fpd input[type=date]{color-scheme:dark}
.fpm .fpd select{color-scheme:dark}
.fpm .fpd select option{color:#0F172A;background:#FFFFFF}
/* kính mờ trên nền màu (chuông, nút tròn) — giống header Hôm nay */
.fp-glass{background:linear-gradient(180deg,rgba(255,255,255,0.19) 0%,rgba(255,255,255,0.07) 100%);border:1px solid rgba(255,255,255,0.24);box-shadow:0 8px 18px rgba(0,20,90,0.22),inset 0 1px 0 rgba(255,255,255,0.26);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
/* ô icon đặc màu: nét dày 2,2 cho rõ trên nền tối */
.fpm .dkic svg{stroke-width:2.2}
@media (hover:hover){.fpm .fpd .row-hover:hover{background:rgba(255,255,255,0.06)}.fpm .fpd .chip-hover:hover{border-color:rgba(255,255,255,0.4)}}
`;

// ============================================================
// PC (bản vẽ 117–120, chốt 16/10): khung Quản trị trên máy tính + khung điện thoại cho khách.
// Thanh bên navy 232px, thanh trên trắng 64px, nền nội dung #F4F7FC, thẻ trắng bo 14.
// ============================================================
export const PC = {
  bg: "#F4F7FC",            // nền vùng nội dung / nền trang khung điện thoại
  side: "linear-gradient(180deg,#0F4585,#022B57 60%,#011B37)", // thanh bên
  sideW: 232,
  topH: 64,
  line: "#E6ECF5",          // viền thanh trên / ngăn bên phải
  rowLine: "#F1F5F9",       // kẻ giữa các dòng bảng
  headLine: "#EEF2FA",      // kẻ dưới hàng tiêu đề bảng
  headBg: "#FAFBFE",        // nền hàng tiêu đề bảng
  rowSel: "#F5F9FF",        // dòng đang chọn / rê chuột
  editBg: "#EEF4FF",        // dòng sửa tại chỗ
  field: "#E2E8F0",         // viền ô nhập / bộ lọc
  fieldOn: "#93C5FD",       // viền ô số đang sửa
  t1: "#0F172A", t2: "#475569", t3: "#64748B", t4: "#94A3B8",
  soft: "#EEF4FF", softFg: "#0062F0", // nút phụ
  blue: "linear-gradient(135deg,#1A7CFF,#0062F0)",
  green: "linear-gradient(135deg,#16A34A,#059669)",
  badge: "#FCD34D", badgeFg: "#1E1B4B",
  dangerBg: "#FEE2E2", danger: "#B91C1C",
  shadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(30,64,175,0.06)",
  // pill: [nền, chữ]
  pill: { gray: ["#F1F5F9", "#475569"], blue: ["#DBEAFE", "#1E40AF"], amber: ["#FEF3C7", "#92400E"], green: ["#DCFCE7", "#166534"], red: ["#FEE2E2", "#B91C1C"], violet: ["#EDE9FE", "#5B21B6"] },
};
export const pcCard = { background: "#FFFFFF", borderRadius: 14, boxShadow: PC.shadow };
