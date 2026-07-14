// ============================================================
// LOCAL FOOD DATABASE — Macro per 100g (verified USDA + VN sources)
// Ưu tiên cao nhất: localDB → USDA (raw only) → AI fallback
// ============================================================

// Cooking modifiers — thay đổi macro khi chế biến (per 100g)
export const COOK_MODIFIERS = {
  // Không thay đổi
  "sống": {p:0, c:0, f:0, cal:0},
  "tươi": {p:0, c:0, f:0, cal:0},
  "raw": {p:0, c:0, f:0, cal:0},

  // Mất nước → macro cô đặc nhẹ
  "luộc": {p:1, c:0, f:0, cal:5},
  "hấp": {p:1, c:0, f:0, cal:5},

  // Nướng — mất nước + mỡ chảy ra
  "nướng": {p:2, c:0, f:1, cal:15},
  "nướng lò":{p:2, c:0, f:1, cal:15},

  // Xào — thêm dầu
  "xào": {p:0, c:0, f:5, cal:45},

  // Chiên — ngập dầu
  "chiên": {p:0, c:3, f:8, cal:80},
  "rán": {p:0, c:3, f:8, cal:80},

  // Chiên giòn — bột + dầu
  "chiên giòn":{p:0, c:8, f:10, cal:100},
  "tẩm bột chiên":{p:0, c:8, f:10, cal:100},

  // Áp chảo — chảo chống dính, không dầu (giống luộc)
  "áp chảo": {p:1, c:0, f:0, cal:5},

  // Kho — đường + dầu + nước mắm
  "kho": {p:0, c:3, f:2, cal:30},
  "rim": {p:0, c:4, f:2, cal:35},

  // Hầm — mềm, mất ít dinh dưỡng
  "hầm": {p:0, c:1, f:1, cal:12},
  "om": {p:0, c:1, f:1, cal:12},
  "tần": {p:0, c:1, f:0, cal:8},

  // Quay — mỡ chảy + giòn
  "quay": {p:1, c:2, f:5, cal:50},

  // Sấy — mất nước hoàn toàn, macro × ~3
  "sấy": {p:0, c:0, f:0, cal:0, note:"multiply_3x"},
  "sấy khô": {p:0, c:0, f:0, cal:0, note:"multiply_3x"},

  // Rang — hạt
  "rang": {p:0, c:0, f:2, cal:20},
  "roasted": {p:0, c:0, f:2, cal:20},

  // Muối/dầm — không đổi macro đáng kể
  "muối": {p:0, c:0, f:0, cal:0},
  "dầm": {p:0, c:2, f:0, cal:8},
  "ngâm": {p:0, c:1, f:0, cal:4},
};

// Các modifier "cô đặc do mất nước" — được hiệu chỉnh dựa trên hành vi của
// THỊT/CÁ/TRỨNG khi nấu (nước bay hơi hoặc mỡ chảy ra làm protein/calo trên
// 100g TĂNG lên). Áp dụng y hệt các modifier này cho rau củ/tinh bột (khoai,
// cơm, rau...) là SAI VỀ VẬT LÝ: khoai/rau khi luộc hoặc hấp thường HẤP THỤ
// THÊM nước, làm LOÃNG macro/100g chứ không cô đặc lên. Trước đây code cộng
// đều +1 protein/+5 cal cho MỌI loại thực phẩm khi "luộc/hấp/áp chảo" — gây
// sai lệch protein cho khoai lang/khoai tây luộc (bug đã xác nhận trong backlog).
// Các modifier THÊM dầu/đường thật sự (chiên/xào/kho/rim/chiên giòn...) vẫn
// áp dụng bình thường cho mọi loại — đó là hiệu ứng có thật, không phụ thuộc
// loại thực phẩm.
const WATER_LOSS_CONCENTRATION_MODIFIERS = new Set([
  "luộc", "hấp", "áp chảo", "nướng", "nướng lò", "hầm", "om", "tần", "quay",
]);
// Nhóm thực phẩm mà các modifier trên KHÔNG nên áp dụng (không phải thịt/cá/trứng)
const NON_MEAT_CATEGORIES = new Set(["starch", "veg", "fruit"]);

// ============================================================
// FOOD DATABASE — per 100g, base form (raw hoặc cooked phổ biến nhất)
// ============================================================
export const LOCAL_FOODS = {

  // ==================== 1. THỊT GIA CẦM ====================
  "ức gà": {p:23.1, c:0, f:1.2, cal:110, fiber:0, form:"raw", cat:"poultry"},
  "ức gà nướng": {p:31.0, c:0, f:3.6, cal:165, fiber:0, form:"cooked",cat:"poultry"},
  "ức gà luộc": {p:29.8, c:0, f:3.1, cal:151, fiber:0, form:"cooked",cat:"poultry"},
  "đùi gà": {p:17.3, c:0, f:15.3, cal:209, fiber:0, form:"raw", cat:"poultry"},
  "cánh gà": {p:17.5, c:0, f:15.1, cal:203, fiber:0, form:"raw", cat:"poultry"},
  "gà nguyên con":{p:17.4, c:0, f:15.1, cal:215, fiber:0, form:"raw", cat:"poultry"},
  "lòng gà": {p:17.5, c:1.4, f:5.6, cal:127, fiber:0, form:"raw", cat:"poultry"},
  "thịt vịt": {p:19.3, c:0, f:11.2, cal:180, fiber:0, form:"raw", cat:"poultry"},
  "vịt": {p:19.3, c:0, f:11.2, cal:180, fiber:0, form:"raw", cat:"poultry"},

  // ==================== 2. THỊT BÒ ====================
  "thăn bò": {p:26.0, c:0, f:8.0, cal:179, fiber:0, form:"raw", cat:"beef"},
  "bắp bò": {p:22.0, c:0, f:5.4, cal:140, fiber:0, form:"raw", cat:"beef"},
  "nạm bò": {p:18.0, c:0, f:16.0, cal:218, fiber:0, form:"raw", cat:"beef"},
  "gân bò": {p:36.7, c:0, f:0.5, cal:150, fiber:0, form:"raw", cat:"beef"},
  "thịt bò xay": {p:17.2, c:0, f:15.0, cal:215, fiber:0, form:"raw", cat:"beef"},
  "sườn bò": {p:17.5, c:0, f:22.6, cal:274, fiber:0, form:"raw", cat:"beef"},
  "thịt bò": {p:20.0, c:0, f:12.0, cal:192, fiber:0, form:"raw", cat:"beef"},
  "bò": {p:20.0, c:0, f:12.0, cal:192, fiber:0, form:"raw", cat:"beef"},
  "bò viên": {p:14.0, c:3.0, f:8.0, cal:140, fiber:0, form:"cooked",cat:"beef"},

  // ==================== 3. THỊT HEO ====================
  "thịt heo nạc":{p:27.3, c:0, f:3.5, cal:143, fiber:0, form:"raw", cat:"pork"},
  "thịt lợn nạc":{p:27.3, c:0, f:3.5, cal:143, fiber:0, form:"raw", cat:"pork"},
  "ba chỉ": {p:9.3, c:0, f:53.0, cal:518, fiber:0, form:"raw", cat:"pork"},
  "ba rọi": {p:9.3, c:0, f:53.0, cal:518, fiber:0, form:"raw", cat:"pork"},
  "sườn heo": {p:15.5, c:0, f:26.7, cal:304, fiber:0, form:"raw", cat:"pork"},
  "sườn lợn": {p:15.5, c:0, f:26.7, cal:304, fiber:0, form:"raw", cat:"pork"},
  "thịt heo xay":{p:16.9, c:0, f:21.2, cal:263, fiber:0, form:"raw", cat:"pork"},
  "thịt lợn xay":{p:16.9, c:0, f:21.2, cal:263, fiber:0, form:"raw", cat:"pork"},
  "nạc vai heo": {p:16.5, c:0, f:18.3, cal:233, fiber:0, form:"raw", cat:"pork"},
  "thịt heo": {p:20.5, c:0, f:11.0, cal:187, fiber:0, form:"raw", cat:"pork"},
  "thịt lợn": {p:20.5, c:0, f:11.0, cal:187, fiber:0, form:"raw", cat:"pork"},
  "heo": {p:20.5, c:0, f:11.0, cal:187, fiber:0, form:"raw", cat:"pork"},

  // ==================== 4. CÁ & HẢI SẢN ====================
  "cá hồi": {p:20.4, c:0, f:13.4, cal:208, fiber:0, form:"raw", cat:"seafood", tier:"occasional"},
  "cá ngừ": {p:29.9, c:0, f:1.0, cal:130, fiber:0, form:"raw", cat:"seafood"},
  "cá rô phi": {p:20.1, c:0, f:1.7, cal:96, fiber:0, form:"raw", cat:"seafood"},
  "cá basa": {p:15.0, c:0, f:6.0, cal:116, fiber:0, form:"raw", cat:"seafood"},
  "cá thu": {p:18.6, c:0, f:13.9, cal:205, fiber:0, form:"raw", cat:"seafood"},
  "cá diêu hồng":{p:18.0, c:0, f:2.0, cal:92, fiber:0, form:"raw", cat:"seafood"},
  "cá lóc": {p:18.2, c:0, f:2.5, cal:96, fiber:0, form:"raw", cat:"seafood"},
  "cá tra": {p:14.0, c:0, f:7.0, cal:120, fiber:0, form:"raw", cat:"seafood"},
  "cá nục": {p:19.5, c:0, f:4.2, cal:118, fiber:0, form:"raw", cat:"seafood"},
  "cá chép": {p:17.8, c:0, f:5.6, cal:127, fiber:0, form:"raw", cat:"seafood"},
  "cá saba": {p:18.6, c:0, f:13.9, cal:205, fiber:0, form:"raw", cat:"seafood"},
  "cá": {p:18.0, c:0, f:5.0, cal:120, fiber:0, form:"raw", cat:"seafood"},
  "tôm": {p:24.0, c:0.2, f:0.3, cal:99, fiber:0, form:"raw", cat:"seafood"},
  "tôm sú": {p:21.0, c:0, f:0.6, cal:90, fiber:0, form:"raw", cat:"seafood", tier:"occasional"},
  "mực": {p:15.6, c:3.1, f:1.4, cal:92, fiber:0, form:"raw", cat:"seafood"},
  "ngao": {p:12.8, c:3.6, f:1.0, cal:74, fiber:0, form:"raw", cat:"seafood"},
  "nghêu": {p:12.8, c:3.6, f:1.0, cal:74, fiber:0, form:"raw", cat:"seafood"},
  "cua": {p:18.1, c:0, f:1.1, cal:83, fiber:0, form:"raw", cat:"seafood", tier:"occasional"},
  "hàu": {p:9.0, c:4.7, f:2.5, cal:81, fiber:0, form:"raw", cat:"seafood", tier:"occasional"},
  "bạch tuộc": {p:14.9, c:2.2, f:1.0, cal:82, fiber:0, form:"raw", cat:"seafood", tier:"occasional"},
  "cá ngừ hộp": {p:26.5, c:0, f:0.8, cal:116, fiber:0, form:"cooked",cat:"seafood"},

  // ==================== 5. TRỨNG & SỮA ====================
  "trứng gà": {p:12.6, c:0.7, f:9.5, cal:143, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng gà luộc":{p:12.6, c:0.7, f:9.5, cal:143, fiber:0, form:"cooked",cat:"egg_dairy"},
  "trứng": {p:12.6, c:0.7, f:9.5, cal:143, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng luộc": {p:12.6, c:0.7, f:9.5, cal:143, fiber:0, form:"cooked",cat:"egg_dairy"},
  "trứng vịt": {p:12.8, c:1.4, f:13.8, cal:185, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng vịt luộc":{p:12.8, c:1.4, f:13.8, cal:185, fiber:0, form:"cooked",cat:"egg_dairy"},
  "trứng cút": {p:13.1, c:0.4, f:11.1, cal:158, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng cút luộc":{p:13.1, c:0.4, f:11.1, cal:158, fiber:0, form:"cooked",cat:"egg_dairy"},
  "lòng trắng trứng":{p:10.9,c:0.7,f:0.2,cal:52, fiber:0, form:"raw", cat:"egg_dairy"},
  "lòng đỏ trứng":{p:15.9,c:3.6,f:26.5, cal:322, fiber:0, form:"raw", cat:"egg_dairy"},
  "sữa tươi": {p:3.2, c:4.8, f:3.3, cal:61, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa": {p:3.2, c:4.8, f:3.3, cal:61, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa tách béo":{p:3.4, c:5.0, f:0.1, cal:34, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa đậu nành":{p:3.3, c:6.3, f:1.8, cal:54, fiber:0.6,form:"liquid",cat:"egg_dairy"},
  "sữa chua": {p:3.5, c:4.7, f:3.3, cal:61, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa chua hy lạp":{p:10.0,c:3.6,f:0.7, cal:59, fiber:0, form:"liquid",cat:"egg_dairy", tier:"occasional"},
  "phô mai": {p:25.0, c:1.3, f:33.1, cal:403, fiber:0, form:"solid", cat:"egg_dairy", tier:"occasional"},
  "bơ": {p:0.9, c:0.1, f:81.1, cal:717, fiber:0, form:"solid", cat:"egg_dairy"},

  // ==================== 6. TINH BỘT & NGŨ CỐC ====================
  "cơm trắng": {p:2.7, c:28.2,f:0.3, cal:130, fiber:0.4,form:"cooked",cat:"starch"},
  "cơm": {p:2.7, c:28.2,f:0.3, cal:130, fiber:0.4,form:"cooked",cat:"starch"},
  "cơm gạo lứt": {p:2.6, c:23.5,f:0.9, cal:112, fiber:1.8,form:"cooked",cat:"starch"},
  "gạo lứt": {p:7.9, c:77.2,f:2.9, cal:370, fiber:3.5,form:"dry", cat:"starch"},
  "khoai lang": {p:1.6, c:20.1,f:0.1, cal:86, fiber:3.0,form:"raw", cat:"starch"},
  "khoai tây": {p:2.1, c:17.5,f:0.1, cal:77, fiber:2.2,form:"raw", cat:"starch"},
  "khoai sọ": {p:1.5, c:26.5,f:0.2, cal:112, fiber:4.1,form:"raw", cat:"starch"},
  "khoai môn": {p:1.5, c:26.5,f:0.2, cal:112, fiber:4.1,form:"raw", cat:"starch"},
  "yến mạch": {p:16.9, c:66.3,f:6.9, cal:389, fiber:10.6,form:"dry", cat:"starch"},
  "bột yến mạch": {p:16.9, c:66.3,f:6.9, cal:389, fiber:10.6,form:"dry", cat:"starch"},
  "bánh mì": {p:9.0, c:49.0,f:3.2, cal:265, fiber:2.7,form:"cooked",cat:"starch"},
  "bánh mì đen": {p:10.0, c:43.0,f:3.5, cal:247, fiber:6.0,form:"cooked",cat:"starch"},
  "bún": {p:3.4, c:24.9,f:0.1, cal:109, fiber:0.4,form:"cooked",cat:"starch"},
  "miến": {p:0.1, c:86.1,f:0.1, cal:334, fiber:0.5,form:"dry", cat:"starch"},
  // bánh phở — bún gạo dẹt, cùng nhóm bún/miến, tỉ lệ macro gần như giống hệt bún
  // (đều là mì gạo trắng đã nấu chín) nên lấy đúng số của "bún" cho nhất quán,
  // không tự bịa số khác biệt không có cơ sở.
  "bánh phở": {p:3.4, c:24.9,f:0.1, cal:109, fiber:0.4,form:"cooked",cat:"starch"},
  "mì": {p:4.5, c:25.0, f:2.0, cal:138, fiber:1.2, form:"cooked", cat:"starch"},
  "hủ tiếu": {p:1.8, c:24.0, f:0.3, cal:107, fiber:0.9, form:"cooked", cat:"starch"},
  "bánh cuốn": {p:3.0, c:22.0, f:1.5, cal:115, fiber:0.5, form:"cooked", cat:"starch"},
  // cháo (cháo trắng) — gạo nấu với nhiều nước hơn cơm nhiều lần (~1:8-10 so với
  // ~1:1.2-1.5 của cơm) nên mật độ calo/100g thấp hơn "cơm trắng" (130 kcal) rất
  // nhiều — số tham khảo theo tỉ lệ pha loãng thông thường, KHÔNG phải số đo
  // trực tiếp, cần verify lại nếu có nguồn chính xác hơn.
  "cháo": {p:0.6, c:6.5, f:0.1, cal:30, fiber:0.1, form:"cooked", cat:"starch"},
  "mì ý": {p:5.8, c:30.9,f:0.9, cal:158, fiber:1.8,form:"cooked",cat:"starch"},
  "ngô": {p:3.3, c:19.0,f:1.5, cal:86, fiber:2.7,form:"raw", cat:"starch"},
  "bắp": {p:3.3, c:19.0,f:1.5, cal:86, fiber:2.7,form:"raw", cat:"starch"},
  "xôi": {p:3.5, c:37.0,f:0.6, cal:168, fiber:0.3,form:"cooked",cat:"starch"},
  "bánh tráng": {p:3.0, c:80.0,f:0.5, cal:330, fiber:0.5,form:"dry", cat:"starch"},

  // ==================== 7. TRÁI CÂY ====================
  "chuối": {p:1.1, c:22.8,f:0.3, cal:89, fiber:2.6,form:"raw", cat:"fruit"},
  "táo": {p:0.3, c:13.8,f:0.2, cal:52, fiber:2.4,form:"raw", cat:"fruit"},
  "cam": {p:0.9, c:11.8,f:0.1, cal:47, fiber:2.4,form:"raw", cat:"fruit"},
  "bưởi": {p:0.8, c:10.7,f:0.1, cal:42, fiber:1.6,form:"raw", cat:"fruit"},
  "xoài": {p:0.8, c:15.0,f:0.4, cal:60, fiber:1.6,form:"raw", cat:"fruit"},
  "ổi": {p:2.6, c:14.3,f:1.0, cal:68, fiber:5.4,form:"raw", cat:"fruit"},
  "dưa hấu": {p:0.6, c:7.6, f:0.2, cal:30, fiber:0.4,form:"raw", cat:"fruit"},
  "nho": {p:0.7, c:18.1,f:0.2, cal:69, fiber:0.9,form:"raw", cat:"fruit"},
  "dâu tây": {p:0.7, c:7.7, f:0.3, cal:32, fiber:2.0,form:"raw", cat:"fruit"},
  "thanh long": {p:1.1, c:11.0,f:0.4, cal:50, fiber:3.0,form:"raw", cat:"fruit"},
  "bơ quả": {p:2.0, c:8.5, f:14.7, cal:160, fiber:6.7,form:"raw", cat:"fruit"},
  "quả bơ": {p:2.0, c:8.5, f:14.7, cal:160, fiber:6.7,form:"raw", cat:"fruit"},
  "đu đủ": {p:0.5, c:10.8,f:0.3, cal:43, fiber:1.7,form:"raw", cat:"fruit"},
  "kiwi": {p:1.1, c:14.7,f:0.5, cal:61, fiber:3.0,form:"raw", cat:"fruit"},
  "lê": {p:0.4, c:15.2,f:0.1, cal:57, fiber:3.1,form:"raw", cat:"fruit"},
  "mận": {p:0.7, c:11.4,f:0.3, cal:46, fiber:1.4,form:"raw", cat:"fruit"},
  "vải": {p:0.8, c:16.5,f:0.4, cal:66, fiber:1.3,form:"raw", cat:"fruit"},
  "chôm chôm": {p:0.7, c:16.0,f:0.2, cal:68, fiber:0.9,form:"raw", cat:"fruit"},
  "sầu riêng": {p:1.5, c:27.1,f:5.3, cal:147, fiber:3.8,form:"raw", cat:"fruit"},
  "mít": {p:1.7, c:23.2,f:0.6, cal:95, fiber:1.5,form:"raw", cat:"fruit"},
  "dừa": {p:3.3, c:15.2,f:33.5, cal:354, fiber:9.0,form:"raw", cat:"fruit"},
  "chanh": {p:1.1, c:9.3, f:0.3, cal:29, fiber:2.8,form:"raw", cat:"fruit"},
  "việt quất": {p:0.7, c:14.5,f:0.3, cal:57, fiber:2.4,form:"raw", cat:"fruit"},
  "na": {p:1.7, c:23.6,f:0.6, cal:94, fiber:4.4,form:"raw", cat:"fruit"},
  "sapoche": {p:0.4, c:20.0,f:1.1, cal:83, fiber:5.3,form:"raw", cat:"fruit"},
  "măng cụt": {p:0.4, c:17.9,f:0.6, cal:73, fiber:1.8,form:"raw", cat:"fruit"},

  // ==================== 8. RAU CỦ ====================
  "bông cải xanh":{p:2.8, c:7.0, f:0.4, cal:34, fiber:2.6,form:"raw", cat:"veg"},
  "bông cải trắng":{p:1.9, c:5.0, f:0.3, cal:25, fiber:2.0,form:"raw", cat:"veg"},
  "rau bina": {p:2.9, c:3.6, f:0.4, cal:23, fiber:2.2,form:"raw", cat:"veg"},
  "rau muống": {p:2.6, c:3.1, f:0.2, cal:19, fiber:2.1,form:"raw", cat:"veg"},
  "rau dền": {p:2.5, c:4.0, f:0.3, cal:23, fiber:2.0,form:"raw", cat:"veg"},
  "rau ngót": {p:5.3, c:3.4, f:0.7, cal:36, fiber:2.0,form:"raw", cat:"veg"},
  "mồng tơi": {p:1.8, c:3.4, f:0.3, cal:19, fiber:1.6,form:"raw", cat:"veg"},
  "rau cải": {p:1.5, c:2.2, f:0.2, cal:13, fiber:1.0,form:"raw", cat:"veg"},
  "cải thảo": {p:1.2, c:2.0, f:0.2, cal:12, fiber:1.2,form:"raw", cat:"veg"},
  "bắp cải": {p:1.3, c:5.8, f:0.1, cal:25, fiber:2.5,form:"raw", cat:"veg"},
  "xà lách": {p:1.4, c:2.9, f:0.2, cal:15, fiber:1.3,form:"raw", cat:"veg"},
  "cà chua": {p:0.9, c:3.9, f:0.2, cal:18, fiber:1.2,form:"raw", cat:"veg"},
  "dưa chuột": {p:0.7, c:3.6, f:0.1, cal:15, fiber:0.5,form:"raw", cat:"veg"},
  "dưa leo": {p:0.7, c:3.6, f:0.1, cal:15, fiber:0.5,form:"raw", cat:"veg"},
  "cà rốt": {p:0.9, c:9.6, f:0.2, cal:41, fiber:2.8,form:"raw", cat:"veg"},
  "hành tây": {p:1.1, c:9.3, f:0.1, cal:40, fiber:1.7,form:"raw", cat:"veg"},
  "ớt chuông": {p:1.0, c:6.0, f:0.3, cal:26, fiber:2.1,form:"raw", cat:"veg"},
  "nấm": {p:3.1, c:3.3, f:0.3, cal:22, fiber:1.0,form:"raw", cat:"veg"},
  "đậu bắp": {p:1.9, c:7.5, f:0.2, cal:33, fiber:3.2,form:"raw", cat:"veg"},
  "bí đỏ": {p:1.0, c:6.5, f:0.1, cal:26, fiber:0.5,form:"raw", cat:"veg"},
  "bí xanh": {p:1.2, c:3.1, f:0.3, cal:17, fiber:1.0,form:"raw", cat:"veg"},
  "su su": {p:0.8, c:4.5, f:0.1, cal:19, fiber:1.7,form:"raw", cat:"veg"},
  "su hào": {p:1.7, c:6.2, f:0.1, cal:27, fiber:3.6,form:"raw", cat:"veg"},
  "măng": {p:2.6, c:5.2, f:0.3, cal:27, fiber:2.2,form:"raw", cat:"veg"},
  "măng tây": {p:2.2, c:3.9, f:0.1, cal:20, fiber:2.1,form:"raw", cat:"veg"},
  "giá đỗ": {p:3.0, c:5.9, f:0.2, cal:31, fiber:1.8,form:"raw", cat:"veg"},
  "đậu cô ve": {p:1.8, c:7.0, f:0.1, cal:31, fiber:3.4,form:"raw", cat:"veg"},
  "đậu que": {p:1.8, c:7.0, f:0.1, cal:31, fiber:3.4,form:"raw", cat:"veg"},
  "đậu phụ": {p:8.0, c:1.9, f:4.8, cal:76, fiber:0.3,form:"solid", cat:"veg"},
  "tỏi": {p:6.4, c:33.1,f:0.5, cal:149, fiber:2.1,form:"raw", cat:"veg"},
  "gừng": {p:1.8, c:17.8,f:0.8, cal:80, fiber:2.0,form:"raw", cat:"veg"},

  // ==================== 9. ĐẬU / HẠT / DẦU ====================
  "đậu nành": {p:36.5, c:30.2,f:19.9, cal:446, fiber:9.3,form:"dry", cat:"nuts"},
  "đậu đen": {p:21.6, c:62.4,f:1.4, cal:341, fiber:15.5,form:"dry", cat:"nuts"},
  "đậu xanh": {p:23.9, c:62.6,f:1.2, cal:347, fiber:16.3,form:"dry", cat:"nuts"},
  "đậu đỏ": {p:22.5, c:60.0,f:0.5, cal:333, fiber:15.2,form:"dry", cat:"nuts"},
  "đậu lăng": {p:25.8, c:60.1,f:1.1, cal:352, fiber:10.7,form:"dry", cat:"nuts"},
  "edamame": {p:11.9, c:8.4, f:5.2, cal:121, fiber:5.2,form:"cooked",cat:"nuts"},
  "lạc": {p:25.8, c:16.1,f:49.2, cal:567, fiber:8.5,form:"raw", cat:"nuts"},
  "đậu phộng": {p:25.8, c:16.1,f:49.2, cal:567, fiber:8.5,form:"raw", cat:"nuts"},
  "hạt điều": {p:18.2, c:30.2,f:43.9, cal:553, fiber:3.3,form:"raw", cat:"nuts", tier:"occasional"},
  "hạnh nhân": {p:21.2, c:21.6,f:49.9, cal:579, fiber:12.5,form:"raw", cat:"nuts", tier:"occasional"},
  "hạt óc chó": {p:15.2, c:13.7,f:65.2, cal:654, fiber:6.7,form:"raw", cat:"nuts", tier:"occasional"},
  "hạt chia": {p:16.5, c:42.1,f:30.7, cal:486, fiber:34.4,form:"dry", cat:"nuts"},
  "hạt lanh": {p:18.3, c:28.9,f:42.2, cal:534, fiber:27.3,form:"dry", cat:"nuts"},
  "hạt bí": {p:30.2, c:10.7,f:49.1, cal:559, fiber:6.0,form:"raw", cat:"nuts"},
  "hạt hướng dương":{p:20.8,c:20.0,f:51.5,cal:584,fiber:8.6,form:"raw", cat:"nuts"},
  "mè": {p:17.7, c:23.5,f:49.7, cal:573, fiber:11.8,form:"raw", cat:"nuts"},
  "vừng": {p:17.7, c:23.5,f:49.7, cal:573, fiber:11.8,form:"raw", cat:"nuts"},
  "hạt mắc ca": {p:7.9, c:13.8,f:75.8, cal:718, fiber:8.6,form:"raw", cat:"nuts"},
  "bơ đậu phộng":{p:25.1, c:20.0,f:50.4, cal:588, fiber:6.0,form:"solid", cat:"nuts"},
  "dầu ô liu": {p:0, c:0, f:100, cal:884, fiber:0, form:"liquid",cat:"nuts", tier:"occasional"},
  "dầu dừa": {p:0, c:0, f:100, cal:862, fiber:0, form:"liquid",cat:"nuts"},
  "dầu ăn": {p:0, c:0, f:100, cal:884, fiber:0, form:"liquid",cat:"nuts"},
  "dầu mè": {p:0, c:0, f:100, cal:884, fiber:0, form:"liquid",cat:"nuts"},

  // ==================== 10. GIA VỊ & NƯỚC CHẤM ====================
  "nước mắm": {p:5.1, c:3.6, f:0, cal:35, fiber:0, form:"liquid",cat:"sauce"},
  "xì dầu": {p:5.6, c:4.9, f:0.1, cal:53, fiber:0, form:"liquid",cat:"sauce"},
  "nước tương": {p:5.6, c:4.9, f:0.1, cal:53, fiber:0, form:"liquid",cat:"sauce"},
  "mật ong": {p:0.3, c:82.4,f:0, cal:304, fiber:0.2,form:"liquid",cat:"sauce"},
  "đường": {p:0, c:100, f:0, cal:387, fiber:0, form:"dry", cat:"sauce"},
  "tương ớt": {p:0.9, c:32.5,f:0.5, cal:130, fiber:1.5,form:"liquid",cat:"sauce"},
  "mayonnaise": {p:1.0, c:0.6, f:79.4, cal:717, fiber:0, form:"liquid",cat:"sauce"},

  // ==================== 11. BỔ SUNG GYM ====================
  "whey": {p:80.0, c:7.0, f:3.0, cal:380, fiber:0, form:"powder",cat:"supp"},
  "bột whey": {p:80.0, c:7.0, f:3.0, cal:380, fiber:0, form:"powder",cat:"supp"},
  "whey isolate":{p:90.0, c:2.0, f:1.0, cal:375, fiber:0, form:"powder",cat:"supp"},
  "mass gainer": {p:15.0, c:75.0,f:3.0, cal:390, fiber:1.0,form:"powder",cat:"supp"},
  "casein": {p:80.0, c:5.0, f:2.0, cal:360, fiber:0, form:"powder",cat:"supp"},
  "protein bar": {p:25.0, c:35.0,f:12.0, cal:350, fiber:5.0,form:"solid", cat:"supp"},
  "granola": {p:10.0, c:64.0,f:18.0, cal:471, fiber:5.0,form:"dry", cat:"supp"},
  "granola bar": {p:8.0, c:60.0,f:14.0, cal:400, fiber:3.0,form:"solid", cat:"supp"},
  "creatine": {p:0, c:0, f:0, cal:0, fiber:0, form:"powder",cat:"supp"},
  "bcaa": {p:0, c:0, f:0, cal:0, fiber:0, form:"powder",cat:"supp"},

  // ==================== 12. CHẾ BIẾN SẴN ====================
  "xúc xích": {p:12.0, c:2.0, f:28.0, cal:301, fiber:0, form:"cooked",cat:"processed"},
  "giò": {p:15.5, c:2.0, f:5.5, cal:120, fiber:0, form:"cooked",cat:"processed"},
  "chả lụa": {p:15.5, c:2.0, f:5.5, cal:120, fiber:0, form:"cooked",cat:"processed"},
  "chả": {p:14.0, c:3.0, f:8.0, cal:140, fiber:0, form:"cooked",cat:"processed"},
  "nem": {p:8.0, c:20.0,f:12.0, cal:220, fiber:1.0,form:"cooked",cat:"processed"},
  "patê": {p:11.4, c:1.5, f:28.0, cal:319, fiber:0, form:"cooked",cat:"processed"},

  // ==================== 13. ĐỒ UỐNG ====================
  "nước dừa": {p:0.7, c:3.7, f:0.2, cal:19, fiber:0, form:"liquid",cat:"drink"},
  "nước cam": {p:0.7, c:10.4,f:0.2, cal:45, fiber:0.2,form:"liquid",cat:"drink"},
  "cà phê đen": {p:0.1, c:0, f:0, cal:2, fiber:0, form:"liquid",cat:"drink"},
  "cà phê": {p:0.1, c:0, f:0, cal:2, fiber:0, form:"liquid",cat:"drink"},
  "trà xanh": {p:0, c:0, f:0, cal:1, fiber:0, form:"liquid",cat:"drink"},
};

// Keys sorted longest first for greedy matching
const LOCAL_KEYS = Object.keys(LOCAL_FOODS).sort((a, b) => b.length - a.length);
const COOK_KEYS = Object.keys(COOK_MODIFIERS).sort((a, b) => b.length - a.length);

// ============================================================
// LOOKUP: search localDB with cooking modifier support
// Returns null if not found
// ============================================================
export function lookupLocalFood(nameVN, gram) {
  const lower = (nameVN || "").toLowerCase().trim();
  if (!lower) return null;

  // 1. Try exact match first (e.g. "ức gà nướng" is a dedicated entry)
  if (LOCAL_FOODS[lower]) {
    return scaleFood(LOCAL_FOODS[lower], lower, gram, null);
  }

  // 2. Find food base + cooking modifier
  let foodKey = null;
  let cookKey = null;

  for (const key of LOCAL_KEYS) {
    if (lower.includes(key)) {
      foodKey = key;
      break;
    }
  }

  if (!foodKey) return null;

  // Find cooking method in remaining text
  const remaining = lower.replace(foodKey, "").trim();
  for (const ck of COOK_KEYS) {
    if (remaining.includes(ck) || lower.includes(ck)) {
      cookKey = ck;
      break;
    }
  }

  return scaleFood(LOCAL_FOODS[foodKey], foodKey, gram, cookKey);
}

// ============================================================
// SCALE: apply gram + cooking modifier
// ============================================================
function scaleFood(base, foodKey, gram, cookKey) {
  const g = gram===0?0:(gram||100);
  const r = g / 100;

  // FIX: modifier "cô đặc do mất nước" (luộc/hấp/áp chảo/nướng/hầm/quay...)
  // chỉ hợp lý về vật lý cho thịt/cá/trứng. Với rau củ/tinh bột/trái cây,
  // luộc/hấp thường làm LOÃNG macro/100g (hấp thụ thêm nước) chứ không cô
  // đặc lên — nên bỏ qua modifier loại này cho các nhóm đó (macro giữ nguyên
  // như dạng sống, chỉ có tên hiển thị đổi theo cách chế biến).
  const isWaterLossMod = cookKey && WATER_LOSS_CONCENTRATION_MODIFIERS.has(cookKey);
  const shouldSkipMod = isWaterLossMod && NON_MEAT_CATEGORIES.has(base.cat);
  const mod = (cookKey && !shouldSkipMod) ? COOK_MODIFIERS[cookKey] : null;

  // Base per 100g
  let p = base.p;
  let c = base.c;
  let f = base.f;
  let cal = base.cal;
  let fiber = base.fiber || 0;

  // Apply cooking modifier (per 100g)
  if (mod) {
    if (mod.note === "multiply_3x") {
      // Sấy khô: macro × 3 (mất 70% nước) — đúng vật lý cho MỌI loại thực
      // phẩm (rau/trái cây sấy khô cũng cô đặc mạnh do mất nước gần hết),
      // nên không nằm trong danh sách loại trừ ở trên.
      p *= 3; c *= 3; f *= 3; cal *= 3; fiber *= 3;
    } else {
      p += mod.p;
      c += mod.c;
      f += mod.f;
      cal += mod.cal;
    }
  }

  // Scale to gram
  return {
    name: foodKey + (cookKey ? ` (${cookKey})` : ""),
    gram: g,
    protein: Math.round(p * r * 10) / 10,
    carb: Math.round(c * r * 10) / 10,
    fat: Math.round(f * r * 10) / 10,
    fiber: Math.round(fiber * r * 10) / 10,
    cal: Math.round(cal * r),
    source: "localDB",
    cook: cookKey || null,
    cat: base.cat,
  };
}

// ============================================================
// GET ALL FOODS (for admin/reference)
// ============================================================
export function getAllFoods() {
  return Object.entries(LOCAL_FOODS).map(([key, val]) => ({
    name: key,
    ...val,
  }));
}

export function getFoodCount() {
  return Object.keys(LOCAL_FOODS).length;
}

// ============================================================
// VAI TRÒ DINH DƯỠNG — dùng cho Meal Engine (tự tính gram khớp target)
// role: "protein" | "carb" | "fat" | "fixed" (rau/gia vị — giữ nguyên gram,
// không scale). Mặc định suy theo `cat` sẵn có, chỉ liệt kê ngoại lệ lệch
// khỏi mặc định của nhóm — KHÔNG gắn tay cho từng món trong 196 món để
// tránh gõ sai (rút kinh nghiệm từ vụ "khoai tây carb nhanh" gắn sai).
// ============================================================
const ROLE_BY_CAT = {
  poultry: "protein", beef: "protein", pork: "protein", seafood: "protein",
  egg_dairy: "protein", // trứng — sữa/phô mai/bơ override riêng bên dưới
  starch: "carb",
  fruit: "fixed", veg: "fixed",
  nuts: "fat", // dầu/hạt khô — đậu (trừ đậu nành) override thành carb bên dưới
  sauce: "fixed", drink: "fixed",
  supp: "protein", // whey/casein/protein bar — mass gainer/granola override carb
  processed: "protein", // xúc xích/giò/chả/nem/patê — đạm từ thịt là chính
};

const ROLE_OVERRIDE = {
  // Sữa/sữa chua — ít khi dùng làm nguồn đạm/carb chính trong 1 bữa, giữ cố định
  "sữa tươi": "fixed", "sữa": "fixed", "sữa tách béo": "fixed",
  "sữa đậu nành": "fixed", "sữa chua": "fixed", "sữa chua hy lạp": "fixed",
  // Phô mai/bơ — chất béo thật, dù nằm chung nhóm egg_dairy với trứng
  "phô mai": "fat", "bơ": "fat",
  // Đậu phụ — đạm là chính dù nằm ở nhóm rau củ
  "đậu phụ": "protein",
  // Đậu nành khô — đạm cao nhất bảng (36.5g/100g), không phải béo dù cùng nhóm hạt/dầu
  "đậu nành": "protein",
  // Các loại đậu hạt (trừ đậu nành, vốn đạm cao hơn cả carb) — carb chiếm ưu thế
  "đậu đen": "carb", "đậu xanh": "carb", "đậu đỏ": "carb", "đậu lăng": "carb", "edamame": "carb",
  // Mass gainer/granola — năng lượng carb là chính dù có kèm đạm
  "mass gainer": "carb", "granola": "carb", "granola bar": "carb",
  // Creatine/bcaa — không có macro thật, không đóng vai trò gì trong scale
  "creatine": "fixed", "bcaa": "fixed",
};

export function getFoodRole(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (ROLE_OVERRIDE[key]) return ROLE_OVERRIDE[key];
  const item = LOCAL_FOODS[key];
  if (!item) return "fixed";
  return ROLE_BY_CAT[item.cat] || "fixed";
}

// ============================================================
// GIỚI HẠN GRAM — chặn Meal Engine ra kết quả vô lý (VD "520g cơm").
// Chỉ liệt kê món hay dùng làm NGUỒN CHÍNH (đạm/carb/béo phổ biến nhất) —
// món không có trong bảng dùng giới hạn mặc định theo vai trò.
// ============================================================
const GRAM_LIMIT_OVERRIDE = {
  "ức gà": { min: 80, max: 300 }, "ức gà luộc": { min: 80, max: 300 }, "ức gà nướng": { min: 80, max: 300 },
  "đùi gà": { min: 80, max: 280 }, "thịt vịt": { min: 80, max: 280 },
  "thịt bò": { min: 80, max: 250 }, "thăn bò": { min: 80, max: 250 }, "thịt bò xay": { min: 80, max: 250 },
  "thịt heo nạc": { min: 80, max: 250 }, "thịt lợn nạc": { min: 80, max: 250 }, "thịt heo xay": { min: 80, max: 250 },
  "cá hồi": { min: 80, max: 250 }, "cá ngừ": { min: 80, max: 250 }, "cá": { min: 80, max: 250 },
  "tôm": { min: 60, max: 200 }, "mực": { min: 60, max: 200 },
  "trứng gà": { min: 50, max: 200 }, "trứng": { min: 50, max: 200 }, "trứng gà luộc": { min: 50, max: 200 },
  "đậu phụ": { min: 100, max: 300 },
  "cơm trắng": { min: 80, max: 450 }, "cơm": { min: 80, max: 450 }, "cơm gạo lứt": { min: 80, max: 450 },
  "khoai lang": { min: 100, max: 400 }, "khoai tây": { min: 100, max: 400 },
  "bánh mì": { min: 30, max: 200 }, "bún": { min: 100, max: 350 }, "mì": { min: 100, max: 300 }, "hủ tiếu": { min: 100, max: 350 }, "bánh cuốn": { min: 150, max: 400 }, "miến": { min: 50, max: 250 }, "bánh phở": { min: 100, max: 350 },
  "cháo": { min: 200, max: 500 }, // 1 tô cháo thường 300-400g, nhiều nước hơn cơm/bún nên sàn/trần cao hơn
  "yến mạch": { min: 10, max: 100 }, "xôi": { min: 80, max: 350 },
  "dầu ăn": { min: 5, max: 30 }, "dầu ô liu": { min: 5, max: 30 }, "dầu mè": { min: 5, max: 20 },
  "bơ đậu phộng": { min: 10, max: 40 }, "hạt điều": { min: 10, max: 40 }, "hạnh nhân": { min: 10, max: 40 },
  // Bột đạm — đo bằng scoop (~30g/scoop), không phải thực phẩm nguyên miếng như thịt/cá,
  // nên KHÔNG dùng sàn mặc định 50g theo vai trò protein (quá cao so với 1 scoop thật,
  // gây Engine ép dư đạm khi bữa chỉ còn thiếu ít). 15g~nửa scoop, 60g~2 scoop.
  "whey": { min: 15, max: 60 },
  // Snack drivers — khi làm nguồn đạm/carb của bữa phụ cần trần thực tế
  // (không có thì rơi về fixed 1000g khi engine scale)
  "sữa chua": { min: 100, max: 300 }, "sữa chua hy lạp": { min: 100, max: 250 },
  "sữa tươi": { min: 100, max: 400 }, "chuối": { min: 50, max: 250 },
  "granola": { min: 20, max: 60 }, "ngô": { min: 100, max: 300 }, "bắp": { min: 100, max: 300 },
  "mật ong": { min: 5, max: 30 }, "bột whey": { min: 15, max: 60 }, "whey isolate": { min: 15, max: 60 }, "casein": { min: 15, max: 60 },
};

// Giới hạn mặc định theo vai trò — áp dụng cho món KHÔNG có trong bảng trên
const DEFAULT_LIMIT_BY_ROLE = {
  protein: { min: 50, max: 300 },
  carb: { min: 50, max: 350 },
  fat: { min: 5, max: 50 },
  fixed: { min: 0, max: 1000 }, // gần như không giới hạn, Meal Engine không scale nhóm này
};

export function getGramLimit(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (GRAM_LIMIT_OVERRIDE[key]) return GRAM_LIMIT_OVERRIDE[key];
  const role = getFoodRole(key);
  return DEFAULT_LIMIT_BY_ROLE[role] || DEFAULT_LIMIT_BY_ROLE.fixed;
}

// ============================================================
// ===== AI MENU V2 — FOOD METADATA (Bước 2) ==================
// Chỉ THÊM metadata, không sửa data/logic cũ phía trên.
// ============================================================

// ------------------------------------------------------------
// mealOverride — món LỆCH khỏi điểm hợp-bữa mặc định của nhóm
// (CAT_MEAL_SCORE trong mealGrammar.js). Gắn vào entry runtime
// để getMealScore đọc item.mealOverride — sau này chuyển DB/API
// là 1 bảng duy nhất, không có file override riêng.
// VD: cháo thuộc starch (sáng mặc định 8) nhưng là món sáng
// đặc trưng → sang:10. Cơm thuộc starch nhưng KHÔNG AI ăn cơm
// bữa sáng → sang:1 (validator sẽ chặn dưới MIN_SLOT_SCORE=3).
// ------------------------------------------------------------
const MEAL_OVERRIDE_DATA = {
  // Món sáng đặc trưng VN — nâng điểm sáng
  "cháo":          { sang: 10, toi: 6 },
  "bánh phở":      { sang: 10 },
  "bún":           { sang: 9 },
  "bánh mì":       { sang: 10 },
  "bánh mì đen":   { sang: 9 },
  "xôi":           { sang: 10, toi: 3 },   // tối ăn xôi lạ
  "bánh cuốn":     { sang: 10, toi: 4 },
  "hủ tiếu":       { sang: 9 },
  "yến mạch":      { sang: 9 },
  "bột yến mạch":  { sang: 9 },
  "patê":          { sang: 9 },            // bánh mì patê
  "giò":           { sang: 8 },            // xôi giò, bánh mì giò
  "chả lụa":       { sang: 8 },
  "cá ngừ hộp":    { sang: 6 },            // bánh mì cá hộp
  // Cấm cơm bữa sáng — văn hóa VN không nấu cơm sáng
  "cơm trắng":     { sang: 1 },
  "cơm":           { sang: 1 },
  "cơm gạo lứt":   { sang: 1 },
  "gạo lứt":       { sang: 1 },
  "mì ý":          { sang: 1 },
  // Bữa phụ chuẩn VN — nâng điểm phụ
  "khoai lang":    { sang: 9, phu_sang: 9, phu_chieu: 9 },
  "ngô":           { phu_sang: 9, phu_chieu: 9 },
  "bắp":           { phu_sang: 9, phu_chieu: 9 },
};
Object.entries(MEAL_OVERRIDE_DATA).forEach(([k, v]) => {
  if (LOCAL_FOODS[k]) LOCAL_FOODS[k].mealOverride = v;
});

// ------------------------------------------------------------
// CONVENIENCE — độ tiện lợi 1-10 (10 = mua sẵn/ăn liền,
// 1 = nấu lâu). Style "Tiện lợi" lọc theo ngưỡng ≥ 6.
// Cat-level mặc định + override cho món lệch khỏi nhóm.
// ------------------------------------------------------------
export const CAT_CONVENIENCE = {
  poultry: 4, beef: 3, pork: 3, seafood: 3,
  egg_dairy: 9, starch: 6, fruit: 10, veg: 5,
  nuts: 8, sauce: 10, supp: 10, processed: 9, drink: 10,
};

const CONVENIENCE_OVERRIDE = {
  // Đạm mua sẵn được (cơm hộp, quán, siêu thị)
  "ức gà nướng": 8, "ức gà luộc": 7,
  "trứng gà luộc": 10, "trứng luộc": 10, "trứng vịt luộc": 10, "trứng cút luộc": 10,
  "cá ngừ hộp": 10, "đậu phụ": 7, "tôm": 5,
  // Tinh bột: mua sẵn vs nấu
  "bánh mì": 10, "bánh mì đen": 9, "xôi": 10, "bánh cuốn": 9,
  "cháo": 8, "bánh phở": 8, "bún": 8, "hủ tiếu": 8, "miến": 7,
  "cơm trắng": 6, "cơm": 6, "cơm gạo lứt": 5,
  "khoai lang": 9, "khoai tây": 6, "ngô": 9, "bắp": 9,
  "yến mạch": 8, "bột yến mạch": 8,
};

export function getConvenienceScore(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (CONVENIENCE_OVERRIDE[key] !== undefined) return CONVENIENCE_OVERRIDE[key];
  const item = LOCAL_FOODS[key];
  if (!item) return 5;
  return CAT_CONVENIENCE[item.cat] ?? 5;
}

// ------------------------------------------------------------
// DISPLAY_MAP — tên món hiển thị trên UI. LOOKUP 1:1 THUẦN,
// KHÔNG suy luận runtime. Data tĩnh duyệt tay 1 lần: key nguyên
// liệu → tên món phổ biến nhất trong bữa VN (VD "bí đỏ" →
// "Canh bí đỏ"). Phase 2 tách variant (nướng/kho/hấp) thành
// key riêng, DISPLAY_MAP vẫn chỉ lookup.
// AI KHÔNG BAO GIỜ đặt tên món — chỉ trả food key.
// ------------------------------------------------------------
const DISPLAY_MAP = {
  // POULTRY
  "ức gà": "Ức gà áp chảo", "ức gà nướng": "Ức gà nướng", "ức gà luộc": "Gà luộc",
  "đùi gà": "Đùi gà kho", "cánh gà": "Cánh gà chiên", "gà nguyên con": "Gà luộc",
  "lòng gà": "Lòng gà xào", "thịt vịt": "Vịt luộc", "vịt": "Vịt luộc",
  // BEEF
  "thăn bò": "Bò xào", "bắp bò": "Bắp bò luộc", "nạm bò": "Nạm bò kho",
  "gân bò": "Gân bò hầm", "thịt bò xay": "Bò xay xào", "sườn bò": "Sườn bò nướng",
  "thịt bò": "Bò xào", "bò": "Bò xào", "bò viên": "Bò viên",
  // PORK
  "thịt heo nạc": "Thịt heo luộc", "thịt lợn nạc": "Thịt lợn luộc",
  "ba chỉ": "Ba chỉ luộc", "ba rọi": "Ba rọi luộc",
  "sườn heo": "Sườn heo rim", "sườn lợn": "Sườn rim",
  "thịt heo xay": "Thịt băm rang", "thịt lợn xay": "Thịt băm rang",
  "nạc vai heo": "Nạc vai rang", "thịt heo": "Thịt heo luộc",
  "thịt lợn": "Thịt lợn luộc", "heo": "Thịt heo luộc",
  // SEAFOOD
  "cá hồi": "Cá hồi áp chảo", "cá ngừ": "Cá ngừ kho", "cá rô phi": "Cá rô phi kho",
  "cá basa": "Cá basa kho", "cá thu": "Cá thu sốt cà", "cá diêu hồng": "Cá diêu hồng hấp",
  "cá lóc": "Cá lóc kho", "cá tra": "Cá tra kho", "cá nục": "Cá nục kho",
  "cá chép": "Cá chép om", "cá saba": "Cá saba nướng", "cá": "Cá kho",
  "tôm": "Tôm hấp", "tôm sú": "Tôm sú hấp", "mực": "Mực hấp",
  "ngao": "Ngao hấp", "nghêu": "Nghêu hấp", "cua": "Cua hấp",
  "hàu": "Hàu nướng", "bạch tuộc": "Bạch tuộc hấp", "cá ngừ hộp": "Cá ngừ hộp",
  // EGG_DAIRY
  "trứng gà": "Trứng luộc", "trứng gà luộc": "Trứng luộc", "trứng": "Trứng luộc",
  "trứng luộc": "Trứng luộc", "trứng vịt": "Trứng vịt luộc", "trứng vịt luộc": "Trứng vịt luộc",
  "trứng cút": "Trứng cút luộc", "trứng cút luộc": "Trứng cút luộc",
  "lòng trắng trứng": "Lòng trắng trứng", "lòng đỏ trứng": "Lòng đỏ trứng",
  "sữa tươi": "Sữa tươi", "sữa": "Sữa tươi", "sữa tách béo": "Sữa tách béo",
  "sữa đậu nành": "Sữa đậu nành", "sữa chua": "Sữa chua", "sữa chua hy lạp": "Sữa chua Hy Lạp",
  "phô mai": "Phô mai", "bơ": "Bơ",
  // STARCH
  "cơm trắng": "Cơm trắng", "cơm": "Cơm trắng", "cơm gạo lứt": "Cơm gạo lứt",
  "gạo lứt": "Cơm gạo lứt", "khoai lang": "Khoai lang luộc", "khoai tây": "Khoai tây luộc",
  "khoai sọ": "Khoai sọ luộc", "khoai môn": "Khoai môn luộc",
  "yến mạch": "Yến mạch nấu", "bột yến mạch": "Yến mạch nấu",
  "bánh mì": "Bánh mì", "bánh mì đen": "Bánh mì đen", "bún": "Bún",
  "miến": "Miến", "bánh phở": "Phở", "mì": "Mì", "hủ tiếu": "Hủ tiếu",
  "bánh cuốn": "Bánh cuốn", "cháo": "Cháo", "mì ý": "Mì Ý",
  "ngô": "Ngô luộc", "bắp": "Bắp luộc", "xôi": "Xôi", "bánh tráng": "Bánh tráng",
  // FRUIT
  "chuối": "Chuối", "táo": "Táo", "cam": "Cam", "bưởi": "Bưởi", "xoài": "Xoài",
  "ổi": "Ổi", "dưa hấu": "Dưa hấu", "nho": "Nho", "dâu tây": "Dâu tây",
  "thanh long": "Thanh long", "bơ quả": "Quả bơ", "quả bơ": "Quả bơ",
  "đu đủ": "Đu đủ", "kiwi": "Kiwi", "lê": "Lê", "mận": "Mận", "vải": "Vải",
  "chôm chôm": "Chôm chôm", "sầu riêng": "Sầu riêng", "mít": "Mít", "dừa": "Dừa",
  "chanh": "Chanh", "việt quất": "Việt quất", "na": "Na", "sapoche": "Sapoche",
  "măng cụt": "Măng cụt",
  // VEG — tên món phổ biến nhất bữa VN
  "bông cải xanh": "Bông cải xanh luộc", "bông cải trắng": "Bông cải trắng luộc",
  "rau bina": "Rau bina luộc", "rau muống": "Rau muống luộc", "rau dền": "Canh rau dền",
  "rau ngót": "Canh rau ngót", "mồng tơi": "Canh mồng tơi", "rau cải": "Rau cải luộc",
  "cải thảo": "Cải thảo luộc", "bắp cải": "Bắp cải luộc", "xà lách": "Xà lách",
  "cà chua": "Cà chua", "dưa chuột": "Dưa chuột", "dưa leo": "Dưa leo",
  "cà rốt": "Cà rốt luộc", "hành tây": "Hành tây", "ớt chuông": "Ớt chuông xào",
  "nấm": "Nấm xào", "đậu bắp": "Đậu bắp luộc", "bí đỏ": "Canh bí đỏ",
  "bí xanh": "Canh bí xanh", "su su": "Su su luộc", "su hào": "Su hào luộc",
  "măng": "Măng luộc", "măng tây": "Măng tây xào", "giá đỗ": "Giá đỗ",
  "đậu cô ve": "Đậu cô ve luộc", "đậu que": "Đậu que luộc", "đậu phụ": "Đậu phụ",
  "tỏi": "Tỏi", "gừng": "Gừng",
  // NUTS
  "đậu nành": "Đậu nành", "đậu đen": "Chè đậu đen", "đậu xanh": "Chè đậu xanh",
  "đậu đỏ": "Chè đậu đỏ", "đậu lăng": "Đậu lăng", "edamame": "Đậu nành Nhật",
  "lạc": "Lạc rang", "đậu phộng": "Đậu phộng rang", "hạt điều": "Hạt điều",
  "hạnh nhân": "Hạnh nhân", "hạt óc chó": "Hạt óc chó", "hạt chia": "Hạt chia",
  "hạt lanh": "Hạt lanh", "hạt bí": "Hạt bí", "hạt hướng dương": "Hạt hướng dương",
  "mè": "Mè rang", "vừng": "Vừng rang", "hạt mắc ca": "Hạt mắc ca",
  "bơ đậu phộng": "Bơ đậu phộng", "dầu ô liu": "Dầu ô liu", "dầu dừa": "Dầu dừa",
  "dầu ăn": "Dầu ăn", "dầu mè": "Dầu mè",
  // SAUCE
  "nước mắm": "Nước mắm", "xì dầu": "Xì dầu", "nước tương": "Nước tương",
  "mật ong": "Mật ong", "đường": "Đường", "tương ớt": "Tương ớt",
  "mayonnaise": "Mayonnaise",
  // SUPP
  "whey": "Whey protein", "bột whey": "Whey protein", "whey isolate": "Whey isolate",
  "mass gainer": "Mass gainer", "casein": "Casein", "protein bar": "Protein bar",
  "granola": "Granola", "granola bar": "Granola bar", "creatine": "Creatine", "bcaa": "BCAA",
  // PROCESSED
  "xúc xích": "Xúc xích", "giò": "Giò lụa", "chả lụa": "Chả lụa", "chả": "Chả",
  "nem": "Nem rán", "patê": "Patê",
  // DRINK
  "nước dừa": "Nước dừa", "nước cam": "Nước cam", "cà phê đen": "Cà phê đen",
  "cà phê": "Cà phê", "trà xanh": "Trà xanh",
};

export function getFoodDisplay(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (DISPLAY_MAP[key]) return DISPLAY_MAP[key];
  // Fallback an toàn: viết hoa chữ đầu — không bao giờ hiện tên bịa
  return key.charAt(0).toUpperCase() + key.slice(1);
}
