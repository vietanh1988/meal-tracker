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
  "khô": {p:0, c:0, f:0, cal:0, note:"multiply_3x"},

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

  // ==================== 2. THỊT BÒ ====================
  "thăn bò": {p:26.0, c:0, f:8.0, cal:179, fiber:0, form:"raw", cat:"beef"},
  "bắp bò": {p:22.0, c:0, f:5.4, cal:140, fiber:0, form:"raw", cat:"beef"},
  "nạm bò": {p:18.0, c:0, f:16.0, cal:218, fiber:0, form:"raw", cat:"beef"},
  "gân bò": {p:36.7, c:0, f:0.5, cal:150, fiber:0, form:"raw", cat:"beef"},
  "thịt bò xay": {p:17.2, c:0, f:15.0, cal:215, fiber:0, form:"raw", cat:"beef"},
  "sườn bò": {p:17.5, c:0, f:22.6, cal:274, fiber:0, form:"raw", cat:"beef"},
  "thịt bò": {p:20.0, c:0, f:12.0, cal:192, fiber:0, form:"raw", cat:"beef"},
  "bò viên": {p:14.0, c:3.0, f:8.0, cal:140, fiber:0, form:"cooked",cat:"beef"},
  "bò khô": {p:62.0, c:0, f:12.0, cal:405, fiber:0, form:"cooked",cat:"beef"},

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
  "tôm tươi": {p:24.0, c:0.2, f:0.3, cal:99, fiber:0, form:"raw", cat:"seafood"},
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
  "trứng luộc": {p:12.6, c:0.7, f:9.5, cal:143, fiber:0, form:"cooked",cat:"egg_dairy"},
  "trứng vịt": {p:12.8, c:1.4, f:13.8, cal:185, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng vịt luộc":{p:12.8, c:1.4, f:13.8, cal:185, fiber:0, form:"cooked",cat:"egg_dairy"},
  "trứng cút": {p:13.1, c:0.4, f:11.1, cal:158, fiber:0, form:"raw", cat:"egg_dairy"},
  "trứng cút luộc":{p:13.1, c:0.4, f:11.1, cal:158, fiber:0, form:"cooked",cat:"egg_dairy"},
  "lòng trắng trứng":{p:10.9,c:0.7,f:0.2,cal:52, fiber:0, form:"raw", cat:"egg_dairy"},
  "lòng đỏ trứng":{p:15.9,c:3.6,f:26.5, cal:322, fiber:0, form:"raw", cat:"egg_dairy"},
  "sữa tươi": {p:3.2, c:4.8, f:3.3, cal:61, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa tách béo":{p:3.4, c:5.0, f:0.1, cal:34, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa đậu nành":{p:3.3, c:6.3, f:1.8, cal:54, fiber:0.6,form:"liquid",cat:"egg_dairy"},
  "sữa chua": {p:3.5, c:4.7, f:3.3, cal:61, fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa chua hy lạp":{p:10.0,c:3.6,f:0.7, cal:59, fiber:0, form:"liquid",cat:"egg_dairy", tier:"occasional"},
  "phô mai": {p:25.0, c:1.3, f:33.1, cal:403, fiber:0, form:"solid", cat:"egg_dairy", tier:"occasional"},
  "bơ lạt": {p:0.9, c:0.1, f:81.1, cal:717, fiber:0, form:"solid", cat:"egg_dairy"},

  // ==================== 6. TINH BỘT & NGŨ CỐC ====================
  "cơm trắng": {p:2.7, c:28.2,f:0.3, cal:130, fiber:0.4,form:"cooked",cat:"starch"},
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
  "giò lụa": {p:15.5, c:2.0, f:5.5, cal:120, fiber:0, form:"cooked",cat:"processed"},
  "chả lụa": {p:15.5, c:2.0, f:5.5, cal:120, fiber:0, form:"cooked",cat:"processed"},
  "chả quế": {p:14.0, c:3.0, f:8.0, cal:140, fiber:0, form:"cooked",cat:"processed"},
  "nem": {p:8.0, c:20.0,f:12.0, cal:220, fiber:1.0,form:"cooked",cat:"processed"},
  "patê": {p:11.4, c:1.5, f:28.0, cal:319, fiber:0, form:"cooked",cat:"processed"},

  // ==================== 13. ĐỒ UỐNG ====================
  "nước dừa": {p:0.7, c:3.7, f:0.2, cal:19, fiber:0, form:"liquid",cat:"drink"},
  "nước cam": {p:0.7, c:10.4,f:0.2, cal:45, fiber:0.2,form:"liquid",cat:"drink"},
  "cà phê đen": {p:0.1, c:0, f:0, cal:2, fiber:0, form:"liquid",cat:"drink"},
  "cà phê": {p:0.1, c:0, f:0, cal:2, fiber:0, form:"liquid",cat:"drink"},
  "trà xanh": {p:0, c:0, f:0, cal:1, fiber:0, form:"liquid",cat:"drink"},

  // ==================== 14. MÓN COMPOSITE (per 100g cả tô/đĩa) ====================
  // Macro tính theo công thức thật (nước dùng + bánh/bún + thịt + rau), per 100g tổng.
  // form:"composite" — engine dùng trực tiếp, KHÔNG áp cooking modifier.
  // Standalone → validator chặn không ghép thêm carb/protein rời.
  "phở bò":       {p:5.5, c:8.2, f:1.8, cal:72, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "phở gà":       {p:5.8, c:8.0, f:1.5, cal:68, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "bún bò huế":   {p:5.0, c:7.5, f:2.5, cal:73, fiber:0.4, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bún riêu":     {p:4.5, c:7.0, f:2.0, cal:65, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bún chả":      {p:6.0, c:7.8, f:3.5, cal:88, fiber:0.4, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bún thịt nướng":{p:5.5, c:8.0, f:3.0, cal:82, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "hủ tiếu nam vang":{p:5.2, c:8.5, f:2.0, cal:73, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bánh canh":    {p:4.8, c:9.0, f:1.5, cal:69, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "mì quảng":     {p:5.0, c:8.5, f:2.5, cal:77, fiber:0.4, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "cháo gà":      {p:3.5, c:6.5, f:1.0, cal:50, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "cháo thịt bằm":{p:3.0, c:6.5, f:1.5, cal:52, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "xôi xéo":      {p:4.0, c:30.0,f:5.0, cal:182, fiber:0.8, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "xôi gà":       {p:6.0, c:28.0,f:4.5, cal:178, fiber:0.6, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "xôi lạc":      {p:5.5, c:29.0,f:6.0, cal:192, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "bánh cuốn nhân thịt":{p:5.0, c:14.0,f:2.5, cal:100, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bánh mì thịt": {p:8.0, c:25.0,f:6.0, cal:188, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:9},
  "cơm tấm":      {p:7.5, c:22.0,f:5.0, cal:165, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bún đậu mắm tôm":{p:7.0, c:8.0, f:5.5, cal:110, fiber:0.8, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},

  // ==================== 15. BATCH 1 — BỔ SUNG PROTEIN THIẾU ====================
  // Nguồn: Viện Dinh dưỡng VN + USDA cross-check. Per 100g raw (trừ ghi chú khác).
  "thịt đùi heo":  {p:20.5, c:0, f:14.0, cal:211, fiber:0, form:"raw", cat:"pork"},
  "chân giò heo":  {p:18.0, c:0, f:18.5, cal:240, fiber:0, form:"raw", cat:"pork"},
  "thịt đùi gà":   {p:17.3, c:0, f:15.3, cal:209, fiber:0, form:"raw", cat:"poultry"},
  "gà ta":          {p:20.0, c:0, f:10.0, cal:172, fiber:0, form:"raw", cat:"poultry"},
  "ngan":           {p:16.0, c:0, f:15.0, cal:201, fiber:0, form:"raw", cat:"poultry"},
  "cá rô":          {p:18.0, c:0, f:2.5, cal:96, fiber:0, form:"raw", cat:"seafood"},
  "cá trê":         {p:17.0, c:0, f:3.5, cal:100, fiber:0, form:"raw", cat:"seafood"},
  "cá bạc má":      {p:19.0, c:0, f:6.0, cal:134, fiber:0, form:"raw", cat:"seafood"},
  "cá cơm":         {p:17.0, c:0, f:4.5, cal:110, fiber:0, form:"raw", cat:"seafood"},
  "tôm sú":         {p:21.0, c:0, f:0.6, cal:90, fiber:0, form:"raw", cat:"seafood"},
  "lươn":           {p:18.4, c:0, f:11.7, cal:184, fiber:0, form:"raw", cat:"seafood"},
  "ếch":            {p:16.4, c:0, f:0.3, cal:73, fiber:0, form:"raw", cat:"seafood"},
  "gan heo":        {p:21.4, c:3.8, f:3.6, cal:136, fiber:0, form:"raw", cat:"pork"},
  "gan gà":         {p:16.9, c:0.7, f:4.8, cal:119, fiber:0, form:"raw", cat:"poultry"},
  "lòng heo":       {p:14.0, c:0, f:4.1, cal:100, fiber:0, form:"raw", cat:"pork"},
  "trứng vịt lộn":  {p:13.6, c:1.0, f:10.0, cal:182, fiber:0, form:"cooked", cat:"egg_dairy"},

  // ==================== 16. BATCH 1 — BỔ SUNG TINH BỘT + RAU THIẾU ====================
  "khoai mì":       {p:1.4, c:38.1, f:0.3, cal:160, fiber:1.8, form:"raw", cat:"starch"},
  "sắn":            {p:1.4, c:38.1, f:0.3, cal:160, fiber:1.8, form:"raw", cat:"starch"},
  "bánh bao":       {p:7.0, c:30.0, f:5.0, cal:195, fiber:1.0, form:"cooked", cat:"starch"},
  "cải bó xôi":     {p:2.9, c:3.6, f:0.4, cal:23, fiber:2.2, form:"raw", cat:"veg"},
  "rau đay":        {p:3.5, c:5.3, f:0.3, cal:32, fiber:1.7, form:"raw", cat:"veg"},
  "mướp":           {p:0.4, c:3.0, f:0.2, cal:15, fiber:0.5, form:"raw", cat:"veg"},
  "khổ qua":        {p:1.0, c:3.7, f:0.2, cal:17, fiber:2.8, form:"raw", cat:"veg"},
  "mướp đắng":      {p:1.0, c:3.7, f:0.2, cal:17, fiber:2.8, form:"raw", cat:"veg"},
  "cà tím":         {p:1.0, c:5.9, f:0.2, cal:25, fiber:3.0, form:"raw", cat:"veg"},

  // ==================== 17. BATCH 1 — BỔ SUNG ĐỒ UỐNG + CHẾ BIẾN SẴN ====================
  "cà phê sữa đá":  {p:1.5, c:15.0, f:2.0, cal:85, fiber:0, form:"liquid", cat:"drink"},
  "trà sữa":        {p:1.5, c:25.0, f:3.5, cal:130, fiber:0, form:"liquid", cat:"drink"},
  "nước mía":        {p:0.1, c:18.0, f:0, cal:73, fiber:0, form:"liquid", cat:"drink"},
  "sữa đặc":        {p:7.9, c:54.4, f:8.7, cal:321, fiber:0, form:"liquid", cat:"egg_dairy"},
  "lạp xưởng":      {p:14.0, c:6.0, f:32.0, cal:370, fiber:0, form:"cooked", cat:"processed"},
  "ruốc heo":       {p:34.0, c:8.0, f:12.0, cal:280, fiber:0, form:"cooked", cat:"processed"},
  "chả giò":        {p:8.0, c:18.0, f:14.0, cal:230, fiber:1.0, form:"cooked", cat:"processed"},

  // ==================== 18. BATCH 2 — TRÁI CÂY VN THIẾU ====================
  "dứa":            {p:0.5, c:13.1, f:0.1, cal:50, fiber:1.4, form:"raw", cat:"fruit"},
  "thơm":           {p:0.5, c:13.1, f:0.1, cal:50, fiber:1.4, form:"raw", cat:"fruit"},
  "nhãn":           {p:1.0, c:15.0, f:0, cal:48, fiber:1.1, form:"raw", cat:"fruit"},
  "quýt":           {p:0.8, c:13.3, f:0.3, cal:53, fiber:1.8, form:"raw", cat:"fruit"},
  "hồng xiêm":      {p:0.4, c:20.0, f:1.1, cal:83, fiber:5.3, form:"raw", cat:"fruit"},
  "mãng cầu":       {p:1.0, c:22.8, f:0.3, cal:94, fiber:3.3, form:"raw", cat:"fruit"},
  "dưa lưới":       {p:0.8, c:8.2, f:0.2, cal:34, fiber:0.9, form:"raw", cat:"fruit"},
  "roi":            {p:0.6, c:12.4, f:0.3, cal:49, fiber:5.4, form:"raw", cat:"fruit"},
  "đào":            {p:0.9, c:10.1, f:0.3, cal:39, fiber:1.5, form:"raw", cat:"fruit"},

  // ==================== 19. BATCH 2 — ĐỒ UỐNG VN ====================
  "bạc xỉu":        {p:2.0, c:12.0, f:3.0, cal:85, fiber:0, form:"liquid", cat:"drink"},
  "cà phê sữa":     {p:1.5, c:15.0, f:2.0, cal:85, fiber:0, form:"liquid", cat:"drink"},
  "trà đá":         {p:0, c:0, f:0, cal:1, fiber:0, form:"liquid", cat:"drink"},
  "trà chanh":       {p:0, c:8.0, f:0, cal:32, fiber:0, form:"liquid", cat:"drink"},
  "sinh tố bơ":      {p:2.5, c:18.0, f:8.0, cal:155, fiber:3.0, form:"liquid", cat:"drink"},
  "sinh tố chuối":   {p:2.0, c:20.0, f:1.5, cal:95, fiber:1.5, form:"liquid", cat:"drink"},
  "nước ép cà rốt":  {p:0.9, c:9.3, f:0.2, cal:40, fiber:0.8, form:"liquid", cat:"drink"},
  "ca cao":          {p:3.5, c:12.0, f:3.0, cal:90, fiber:1.0, form:"liquid", cat:"drink"},

  // ==================== 20. BATCH 2 — GIA VỊ + NƯỚC CHẤM THIẾU ====================
  "mắm tôm":        {p:10.0, c:2.0, f:1.5, cal:62, fiber:0, form:"liquid", cat:"sauce"},
  "dầu hào":        {p:1.0, c:11.0, f:0, cal:51, fiber:0, form:"liquid", cat:"sauce"},
  "muối":           {p:0, c:0, f:0, cal:0, fiber:0, form:"dry", cat:"sauce"},
  "bột nêm":        {p:5.0, c:18.0, f:0.5, cal:97, fiber:0, form:"dry", cat:"sauce"},
  "sa tế":          {p:2.0, c:10.0, f:20.0, cal:230, fiber:2.0, form:"liquid", cat:"sauce"},

  // ==================== 21. BATCH 2 — ĐẠM KHÁC ====================
  "thịt dê":        {p:20.6, c:0, f:3.4, cal:109, fiber:0, form:"raw", cat:"beef"},
  "cá diêu hồng kho":{p:22.0, c:2.0, f:3.5, cal:128, fiber:0, form:"cooked", cat:"seafood"},
  "tôm đồng":       {p:18.0, c:0, f:1.0, cal:82, fiber:0, form:"raw", cat:"seafood"},
  "ốc":             {p:14.0, c:4.0, f:0.4, cal:79, fiber:0, form:"raw", cat:"seafood"},
  "nghêu hấp":      {p:14.0, c:5.0, f:1.2, cal:86, fiber:0, form:"cooked", cat:"seafood"},

  // ==================== 22. BATCH 3 — COMPOSITE VN (canh + món mặn) ====================
  // Per 100g cả tô/bát — tính từ công thức (rau/nước dùng + thịt + gia vị)
  "canh chua cá":   {p:4.0, c:3.5, f:1.0, cal:40, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "canh rau ngót":   {p:1.6, c:1.5, f:1.4, cal:23, fiber:0.6, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh bí đỏ":      {p:1.0, c:4.0, f:0.5, cal:25, fiber:0.5, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh mồng tơi":   {p:1.5, c:2.0, f:0.5, cal:18, fiber:0.8, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh cua":        {p:3.5, c:2.5, f:1.0, cal:35, fiber:0.5, form:"composite", cat:"veg", region:"vn", complexity:2, convenience:5},
  "canh bầu":        {p:0.8, c:2.5, f:0.3, cal:16, fiber:0.4, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh khổ qua":    {p:2.5, c:3.0, f:1.0, cal:30, fiber:1.0, form:"composite", cat:"veg", region:"vn", complexity:2, convenience:5},
  "thịt kho":        {p:15.0, c:3.0, f:12.0, cal:185, fiber:0, form:"composite", cat:"pork", region:"vn", complexity:2, convenience:6},
  "cá kho tộ":       {p:14.0, c:4.0, f:5.0, cal:120, fiber:0, form:"composite", cat:"seafood", region:"vn", complexity:2, convenience:6},
  "trứng kho":       {p:10.0, c:3.0, f:8.0, cal:128, fiber:0, form:"composite", cat:"egg_dairy", region:"vn", complexity:1, convenience:7},
  "gà kho gừng":     {p:18.0, c:3.0, f:8.0, cal:158, fiber:0, form:"composite", cat:"poultry", region:"vn", complexity:2, convenience:6},
  "tôm rang":        {p:20.0, c:2.0, f:5.0, cal:135, fiber:0, form:"composite", cat:"seafood", region:"vn", complexity:1, convenience:7},
  "cơm chiên":       {p:5.0, c:25.0, f:6.0, cal:175, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},

  // ==================== 23. BATCH 3 — NẤM CHI TIẾT + ĐẬU + RAU ====================
  "nấm rơm":        {p:3.5, c:4.0, f:0.5, cal:30, fiber:1.5, form:"raw", cat:"veg"},
  "nấm hương":      {p:2.2, c:6.8, f:0.5, cal:34, fiber:2.5, form:"raw", cat:"veg"},
  "nấm kim châm":   {p:2.7, c:7.8, f:0.3, cal:37, fiber:2.7, form:"raw", cat:"veg"},
  "nấm đùi gà":    {p:3.3, c:6.1, f:0.4, cal:33, fiber:1.8, form:"raw", cat:"veg"},
  "mộc nhĩ":        {p:0.5, c:7.0, f:0.1, cal:25, fiber:5.0, form:"dry", cat:"veg"},
  "nấm bào ngư":    {p:3.3, c:6.1, f:0.4, cal:33, fiber:2.3, form:"raw", cat:"veg"},
  "bầu":            {p:0.6, c:3.4, f:0.1, cal:14, fiber:0.5, form:"raw", cat:"veg"},
  "đậu đũa":        {p:2.8, c:8.4, f:0.4, cal:47, fiber:3.0, form:"raw", cat:"veg"},
  "rau sống":        {p:1.5, c:3.0, f:0.2, cal:18, fiber:1.5, form:"raw", cat:"veg"},
  "củ sen":          {p:1.6, c:16.0, f:0.1, cal:66, fiber:3.1, form:"raw", cat:"veg"},
  "ngó sen":         {p:2.6, c:9.3, f:0.1, cal:46, fiber:4.9, form:"raw", cat:"veg"},
  "hạt sen":         {p:4.1, c:17.3, f:0.1, cal:89, fiber:3.2, form:"raw", cat:"nuts"},

  // ==================== 24. BATCH 4 — BÁNH VN + GỎI ====================
  "bánh xèo":       {p:5.0, c:20.0, f:8.0, cal:170, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "gỏi cuốn":       {p:5.5, c:15.0, f:2.0, cal:100, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "nem rán":         {p:6.0, c:15.0, f:12.0, cal:195, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bánh khọt":       {p:4.0, c:18.0, f:7.0, cal:155, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh tráng trộn": {p:4.0, c:30.0, f:10.0, cal:310, fiber:1.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:9},
  "bánh tráng nướng":{p:3.0, c:28.0, f:8.0, cal:290, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:9},
  "gỏi ngó sen":     {p:3.0, c:8.0, f:1.5, cal:55, fiber:2.0, form:"composite", cat:"veg", region:"vn", complexity:2, convenience:5},

  // ==================== 25. BATCH 4 — FAST FOOD ====================
  "gà rán":         {p:18.0, c:12.0, f:15.0, cal:260, fiber:0.5, form:"cooked", cat:"poultry"},
  "hamburger":       {p:13.0, c:24.0, f:11.0, cal:250, fiber:1.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:10},
  "pizza":           {p:11.0, c:33.0, f:10.0, cal:266, fiber:2.0, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:10},
  "khoai tây chiên": {p:3.4, c:41.4, f:14.7, cal:312, fiber:3.8, form:"cooked", cat:"starch"},
  "hotdog":          {p:10.0, c:18.0, f:15.0, cal:247, fiber:0.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:10},

  // ==================== 26. BATCH 4 — CHÈ + TRÁNG MIỆNG ====================
  "chè đậu xanh":   {p:2.5, c:18.0, f:0.5, cal:85, fiber:1.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "chè đậu đỏ":     {p:2.0, c:20.0, f:0.3, cal:90, fiber:2.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "chè trôi nước":   {p:1.5, c:22.0, f:1.0, cal:100, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bánh flan":       {p:5.0, c:22.0, f:5.0, cal:150, fiber:0, form:"composite", cat:"egg_dairy", region:"vn", complexity:1, convenience:9},
  "rau câu":         {p:0.5, c:15.0, f:0, cal:60, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:9},
  "sương sáo":       {p:0.3, c:8.0, f:0, cal:32, fiber:0.5, form:"composite", cat:"drink", region:"vn", complexity:1, convenience:8},

  // ==================== 27. BATCH 4 — MÌ GÓI + TIỆN LỢI ====================
  "mì gói":          {p:8.0, c:55.0, f:17.0, cal:400, fiber:2.0, form:"dry", cat:"starch"},
  "phở gói":         {p:5.0, c:50.0, f:12.0, cal:330, fiber:1.0, form:"dry", cat:"starch"},

  // ==================== 28. BATCH 5 — MÓN QUỐC TẾ PHỔ BIẾN VN ====================
  "sushi":           {p:5.0, c:25.0, f:1.0, cal:130, fiber:0.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "kimbap":          {p:5.0, c:25.0, f:4.0, cal:150, fiber:1.0, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "tokbokki":        {p:3.8, c:48.8, f:0.7, cal:216, fiber:0.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:8},
  "ramen":           {p:5.0, c:20.0, f:3.0, cal:130, fiber:0.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:8},
  "pad thái":        {p:6.0, c:22.0, f:5.0, cal:160, fiber:1.0, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:7},
  "cà ri gà":        {p:8.0, c:6.0, f:10.0, cal:150, fiber:1.5, form:"composite", cat:"poultry", region:"intl", complexity:2, convenience:7},

  // ==================== 29. BATCH 5 — BIA RƯỢU + NƯỚC NGỌT ====================
  "bia":             {p:0.5, c:3.6, f:0, cal:43, fiber:0, form:"liquid", cat:"drink"},
  "rượu vang":       {p:0.1, c:2.6, f:0, cal:83, fiber:0, form:"liquid", cat:"drink"},
  "coca cola":       {p:0, c:10.6, f:0, cal:42, fiber:0, form:"liquid", cat:"drink"},
  "nước ngọt":       {p:0, c:10.6, f:0, cal:42, fiber:0, form:"liquid", cat:"drink"},
  "nước tăng lực":   {p:0, c:11.0, f:0, cal:45, fiber:0, form:"liquid", cat:"drink"},
  "sữa hạnh nhân":   {p:0.4, c:0.3, f:1.1, cal:15, fiber:0.2, form:"liquid", cat:"drink"},

  // ==================== 30. BATCH 5 — SNACK ====================
  "bim bim":         {p:5.0, c:55.0, f:28.0, cal:500, fiber:3.0, form:"dry", cat:"starch"},
  "bánh quy":        {p:6.0, c:68.0, f:18.0, cal:450, fiber:2.0, form:"dry", cat:"starch"},
  "chocolate đen":   {p:5.0, c:46.0, f:31.0, cal:500, fiber:7.0, form:"solid", cat:"nuts"},
  "kẹo":             {p:0, c:93.0, f:1.0, cal:380, fiber:0, form:"solid", cat:"starch"},
  "bánh bông lan":   {p:5.0, c:52.0, f:15.0, cal:360, fiber:0.5, form:"cooked", cat:"starch"},

  // ==================== 31. BATCH 5 — ĐỒ CHAY ====================
  "mì căn":          {p:75.0, c:14.0, f:1.8, cal:370, fiber:0.6, form:"cooked", cat:"veg"},
  "tempeh":          {p:19.0, c:9.4, f:11.0, cal:193, fiber:5.0, form:"cooked", cat:"veg"},

  // ==================== 32. BATCH 5 — BỔ SUNG COMPOSITE VN ====================
  "bún mọc":         {p:4.5, c:8.0, f:1.8, cal:68, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bún cá":          {p:5.0, c:7.5, f:1.5, cal:64, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "hủ tiếu xào":    {p:5.0, c:18.0, f:5.0, cal:140, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "mì xào":          {p:5.5, c:20.0, f:6.0, cal:158, fiber:0.8, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "lẩu thái":        {p:4.0, c:3.0, f:2.0, cal:48, fiber:0.5, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:7},
  "lẩu hải sản":     {p:5.0, c:2.0, f:1.5, cal:42, fiber:0.3, form:"composite", cat:"seafood", region:"vn", complexity:2, convenience:6},

  // ==================== 33. BATCH 6 — COMPOSITE VN BỔ SUNG ====================
  "bún ốc":          {p:5.0, c:7.0, f:2.0, cal:68, fiber:0.4, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "cháo lòng":       {p:4.0, c:6.0, f:2.0, cal:58, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "cháo hải sản":    {p:4.5, c:6.5, f:1.5, cal:56, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "cơm gà":          {p:7.0, c:22.0, f:4.0, cal:155, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:8},
  "cơm sườn":        {p:8.0, c:20.0, f:6.0, cal:168, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:8},
  "bánh chưng":      {p:5.0, c:28.0, f:4.0, cal:170, fiber:0.8, form:"composite", cat:"starch", region:"vn", complexity:3, convenience:8},
  "bánh tét":        {p:4.5, c:30.0, f:3.5, cal:168, fiber:0.6, form:"composite", cat:"starch", region:"vn", complexity:3, convenience:7},
  "bánh giò":        {p:5.0, c:20.0, f:3.0, cal:128, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:8},
  "bò lúc lắc":      {p:18.0, c:3.0, f:10.0, cal:178, fiber:0.3, form:"composite", cat:"beef", region:"vn", complexity:2, convenience:6},
  "gà nướng":        {p:25.0, c:0, f:8.0, cal:175, fiber:0, form:"cooked", cat:"poultry"},
  "cá chiên":        {p:16.0, c:5.0, f:12.0, cal:195, fiber:0, form:"cooked", cat:"seafood"},
  "rau xào thập cẩm":{p:2.5, c:5.0, f:4.0, cal:65, fiber:2.0, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "đậu phụ sốt cà":  {p:6.0, c:5.0, f:5.0, cal:90, fiber:0.8, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh sườn":       {p:3.5, c:2.0, f:2.0, cal:42, fiber:0.3, form:"composite", cat:"pork", region:"vn", complexity:2, convenience:5},

  // ==================== 34. BATCH 6 — BAKERY ====================
  "croissant":       {p:8.2, c:45.8, f:21.0, cal:406, fiber:2.3, form:"cooked", cat:"starch"},
  "donut":           {p:5.0, c:51.0, f:18.0, cal:380, fiber:1.5, form:"cooked", cat:"starch"},
  "bánh su kem":     {p:5.5, c:26.0, f:18.0, cal:286, fiber:0.5, form:"cooked", cat:"starch"},

  // ==================== 35. BATCH 6 — ĐÔNG LẠNH ====================
  "há cảo":          {p:7.0, c:20.0, f:5.0, cal:155, fiber:1.0, form:"cooked", cat:"starch"},
  "sủi cảo":         {p:8.0, c:22.0, f:4.0, cal:158, fiber:1.0, form:"cooked", cat:"starch"},
  "xíu mại":         {p:12.0, c:8.0, f:10.0, cal:175, fiber:0.5, form:"cooked", cat:"pork"},

  // ==================== 36. BATCH 7 — BỔ SUNG CUỐI ====================
  // Protein VN
  "thịt kho tàu":   {p:12.0, c:5.0, f:18.0, cal:235, fiber:0, form:"composite", cat:"pork", region:"vn", complexity:2, convenience:6},
  "gà luộc":         {p:25.0, c:0, f:7.4, cal:170, fiber:0, form:"cooked", cat:"poultry"},
  "heo quay":        {p:18.0, c:0, f:22.0, cal:275, fiber:0, form:"cooked", cat:"pork"},
  "vịt quay":        {p:16.0, c:0, f:20.0, cal:250, fiber:0, form:"cooked", cat:"poultry"},
  "cá kho":          {p:16.0, c:3.0, f:4.0, cal:115, fiber:0, form:"cooked", cat:"seafood"},
  "tôm chiên":       {p:18.0, c:10.0, f:12.0, cal:225, fiber:0, form:"cooked", cat:"seafood"},
  "cua rang muối":   {p:15.0, c:5.0, f:8.0, cal:155, fiber:0, form:"cooked", cat:"seafood"},

  // Rau VN phổ biến còn thiếu
  "rau mùng tơi":    {p:1.8, c:3.4, f:0.3, cal:19, fiber:1.6, form:"raw", cat:"veg"},
  "rau lang":        {p:2.6, c:5.0, f:0.3, cal:30, fiber:2.2, form:"raw", cat:"veg"},
  "lá lốt":          {p:2.2, c:5.0, f:0.5, cal:28, fiber:2.5, form:"raw", cat:"veg"},
  "sả":              {p:1.8, c:25.3, f:0.5, cal:99, fiber:0, form:"raw", cat:"veg"},
  "củ cải trắng":    {p:0.7, c:4.1, f:0.1, cal:18, fiber:1.6, form:"raw", cat:"veg"},

  // Đồ uống VN
  "trà đào":         {p:0, c:10.0, f:0, cal:40, fiber:0, form:"liquid", cat:"drink"},
  "nước chanh muối": {p:0.1, c:5.0, f:0, cal:20, fiber:0, form:"liquid", cat:"drink"},
  "sữa bắp":         {p:1.5, c:12.0, f:1.0, cal:62, fiber:0.5, form:"liquid", cat:"drink"},

  // Trái cây sấy
  "chuối sấy":       {p:3.3, c:68.4, f:0.9, cal:267, fiber:7.8, form:"dry", cat:"fruit"},
  "mít sấy":         {p:5.1, c:69.6, f:1.8, cal:285, fiber:4.5, form:"dry", cat:"fruit"},
  "xoài sấy":        {p:1.5, c:78.0, f:0.8, cal:319, fiber:2.4, form:"dry", cat:"fruit"},

  // ==================== 37. BATCH 8 — TINH BỘT BỔ SUNG ====================
  "nui":             {p:5.8, c:30.9, f:0.9, cal:158, fiber:1.8, form:"cooked", cat:"starch"},
  "bánh canh bột lọc":{p:0.5, c:24.0, f:0.1, cal:98, fiber:0, form:"cooked", cat:"starch"},
  "bột sắn dây":     {p:0.1, c:85.0, f:0, cal:340, fiber:0, form:"dry", cat:"starch"},
  "khoai lang tím":  {p:1.6, c:20.1, f:0.1, cal:86, fiber:3.0, form:"raw", cat:"starch"},
  "gạo nếp":         {p:6.8, c:77.0, f:1.0, cal:344, fiber:1.7, form:"dry", cat:"starch"},
  "bánh đúc":        {p:1.5, c:18.0, f:0.5, cal:82, fiber:0.3, form:"cooked", cat:"starch"},

  // ==================== 38. BATCH 8 — DAIRY BỔ SUNG ====================
  "sữa chua uống":   {p:2.0, c:12.0, f:1.0, cal:65, fiber:0, form:"liquid", cat:"egg_dairy"},
  "kem":             {p:3.5, c:24.0, f:11.0, cal:207, fiber:0, form:"solid", cat:"egg_dairy"},
  "sữa bột":         {p:26.3, c:38.4, f:26.7, cal:496, fiber:0, form:"dry", cat:"egg_dairy"},
  "sữa dừa":         {p:2.3, c:2.7, f:24.0, cal:230, fiber:0, form:"liquid", cat:"egg_dairy"},
  "nước cốt dừa":    {p:2.3, c:2.7, f:24.0, cal:230, fiber:0, form:"liquid", cat:"egg_dairy"},
  "kem tươi":        {p:2.5, c:16.0, f:20.0, cal:260, fiber:0, form:"liquid", cat:"egg_dairy"},

  // ==================== 39. BATCH 8 — COMPOSITE VN BỔ SUNG ====================
  "bún bò xào":      {p:6.0, c:12.0, f:5.0, cal:120, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "phở xào":         {p:5.5, c:15.0, f:5.5, cal:130, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "cơm rang dưa bò": {p:6.0, c:22.0, f:5.0, cal:160, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "miến xào":        {p:3.5, c:20.0, f:4.0, cal:130, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "canh cải":        {p:1.5, c:2.0, f:0.5, cal:18, fiber:1.0, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "canh rau đay":    {p:2.0, c:2.5, f:0.8, cal:24, fiber:1.0, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "gà xào sả ớt":   {p:18.0, c:3.0, f:8.0, cal:160, fiber:0.3, form:"composite", cat:"poultry", region:"vn", complexity:2, convenience:6},
  "bò xào rau cải":  {p:15.0, c:4.0, f:8.0, cal:150, fiber:1.0, form:"composite", cat:"beef", region:"vn", complexity:1, convenience:6},
  "tôm xào":         {p:18.0, c:3.0, f:6.0, cal:140, fiber:0.5, form:"composite", cat:"seafood", region:"vn", complexity:1, convenience:6},
  "mực xào":         {p:14.0, c:4.0, f:5.0, cal:120, fiber:0.3, form:"composite", cat:"seafood", region:"vn", complexity:1, convenience:6},

  // ==================== 40. BATCH 8 — STREET FOOD + ĐẬU + KHÁC ====================
  "nem chua rán":    {p:8.0, c:15.0, f:10.0, cal:185, fiber:0.5, form:"cooked", cat:"processed"},
  "bắp xào bơ":      {p:3.5, c:20.0, f:5.0, cal:140, fiber:2.5, form:"cooked", cat:"starch"},
  "đậu gà":          {p:19.3, c:60.7, f:6.0, cal:364, fiber:17.4, form:"dry", cat:"nuts"},
  "đậu trắng":       {p:23.4, c:60.3, f:0.9, cal:333, fiber:15.2, form:"dry", cat:"nuts"},
  "hạt dẻ":          {p:2.4, c:44.2, f:2.3, cal:196, fiber:5.1, form:"raw", cat:"nuts"},
  "rong biển khô":   {p:5.8, c:8.0, f:0.3, cal:45, fiber:0.5, form:"dry", cat:"veg"},

  // ==================== BATCH 9 — 45 ITEMS ====================
  // Hải sản bổ sung
  "cá sốt cà":       {p:14.0, c:5.0, f:6.0, cal:132, fiber:0.5, form:"cooked", cat:"seafood"},
  "cá hấp":          {p:18.0, c:0, f:3.0, cal:100, fiber:0, form:"cooked", cat:"seafood"},
  "cá chiên xù":     {p:12.0, c:15.0, f:14.0, cal:240, fiber:0.5, form:"cooked", cat:"seafood"},
  "tôm hấp":         {p:22.0, c:0, f:1.0, cal:99, fiber:0, form:"cooked", cat:"seafood"},
  "tôm luộc":        {p:22.0, c:0, f:1.0, cal:99, fiber:0, form:"cooked", cat:"seafood"},
  "mực nướng":       {p:17.0, c:3.0, f:2.0, cal:100, fiber:0, form:"cooked", cat:"seafood"},
  "cá viên chiên":   {p:10.0, c:15.0, f:8.0, cal:175, fiber:0.5, form:"cooked", cat:"processed"},
  "chả cá":          {p:15.0, c:8.0, f:5.0, cal:140, fiber:0.3, form:"cooked", cat:"processed"},

  // Protein bổ sung
  "thịt bò nướng":   {p:26.0, c:0, f:10.0, cal:200, fiber:0, form:"cooked", cat:"beef"},
  "sườn nướng":      {p:17.0, c:3.0, f:18.0, cal:250, fiber:0, form:"cooked", cat:"pork"},
  "thịt heo luộc":   {p:26.0, c:0, f:8.0, cal:180, fiber:0, form:"cooked", cat:"pork"},
  "gà chiên":        {p:20.0, c:8.0, f:14.0, cal:240, fiber:0, form:"cooked", cat:"poultry"},
  "trứng chiên":     {p:11.0, c:0.7, f:14.0, cal:175, fiber:0, form:"cooked", cat:"egg_dairy"},
  "trứng ốp la":     {p:11.0, c:0.7, f:14.0, cal:175, fiber:0, form:"cooked", cat:"egg_dairy"},

  // Rau VN bổ sung
  "rau cần":         {p:2.6, c:3.0, f:0.3, cal:20, fiber:1.6, form:"raw", cat:"veg"},
  "rau diếp cá":     {p:2.3, c:4.0, f:0.5, cal:25, fiber:2.0, form:"raw", cat:"veg"},
  "cải xoong":       {p:2.3, c:1.3, f:0.1, cal:11, fiber:0.5, form:"raw", cat:"veg"},
  "cải bẹ xanh":     {p:1.5, c:2.2, f:0.2, cal:13, fiber:1.0, form:"raw", cat:"veg"},
  "rau húng":        {p:3.8, c:8.0, f:0.6, cal:44, fiber:3.5, form:"raw", cat:"veg"},
  "tía tô":          {p:3.9, c:7.0, f:0.2, cal:37, fiber:3.5, form:"raw", cat:"veg"},
  "kinh giới":       {p:3.5, c:6.0, f:0.5, cal:35, fiber:3.0, form:"raw", cat:"veg"},
  "hành lá":         {p:1.8, c:7.3, f:0.2, cal:32, fiber:2.6, form:"raw", cat:"veg"},
  "hành tím":        {p:1.5, c:16.8, f:0.1, cal:72, fiber:3.0, form:"raw", cat:"veg"},

  // Quả bổ sung
  "quả bơ":          {p:2.0, c:8.5, f:14.7, cal:160, fiber:6.7, form:"raw", cat:"fruit"},
  "dừa tươi nạo":    {p:3.3, c:6.2, f:33.5, cal:354, fiber:9.0, form:"raw", cat:"fruit"},
  "nho khô":         {p:3.1, c:79.2, f:0.5, cal:299, fiber:3.7, form:"dry", cat:"fruit"},
  "táo đỏ khô":      {p:3.7, c:73.6, f:0.4, cal:287, fiber:6.7, form:"dry", cat:"fruit"},

  // Composite VN bổ sung
  "bún mắm":         {p:5.5, c:7.5, f:2.5, cal:75, fiber:0.4, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bún cá sứa":      {p:4.0, c:8.0, f:1.5, cal:62, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "cao lầu":         {p:5.5, c:12.0, f:3.0, cal:98, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh đa cua":     {p:4.0, c:10.0, f:2.0, cal:75, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bún thang":       {p:5.0, c:8.0, f:2.0, cal:72, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:5},
  "miến gà":         {p:4.0, c:15.0, f:1.5, cal:90, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "cơm hến":         {p:5.0, c:18.0, f:3.0, cal:120, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh bèo":        {p:2.5, c:15.0, f:3.0, cal:100, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bánh nậm":        {p:3.0, c:12.0, f:2.0, cal:80, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh bột lọc":    {p:3.5, c:14.0, f:2.5, cal:92, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh ít":         {p:2.0, c:22.0, f:3.0, cal:125, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},

  // Chè VN
  "chè bưởi":        {p:0.5, c:20.0, f:0.5, cal:85, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "chè khoai":       {p:1.0, c:22.0, f:0.5, cal:95, fiber:1.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "chè chuối":       {p:1.0, c:18.0, f:2.0, cal:92, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "sâm bổ lượng":    {p:2.0, c:15.0, f:0.5, cal:72, fiber:1.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "chè khúc bạch":   {p:3.0, c:18.0, f:5.0, cal:130, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "tào phớ":         {p:4.0, c:8.0, f:2.0, cal:65, fiber:0.2, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},

  // ==================== BATCH 10 — 42 ITEMS ====================
  // Quốc tế phổ biến VN
  "cơm trộn bibimbap":{p:8.0, c:30.0, f:5.0, cal:200, fiber:2.0, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:8},
  "gà chiên hàn":    {p:16.0, c:15.0, f:12.0, cal:238, fiber:0.5, form:"composite", cat:"poultry", region:"intl", complexity:2, convenience:9},
  "mì udon":         {p:4.0, c:22.0, f:0.5, cal:108, fiber:1.0, form:"cooked", cat:"starch"},
  "tempura":         {p:8.0, c:20.0, f:12.0, cal:220, fiber:1.0, form:"cooked", cat:"seafood"},
  "gyoza":           {p:7.0, c:18.0, f:6.0, cal:155, fiber:1.0, form:"cooked", cat:"starch"},
  "takoyaki":        {p:5.0, c:20.0, f:5.0, cal:150, fiber:0.5, form:"cooked", cat:"starch"},
  "pasta carbonara": {p:10.0, c:25.0, f:12.0, cal:250, fiber:1.0, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:7},
  "pasta bolognese": {p:8.0, c:22.0, f:6.0, cal:175, fiber:2.0, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:7},
  "salad caesar":    {p:5.0, c:6.0, f:8.0, cal:120, fiber:2.0, form:"composite", cat:"veg", region:"intl", complexity:1, convenience:8},
  "steak bò":        {p:26.0, c:0, f:15.0, cal:247, fiber:0, form:"cooked", cat:"beef"},
  "cà ri nhật":      {p:5.0, c:12.0, f:4.0, cal:105, fiber:1.5, form:"composite", cat:"starch", region:"intl", complexity:2, convenience:8},

  // Đồ chay
  "cơm chay":        {p:5.0, c:28.0, f:3.0, cal:160, fiber:2.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bún chay":        {p:4.0, c:20.0, f:2.0, cal:115, fiber:1.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "phở chay":        {p:3.5, c:18.0, f:1.5, cal:100, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "lẩu chay":        {p:3.0, c:5.0, f:2.0, cal:50, fiber:2.0, form:"composite", cat:"veg", region:"vn", complexity:2, convenience:5},
  "nấm kho tiêu":   {p:3.0, c:5.0, f:3.0, cal:62, fiber:2.0, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},

  // Đồ uống bổ sung
  "nước rau má":     {p:0.5, c:5.0, f:0, cal:22, fiber:0.3, form:"liquid", cat:"drink"},
  "nước sâm":        {p:0, c:8.0, f:0, cal:32, fiber:0, form:"liquid", cat:"drink"},
  "trà sữa trân châu":{p:1.5, c:28.0, f:3.5, cal:145, fiber:0, form:"liquid", cat:"drink"},
  "matcha latte":    {p:3.0, c:12.0, f:3.0, cal:90, fiber:0.5, form:"liquid", cat:"drink"},
  "nước ép dứa":     {p:0.4, c:13.0, f:0.1, cal:53, fiber:0.2, form:"liquid", cat:"drink"},

  // Snack bổ sung
  "bánh tráng mè":   {p:4.0, c:65.0, f:8.0, cal:350, fiber:2.0, form:"dry", cat:"starch"},
  "khoai lang chiên":{p:1.5, c:25.0, f:8.0, cal:178, fiber:3.0, form:"cooked", cat:"starch"},
  "đậu phộng rang muối":{p:26.0, c:16.0, f:49.0, cal:567, fiber:8.5, form:"cooked", cat:"nuts"},
  "hạt hướng dương rang":{p:21.0, c:20.0, f:52.0, cal:584, fiber:8.6, form:"cooked", cat:"nuts"},

  // Gia vị bổ sung
  "mắm nêm":        {p:8.0, c:3.0, f:1.0, cal:55, fiber:0, form:"liquid", cat:"sauce"},
  "tương bần":       {p:6.0, c:8.0, f:2.0, cal:75, fiber:0.5, form:"liquid", cat:"sauce"},
  "giấm":            {p:0, c:0.9, f:0, cal:18, fiber:0, form:"liquid", cat:"sauce"},
  "tiêu":            {p:10.4, c:63.9, f:3.3, cal:251, fiber:25.3, form:"dry", cat:"sauce"},
  "ớt bột":          {p:12.0, c:56.0, f:17.0, cal:282, fiber:34.8, form:"dry", cat:"sauce"},
  "nghệ bột":        {p:9.7, c:67.1, f:3.3, cal:312, fiber:22.7, form:"dry", cat:"sauce"},

  // Processed bổ sung
  "thịt hộp":        {p:12.0, c:3.0, f:18.0, cal:220, fiber:0, form:"cooked", cat:"processed"},
  "cá mòi hộp":      {p:20.9, c:0, f:11.5, cal:208, fiber:0, form:"cooked", cat:"processed"},
  "xúc xích nướng":  {p:12.0, c:3.0, f:25.0, cal:290, fiber:0, form:"cooked", cat:"processed"},
  "bò viên chiên":   {p:12.0, c:8.0, f:12.0, cal:195, fiber:0, form:"cooked", cat:"processed"},
  "nem chua":        {p:15.0, c:5.0, f:8.0, cal:155, fiber:0, form:"cooked", cat:"processed"},
  "chả lụa chiên":   {p:14.0, c:4.0, f:10.0, cal:165, fiber:0, form:"cooked", cat:"processed"},

  // ==================== BATCH 11 — COMPOSITE VN ĐẶC SẢN VÙNG MIỀN ====================
  "bún chả cá":      {p:5.0, c:8.0, f:2.0, cal:72, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bún mắm nêm":     {p:5.0, c:8.0, f:3.0, cal:80, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bún kèn":         {p:4.5, c:10.0, f:3.5, cal:90, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:5},
  "bánh canh cua":   {p:5.0, c:10.0, f:2.0, cal:78, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "hủ tiếu xương":   {p:5.0, c:9.0, f:2.5, cal:78, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "phở cuốn":        {p:4.0, c:12.0, f:2.0, cal:82, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "bánh xèo miền tây":{p:5.0, c:18.0, f:10.0, cal:185, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "cơm cháy kho quẹt":{p:4.0, c:28.0, f:5.0, cal:175, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:6},
  "bánh tráng cuốn thịt heo":{p:6.0, c:10.0, f:4.0, cal:100, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:7},
  "gỏi gà":          {p:10.0, c:5.0, f:3.0, cal:88, fiber:1.5, form:"composite", cat:"poultry", region:"vn", complexity:1, convenience:6},
  "nộm đu đủ":       {p:2.0, c:8.0, f:2.0, cal:58, fiber:2.0, form:"composite", cat:"veg", region:"vn", complexity:1, convenience:6},
  "bò bía":          {p:3.0, c:12.0, f:3.0, cal:88, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},

  // ==================== BATCH 11 — MÓN MẶN VN BỔ SUNG ====================
  "thịt luộc":       {p:26.0, c:0, f:8.0, cal:180, fiber:0, form:"cooked", cat:"pork"},
  "thịt nướng":      {p:22.0, c:2.0, f:12.0, cal:208, fiber:0, form:"cooked", cat:"pork"},
  "sườn xào chua ngọt":{p:12.0, c:10.0, f:10.0, cal:180, fiber:0.5, form:"composite", cat:"pork", region:"vn", complexity:2, convenience:5},
  "thịt rang cháy cạnh":{p:20.0, c:3.0, f:12.0, cal:205, fiber:0, form:"composite", cat:"pork", region:"vn", complexity:1, convenience:6},
  "cá lóc kho":      {p:16.0, c:3.0, f:3.5, cal:110, fiber:0, form:"cooked", cat:"seafood"},
  "cá hồi nướng":    {p:22.0, c:0, f:12.0, cal:200, fiber:0, form:"cooked", cat:"seafood"},
  "cá thu kho":      {p:18.0, c:3.0, f:12.0, cal:195, fiber:0, form:"cooked", cat:"seafood"},
  "gà hầm":          {p:18.0, c:2.0, f:8.0, cal:155, fiber:0.3, form:"cooked", cat:"poultry"},
  "vịt om sấu":      {p:14.0, c:3.0, f:12.0, cal:180, fiber:0.5, form:"composite", cat:"poultry", region:"vn", complexity:2, convenience:5},
  "bò hầm":          {p:18.0, c:4.0, f:10.0, cal:180, fiber:0.5, form:"cooked", cat:"beef"},
  "bò sốt vang":     {p:16.0, c:5.0, f:8.0, cal:160, fiber:0.5, form:"composite", cat:"beef", region:"vn", complexity:3, convenience:5},

  // ==================== BATCH 12 — RAU CỤ THỂ + NẤM + ĐẬU ====================
  "nấm đông cô":     {p:2.2, c:6.8, f:0.5, cal:34, fiber:2.5, form:"raw", cat:"veg"},
  "nấm mèo":         {p:0.5, c:7.0, f:0.1, cal:25, fiber:5.0, form:"dry", cat:"veg"},
  "đậu rồng":        {p:2.0, c:6.0, f:0.2, cal:30, fiber:3.0, form:"raw", cat:"veg"},
  "đậu hà lan":      {p:5.4, c:14.5, f:0.4, cal:81, fiber:5.1, form:"raw", cat:"veg"},
  "bí ngô":          {p:1.0, c:6.5, f:0.1, cal:26, fiber:0.5, form:"raw", cat:"veg"},
  "mướp hương":      {p:0.5, c:3.0, f:0.1, cal:14, fiber:0.8, form:"raw", cat:"veg"},
  "thiên lý":        {p:2.5, c:5.0, f:0.3, cal:30, fiber:2.0, form:"raw", cat:"veg"},
  "rau sam":          {p:2.0, c:3.4, f:0.4, cal:20, fiber:1.5, form:"raw", cat:"veg"},
  "rau má":           {p:1.8, c:6.0, f:0.2, cal:30, fiber:2.0, form:"raw", cat:"veg"},
  "lá giang":        {p:1.5, c:5.0, f:0.3, cal:25, fiber:2.5, form:"raw", cat:"veg"},

  // ==================== BATCH 12 — THỰC PHẨM TIỆN LỢI ====================
  "cháo gói":        {p:3.0, c:25.0, f:2.0, cal:130, fiber:0.5, form:"dry", cat:"starch"},
  "bún gói":         {p:3.5, c:45.0, f:1.0, cal:200, fiber:0.5, form:"dry", cat:"starch"},
  "pizza đông lạnh": {p:10.0, c:30.0, f:10.0, cal:250, fiber:2.0, form:"cooked", cat:"starch"},
  "cơm hộp":         {p:7.0, c:25.0, f:5.0, cal:175, fiber:1.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:10},
  "sandwich":        {p:10.0, c:25.0, f:8.0, cal:215, fiber:1.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:10},

  // ==================== BATCH 12 — BAKERY + DESSERT BỔ SUNG ====================
  "muffin":          {p:5.0, c:50.0, f:12.0, cal:330, fiber:1.5, form:"cooked", cat:"starch"},
  "brownie":         {p:5.0, c:55.0, f:16.0, cal:380, fiber:2.5, form:"cooked", cat:"starch"},
  "waffle":          {p:7.0, c:40.0, f:12.0, cal:295, fiber:1.0, form:"cooked", cat:"starch"},
  "pancake":         {p:6.0, c:34.0, f:8.0, cal:230, fiber:1.0, form:"cooked", cat:"starch"},
  "bánh chuối nướng":{p:2.5, c:30.0, f:5.0, cal:175, fiber:2.0, form:"cooked", cat:"starch"},
  "bánh da lợn":     {p:2.0, c:28.0, f:4.0, cal:158, fiber:0.5, form:"cooked", cat:"starch"},
  "kem dừa":         {p:3.0, c:22.0, f:12.0, cal:210, fiber:0.5, form:"solid", cat:"egg_dairy"},
  "yogurt đông lạnh":{p:4.0, c:18.0, f:3.0, cal:115, fiber:0, form:"solid", cat:"egg_dairy"},

  // ==================== BATCH 13 — HẢI SẢN + PROTEIN CHI TIẾT ====================
  "cá chẽm":         {p:18.0, c:0, f:2.0, cal:92, fiber:0, form:"raw", cat:"seafood"},
  "cá mú":           {p:19.4, c:0, f:1.0, cal:87, fiber:0, form:"raw", cat:"seafood"},
  "cá bống":         {p:16.5, c:0, f:2.0, cal:85, fiber:0, form:"raw", cat:"seafood"},
  "cá cơm khô":      {p:40.0, c:0, f:5.0, cal:210, fiber:0, form:"dry", cat:"seafood"},
  "tôm khô":         {p:48.0, c:2.0, f:2.5, cal:225, fiber:0, form:"dry", cat:"seafood"},
  "mực khô":         {p:46.8, c:9.4, f:4.2, cal:275, fiber:0, form:"dry", cat:"seafood"},
  "cá khô":          {p:42.0, c:0, f:8.0, cal:245, fiber:0, form:"dry", cat:"seafood"},
  "sò huyết":        {p:14.0, c:5.5, f:1.0, cal:88, fiber:0, form:"raw", cat:"seafood"},
  "sò điệp":        {p:15.0, c:3.0, f:0.5, cal:77, fiber:0, form:"raw", cat:"seafood"},
  "ốc hương":        {p:16.0, c:3.5, f:0.5, cal:84, fiber:0, form:"raw", cat:"seafood"},
  "ốc bươu":        {p:12.0, c:3.5, f:0.4, cal:68, fiber:0, form:"raw", cat:"seafood"},
  "ghẹ":             {p:17.0, c:0, f:1.5, cal:82, fiber:0, form:"raw", cat:"seafood"},
  "cua đồng":        {p:12.5, c:0, f:1.0, cal:60, fiber:0, form:"raw", cat:"seafood"},
  "tôm hùm":        {p:20.5, c:0, f:0.6, cal:89, fiber:0, form:"raw", cat:"seafood"},

  // Thịt bộ phận chi tiết
  "nạm bò nấu chín": {p:24.0, c:0, f:12.0, cal:210, fiber:0, form:"cooked", cat:"beef"},
  "bắp bò nấu chín": {p:28.0, c:0, f:6.0, cal:170, fiber:0, form:"cooked", cat:"beef"},
  "da gà":           {p:13.0, c:0, f:32.0, cal:349, fiber:0, form:"raw", cat:"poultry"},
  "mỡ heo":          {p:2.0, c:0, f:90.0, cal:810, fiber:0, form:"raw", cat:"pork"},
  "xương heo":       {p:15.0, c:0, f:10.0, cal:155, fiber:0, form:"raw", cat:"pork"},
  "tim heo":         {p:17.3, c:0.1, f:4.4, cal:118, fiber:0, form:"raw", cat:"pork"},
  "dạ dày heo":      {p:16.0, c:0, f:2.5, cal:90, fiber:0, form:"raw", cat:"pork"},
  "tiết canh":       {p:6.0, c:0.5, f:0.2, cal:28, fiber:0, form:"raw", cat:"pork"},

  // ==================== BATCH 13 — COMPOSITE VN THÊM ====================
  "cơm chiên dương châu":{p:6.0, c:22.0, f:7.0, cal:180, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "cơm chiên trứng": {p:6.5, c:24.0, f:6.0, cal:178, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:9},
  "cơm chiên hải sản":{p:7.0, c:22.0, f:6.5, cal:176, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "xôi đậu đen":     {p:5.0, c:30.0, f:1.5, cal:155, fiber:2.0, form:"composite", cat:"starch", region:"vn", complexity:1, convenience:8},
  "xôi gấc":         {p:3.5, c:32.0, f:2.0, cal:162, fiber:0.8, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bánh giày":       {p:2.0, c:30.0, f:0.5, cal:132, fiber:0.3, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},
  "bún bò Nam Bộ":   {p:6.0, c:8.0, f:3.0, cal:85, fiber:0.5, form:"composite", cat:"starch", region:"vn", complexity:2, convenience:7},

  // ==================== BATCH 14 — ĐỒ UỐNG + DAIRY BỔ SUNG ====================
  "cà phê trứng":    {p:3.0, c:10.0, f:5.0, cal:98, fiber:0, form:"liquid", cat:"drink"},
  "cà phê dừa":      {p:1.5, c:12.0, f:5.0, cal:100, fiber:0, form:"liquid", cat:"drink"},
  "cà phê muối":     {p:1.5, c:10.0, f:3.0, cal:75, fiber:0, form:"liquid", cat:"drink"},
  "trà ô long":      {p:0, c:0, f:0, cal:1, fiber:0, form:"liquid", cat:"drink"},
  "trà gừng":        {p:0.2, c:2.0, f:0, cal:9, fiber:0, form:"liquid", cat:"drink"},
  "nước chanh đá":   {p:0.1, c:6.0, f:0, cal:24, fiber:0, form:"liquid", cat:"drink"},
  "sinh tố xoài":    {p:1.0, c:16.0, f:0.5, cal:72, fiber:1.0, form:"liquid", cat:"drink"},
  "sinh tố dâu":     {p:1.0, c:12.0, f:0.5, cal:55, fiber:1.5, form:"liquid", cat:"drink"},
  "trà sen":         {p:0, c:0, f:0, cal:1, fiber:0, form:"liquid", cat:"drink"},
  "rượu đế":         {p:0, c:0, f:0, cal:231, fiber:0, form:"liquid", cat:"drink"},
  "sữa yến mạch":    {p:1.0, c:7.0, f:1.5, cal:46, fiber:0.8, form:"liquid", cat:"drink"},
  "sữa óc chó":      {p:1.0, c:5.0, f:3.0, cal:52, fiber:0.3, form:"liquid", cat:"drink"},

  // ==================== BATCH 14 — QUỐC TẾ BỔ SUNG ====================
  "shawarma":        {p:14.0, c:20.0, f:10.0, cal:230, fiber:1.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "kebab":           {p:14.0, c:18.0, f:10.0, cal:220, fiber:1.0, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "burrito":         {p:10.0, c:25.0, f:8.0, cal:215, fiber:2.0, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "taco":            {p:8.0, c:15.0, f:10.0, cal:185, fiber:1.5, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:9},
  "mì lạnh hàn":     {p:5.0, c:22.0, f:1.0, cal:118, fiber:1.0, form:"composite", cat:"starch", region:"intl", complexity:1, convenience:7},
  "canh kimchi":      {p:3.0, c:5.0, f:2.0, cal:50, fiber:1.0, form:"composite", cat:"veg", region:"intl", complexity:1, convenience:7},
  "thịt nướng hàn":  {p:20.0, c:5.0, f:12.0, cal:215, fiber:0, form:"composite", cat:"beef", region:"intl", complexity:2, convenience:7},
  "som tam":         {p:2.0, c:10.0, f:1.0, cal:55, fiber:2.5, form:"composite", cat:"veg", region:"intl", complexity:1, convenience:7},
  "tom yum":         {p:4.0, c:5.0, f:2.0, cal:55, fiber:0.5, form:"composite", cat:"seafood", region:"intl", complexity:2, convenience:7},
  "naan":            {p:9.0, c:50.0, f:3.5, cal:262, fiber:2.0, form:"cooked", cat:"starch"},
  "hummus":          {p:7.9, c:14.3, f:9.6, cal:166, fiber:6.0, form:"cooked", cat:"nuts"},
  "falafel":         {p:13.3, c:31.8, f:17.8, cal:333, fiber:0, form:"cooked", cat:"nuts"},
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

  // 1. Exact match — fastest, most accurate
  if (LOCAL_FOODS[lower]) {
    return scaleFood(LOCAL_FOODS[lower], lower, gram, null);
  }

  // 2. Find food base with priority matching:
  //    a) startsWith — "thịt bò xào" starts with "thịt bò" ✅
  //    b) endsWith   — "gà luộc ức" ends with... (rare)
  //    c) includes   — fallback, only for keys ≥ 4 chars to avoid false matches
  let foodKey = null;
  let cookKey = null;

  // 2a. startsWith (key dài trước)
  for (const key of LOCAL_KEYS) {
    if (lower.startsWith(key + " ") || lower.startsWith(key)) {
      foodKey = key;
      break;
    }
  }

  // 2b. endsWith (key dài trước)
  if (!foodKey) {
    for (const key of LOCAL_KEYS) {
      if (lower.endsWith(" " + key) || lower.endsWith(key)) {
        foodKey = key;
        break;
      }
    }
  }

  // 2c. includes — only keys ≥ 4 chars to prevent "bò" matching "bò viên" etc.
  if (!foodKey) {
    for (const key of LOCAL_KEYS) {
      if (key.length >= 4 && lower.includes(key)) {
        foodKey = key;
        break;
      }
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
  // Skip modifier nếu food đã cooked + modifier là multiply_3x (tránh nhân đôi — VD "bò khô" đã có macro sấy, "bò khô lát" không nên x3 thêm)
  const isAlreadyCooked = base.form === "cooked";
  const mod = (cookKey && !shouldSkipMod && !(isAlreadyCooked && COOK_MODIFIERS[cookKey]?.note === "multiply_3x")) ? COOK_MODIFIERS[cookKey] : null;

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
  "sữa tươi": "fixed", "sữa tách béo": "fixed",
  "sữa đậu nành": "fixed", "sữa chua": "fixed", "sữa chua hy lạp": "fixed",
  // Phô mai/bơ — chất béo thật, dù nằm chung nhóm egg_dairy với trứng
  "phô mai": "fat", "bơ lạt": "fat",
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
  "thịt heo": { min: 80, max: 250 }, "thịt lợn": { min: 80, max: 250 },
  "cá hồi": { min: 80, max: 250 }, "cá ngừ": { min: 80, max: 250 },
  "tôm tươi": { min: 60, max: 200 }, "mực": { min: 60, max: 200 },
  "trứng gà": { min: 50, max: 200 }, "trứng gà luộc": { min: 50, max: 200 },
  "đậu phụ": { min: 100, max: 300 },
  "cơm trắng": { min: 80, max: 450 }, "cơm gạo lứt": { min: 80, max: 450 },
  "khoai lang": { min: 100, max: 400 }, "khoai tây": { min: 100, max: 400 },
  "bánh mì": { min: 30, max: 200 }, "bún": { min: 100, max: 350 }, "mì": { min: 100, max: 300 }, "hủ tiếu": { min: 100, max: 350 }, "bánh cuốn": { min: 150, max: 400 }, "miến": { min: 50, max: 250 }, "bánh phở": { min: 100, max: 350 },
  "cháo": { min: 200, max: 500 }, // 1 tô cháo thường 300-400g, nhiều nước hơn cơm/bún nên sàn/trần cao hơn
  // Composite dishes — 1 tô/đĩa thật
  "phở bò": { min: 300, max: 500 }, "phở gà": { min: 300, max: 500 },
  "bún bò huế": { min: 300, max: 500 }, "bún riêu": { min: 300, max: 500 },
  "bún chả": { min: 250, max: 450 }, "bún thịt nướng": { min: 250, max: 450 },
  "hủ tiếu nam vang": { min: 300, max: 500 }, "bánh canh": { min: 300, max: 500 },
  "mì quảng": { min: 300, max: 450 }, "cháo gà": { min: 250, max: 500 },
  "cháo thịt bằm": { min: 250, max: 500 },
  "xôi xéo": { min: 100, max: 250 }, "xôi gà": { min: 100, max: 250 }, "xôi lạc": { min: 100, max: 250 },
  "bánh cuốn nhân thịt": { min: 150, max: 400 }, "bánh mì thịt": { min: 100, max: 250 },
  "cơm tấm": { min: 250, max: 450 }, "bún đậu mắm tôm": { min: 250, max: 450 },
  "yến mạch": { min: 10, max: 100 }, "xôi": { min: 80, max: 350 },
  "dầu ăn": { min: 5, max: 30 }, "dầu ô liu": { min: 5, max: 30 }, "dầu mè": { min: 5, max: 20 },
  "bơ đậu phộng": { min: 10, max: 40 }, "hạt điều": { min: 10, max: 40 }, "hạnh nhân": { min: 10, max: 40 },
  "lạc": { min: 5, max: 25 }, "đậu phộng": { min: 5, max: 25 }, "mè": { min: 5, max: 25 }, "vừng": { min: 5, max: 25 },
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
  "bún":           { sang: 9, pre: 2 },
  "bánh mì":       { sang: 10 },
  "bánh mì đen":   { sang: 9 },
  "xôi":           { sang: 10, toi: 3 },   // tối ăn xôi lạ
  "bánh cuốn":     { sang: 10, toi: 4 },
  "mì":            { sang: 5, pre: 2, toi: 7 },  // mì nặng bụng, không hợp pre-workout
  "miến":          { sang: 5, pre: 2 },
  "hủ tiếu":       { sang: 9, pre: 2 },
  "hủ tiếu":       { sang: 9 },
  "yến mạch":      { sang: 9 },
  "bột yến mạch":  { sang: 9 },
  "patê":          { sang: 9 },            // bánh mì patê
  "giò lụa":       { sang: 8 },            // xôi giò, bánh mì giò
  "chả lụa":       { sang: 8 },
  "cá ngừ hộp":    { sang: 6 },            // bánh mì cá hộp
  // Cấm cơm bữa sáng — văn hóa VN không nấu cơm sáng
  "cơm trắng":     { sang: 1, pre: 2 },
  "cơm trắng":     { sang: 1, pre: 2 },
  "cơm gạo lứt":   { sang: 1, pre: 2 },
  "gạo lứt":       { sang: 1, pre: 2 },
  "mì ý":          { sang: 1 },
  // Bữa phụ chuẩn VN — nâng điểm phụ
  "khoai lang":    { sang: 9, phu_sang: 9, phu_chieu: 9 },
  "ngô":           { phu_sang: 9, phu_chieu: 9 },
  "bắp":           { phu_sang: 9, phu_chieu: 9 },
  // Composite dishes — sáng đặc trưng, trưa/tối tuỳ món
  "phở bò":        { sang: 10, trua: 7, toi: 6 },
  "phở gà":        { sang: 10, trua: 7, toi: 6 },
  "bún bò huế":    { sang: 10, trua: 8, toi: 6 },
  "bún riêu":      { sang: 9, trua: 8, toi: 5 },
  "bún chả":       { sang: 4, trua: 10, toi: 7 },
  "bún thịt nướng":{ sang: 4, trua: 10, toi: 7 },
  "hủ tiếu nam vang":{ sang: 9, trua: 7, toi: 5 },
  "bánh canh":     { sang: 8, trua: 8, toi: 6 },
  "mì quảng":      { sang: 7, trua: 9, toi: 6 },
  "cháo gà":       { sang: 10, trua: 5, toi: 7 },
  "cháo thịt bằm": { sang: 10, trua: 5, toi: 7 },
  "xôi xéo":       { sang: 10, toi: 3 },
  "xôi gà":        { sang: 10, toi: 3 },
  "xôi lạc":       { sang: 10, toi: 3 },
  "bánh cuốn nhân thịt":{ sang: 10, toi: 4 },
  "bánh mì thịt":  { sang: 10, trua: 6, toi: 4 },
  "cơm tấm":       { sang: 5, trua: 10, toi: 8 },
  "bún đậu mắm tôm":{ sang: 3, trua: 9, toi: 7 },
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
  egg_dairy: 9, starch: 6, fruit: 10, veg: 7,
  nuts: 8, sauce: 10, supp: 10, processed: 9, drink: 10,
};

const CONVENIENCE_OVERRIDE = {
  // Đạm mua sẵn được (cơm hộp, quán, siêu thị)
  "ức gà nướng": 8, "ức gà luộc": 7,
  "trứng gà luộc": 10, "trứng luộc": 10, "trứng vịt luộc": 10, "trứng cút luộc": 10,
  "cá ngừ hộp": 10, "đậu phụ": 7, "tôm tươi": 6,
  // Tinh bột: mua sẵn vs nấu
  "bánh mì": 10, "bánh mì đen": 9, "xôi": 10, "bánh cuốn": 9,
  "cháo": 8, "bánh phở": 8, "bún": 8, "hủ tiếu": 8, "miến": 7,
  "cơm trắng": 6, "cơm": 6, "cơm gạo lứt": 6,
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
// REGION — "vn" | "both" | "intl". Style VN lọc region ∈ ["vn","both"].
// Cat-level mặc định + override cho món lệch.
// "both" = dùng phổ biến cả VN lẫn quốc tế (trứng, rau chung...)
// Food chưa có region → loại khỏi whitelist style VN (an toàn).
// ------------------------------------------------------------
const CAT_REGION = {
  poultry: "both", beef: "both", pork: "both", seafood: "both",
  egg_dairy: "both", starch: "both", fruit: "both", veg: "both",
  nuts: "both", sauce: "both", supp: "intl", processed: "vn", drink: "both",
};
const REGION_OVERRIDE = {
  // Starch VN đặc trưng
  "cơm trắng": "vn", "cơm": "vn", "cơm gạo lứt": "both", "gạo lứt": "both",
  "bún": "vn", "bánh phở": "vn", "hủ tiếu": "vn", "miến": "vn",
  "bánh cuốn": "vn", "cháo": "vn", "xôi": "vn", "bánh mì": "both",
  "bánh tráng": "vn",
  // Starch quốc tế
  "yến mạch": "intl", "bột yến mạch": "intl", "granola": "intl",
  "mì ý": "intl", "pasta": "intl", "quinoa": "intl", "bánh mì đen": "intl",
  // Processed VN
  "giò lụa": "vn", "chả lụa": "vn", "chả quế": "vn", "nem": "vn", "patê": "vn",
  "xúc xích": "both",
  // Supp
  "whey": "intl", "whey isolate": "intl", "casein": "intl",
  "mass gainer": "intl", "creatine": "intl", "bcaa": "intl",
};

export function getFoodRegion(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (REGION_OVERRIDE[key] !== undefined) return REGION_OVERRIDE[key];
  const item = LOCAL_FOODS[key];
  if (!item) return null; // unknown → loại khỏi whitelist VN
  if (item.region) return item.region; // composite entries đã có inline
  return CAT_REGION[item.cat] ?? null;
}

// ------------------------------------------------------------
// COMPLEXITY — 1=nhanh/mua sẵn, 2=vừa, 3=bữa nấu đầy đủ
// Style VN sáng cần complexity ≤ 1.
// Cat-level mặc định + override.
// ------------------------------------------------------------
const CAT_COMPLEXITY = {
  poultry: 2, beef: 2, pork: 2, seafood: 2,
  egg_dairy: 1, starch: 1, fruit: 1, veg: 2,
  nuts: 1, sauce: 1, supp: 1, processed: 1, drink: 1,
};
const COMPLEXITY_OVERRIDE = {
  // Đạm nấu lâu
  "gân bò": 3, "bắp bò": 3, "sườn bò": 3, "sườn heo": 2, "sườn lợn": 2,
  // Đạm nhanh
  "trứng gà luộc": 1, "trứng luộc": 1, "cá ngừ hộp": 1, "đậu phụ": 1,
  // Starch nấu
  "cơm trắng": 2, "cơm": 2, "cơm gạo lứt": 2,
  // Rau nhanh
  "rau sống": 1, "xà lách": 1, "dưa chuột": 1, "cà chua": 1,
};

export function getFoodComplexity(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (COMPLEXITY_OVERRIDE[key] !== undefined) return COMPLEXITY_OVERRIDE[key];
  const item = LOCAL_FOODS[key];
  if (!item) return 2;
  if (item.complexity !== undefined) return item.complexity; // composite entries
  return CAT_COMPLEXITY[item.cat] ?? 2;
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
  "thịt bò": "Bò xào", "bò viên": "Bò viên", "bò khô": "Bò khô",
  // PORK
  "thịt heo nạc": "Thịt heo luộc", "thịt lợn nạc": "Thịt lợn luộc",
  "ba chỉ": "Ba chỉ luộc", "ba rọi": "Ba rọi luộc",
  "sườn heo": "Sườn heo rim", "sườn lợn": "Sườn rim",
  "thịt heo xay": "Thịt băm rang", "thịt lợn xay": "Thịt băm rang",
  "nạc vai heo": "Nạc vai rang", "thịt heo": "Thịt heo luộc",
  "thịt lợn": "Thịt lợn luộc",
  // SEAFOOD
  "cá hồi": "Cá hồi áp chảo", "cá ngừ": "Cá ngừ kho", "cá rô phi": "Cá rô phi kho",
  "cá basa": "Cá basa kho", "cá thu": "Cá thu sốt cà", "cá diêu hồng": "Cá diêu hồng hấp",
  "cá lóc": "Cá lóc kho", "cá tra": "Cá tra kho", "cá nục": "Cá nục kho",
  "cá chép": "Cá chép om", "cá saba": "Cá saba nướng",
  "tôm tươi": "Tôm hấp", "tôm sú": "Tôm sú hấp", "mực": "Mực hấp",
  "ngao": "Ngao hấp", "nghêu": "Nghêu hấp", "cua": "Cua hấp",
  "hàu": "Hàu nướng", "bạch tuộc": "Bạch tuộc hấp", "cá ngừ hộp": "Cá ngừ hộp",
  // EGG_DAIRY
  "trứng gà": "Trứng luộc", "trứng gà luộc": "Trứng luộc", "trứng": "Trứng luộc",
  "trứng luộc": "Trứng luộc", "trứng vịt": "Trứng vịt luộc", "trứng vịt luộc": "Trứng vịt luộc",
  "trứng cút": "Trứng cút luộc", "trứng cút luộc": "Trứng cút luộc",
  "lòng trắng trứng": "Lòng trắng trứng", "lòng đỏ trứng": "Lòng đỏ trứng",
  "sữa tươi": "Sữa tươi", "sữa tách béo": "Sữa tách béo",
  "sữa đậu nành": "Sữa đậu nành", "sữa chua": "Sữa chua", "sữa chua hy lạp": "Sữa chua Hy Lạp",
  "phô mai": "Phô mai", "bơ lạt": "Bơ lạt",
  // STARCH
  "cơm trắng": "Cơm trắng", "cơm": "Cơm trắng", "cơm gạo lứt": "Cơm gạo lứt",
  "gạo lứt": "Cơm gạo lứt", "khoai lang": "Khoai lang luộc", "khoai tây": "Khoai tây luộc",
  "khoai sọ": "Khoai sọ luộc", "khoai môn": "Khoai môn luộc",
  "yến mạch": "Yến mạch nấu", "bột yến mạch": "Yến mạch nấu",
  "bánh mì": "Bánh mì", "bánh mì đen": "Bánh mì đen", "bún": "Bún",
  "miến": "Miến", "bánh phở": "Phở", "mì": "Mì trứng", "hủ tiếu": "Hủ tiếu",
  "bánh cuốn": "Bánh cuốn", "cháo": "Cháo", "mì ý": "Mì Ý",
  // COMPOSITE DISHES
  "phở bò": "Phở bò", "phở gà": "Phở gà", "bún bò huế": "Bún bò Huế",
  "bún riêu": "Bún riêu", "bún chả": "Bún chả", "bún thịt nướng": "Bún thịt nướng",
  "hủ tiếu nam vang": "Hủ tiếu Nam Vang", "bánh canh": "Bánh canh",
  "mì quảng": "Mì Quảng", "cháo gà": "Cháo gà", "cháo thịt bằm": "Cháo thịt bằm",
  "xôi xéo": "Xôi xéo", "xôi gà": "Xôi gà", "xôi lạc": "Xôi lạc",
  "bánh cuốn nhân thịt": "Bánh cuốn nhân thịt", "bánh mì thịt": "Bánh mì thịt",
  "cơm tấm": "Cơm tấm sườn", "bún đậu mắm tôm": "Bún đậu mắm tôm",
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
  // BATCH 1
  "thịt đùi heo": "Thịt đùi heo luộc", "chân giò heo": "Giò heo luộc",
  "thịt đùi gà": "Đùi gà kho", "gà ta": "Gà ta luộc", "ngan": "Ngan luộc",
  "cá rô": "Cá rô kho", "cá trê": "Cá trê kho", "cá bạc má": "Cá bạc má kho",
  "cá cơm": "Cá cơm kho", "lươn": "Lươn xào", "ếch": "Ếch chiên",
  "gan heo": "Gan heo xào", "gan gà": "Gan gà xào", "lòng heo": "Lòng heo luộc",
  "trứng vịt lộn": "Trứng vịt lộn", "khoai mì": "Khoai mì luộc", "sắn": "Sắn luộc",
  "bánh bao": "Bánh bao", "cải bó xôi": "Cải bó xôi luộc", "rau đay": "Canh rau đay",
  "mướp": "Canh mướp", "khổ qua": "Khổ qua nhồi", "mướp đắng": "Mướp đắng xào",
  "cà tím": "Cà tím nướng", "cà phê sữa đá": "Cà phê sữa đá", "trà sữa": "Trà sữa",
  "nước mía": "Nước mía", "sữa đặc": "Sữa đặc", "lạp xưởng": "Lạp xưởng",
  "ruốc heo": "Ruốc heo", "chả giò": "Chả giò",
  // BATCH 2
  "dứa": "Dứa", "thơm": "Thơm", "nhãn": "Nhãn", "quýt": "Quýt",
  "hồng xiêm": "Hồng xiêm", "mãng cầu": "Mãng cầu", "dưa lưới": "Dưa lưới",
  "roi": "Roi/Mận", "đào": "Đào",
  "bạc xỉu": "Bạc xỉu", "cà phê sữa": "Cà phê sữa", "trà đá": "Trà đá",
  "trà chanh": "Trà chanh", "sinh tố bơ": "Sinh tố bơ", "sinh tố chuối": "Sinh tố chuối",
  "nước ép cà rốt": "Nước ép cà rốt", "ca cao": "Ca cao",
  "mắm tôm": "Mắm tôm", "dầu hào": "Dầu hào", "muối": "Muối",
  "bột nêm": "Bột nêm", "sa tế": "Sa tế",
  "thịt dê": "Thịt dê nướng", "cá diêu hồng kho": "Cá diêu hồng kho",
  "tôm đồng": "Tôm đồng rang", "ốc": "Ốc luộc", "nghêu hấp": "Nghêu hấp",
  // BATCH 3
  "canh chua cá": "Canh chua cá", "canh rau ngót": "Canh rau ngót", "canh bí đỏ": "Canh bí đỏ",
  "canh mồng tơi": "Canh mồng tơi", "canh cua": "Canh cua", "canh bầu": "Canh bầu",
  "canh khổ qua": "Canh khổ qua nhồi", "thịt kho": "Thịt kho", "cá kho tộ": "Cá kho tộ",
  "trứng kho": "Trứng kho", "gà kho gừng": "Gà kho gừng", "tôm rang": "Tôm rang",
  "cơm chiên": "Cơm chiên",
  "nấm rơm": "Nấm rơm", "nấm hương": "Nấm hương", "nấm kim châm": "Nấm kim châm",
  "nấm đùi gà": "Nấm đùi gà", "mộc nhĩ": "Mộc nhĩ", "nấm bào ngư": "Nấm bào ngư",
  "bầu": "Bầu luộc", "đậu đũa": "Đậu đũa luộc", "rau sống": "Rau sống",
  "củ sen": "Củ sen", "ngó sen": "Ngó sen", "hạt sen": "Hạt sen",
  // BATCH 4
  "bánh xèo": "Bánh xèo", "gỏi cuốn": "Gỏi cuốn", "nem rán": "Nem rán",
  "bánh khọt": "Bánh khọt", "bánh tráng trộn": "Bánh tráng trộn", "bánh tráng nướng": "Bánh tráng nướng",
  "gỏi ngó sen": "Gỏi ngó sen", "gà rán": "Gà rán", "hamburger": "Hamburger",
  "pizza": "Pizza", "khoai tây chiên": "Khoai tây chiên", "hotdog": "Hotdog",
  "chè đậu xanh": "Chè đậu xanh", "chè đậu đỏ": "Chè đậu đỏ",
  "chè trôi nước": "Chè trôi nước", "bánh flan": "Bánh flan",
  "rau câu": "Rau câu", "sương sáo": "Sương sáo",
  "mì gói": "Mì gói", "phở gói": "Phở gói",
  // BATCH 5
  "sushi": "Sushi", "kimbap": "Kimbap", "tokbokki": "Tokbokki",
  "ramen": "Ramen", "pad thái": "Pad Thái", "cà ri gà": "Cà ri gà",
  "bia": "Bia", "rượu vang": "Rượu vang", "coca cola": "Coca Cola",
  "nước ngọt": "Nước ngọt", "nước tăng lực": "Nước tăng lực", "sữa hạnh nhân": "Sữa hạnh nhân",
  "bim bim": "Bim bim", "bánh quy": "Bánh quy", "chocolate đen": "Chocolate đen",
  "kẹo": "Kẹo", "bánh bông lan": "Bánh bông lan",
  "mì căn": "Mì căn", "tempeh": "Tempeh",
  "bún mọc": "Bún mọc", "bún cá": "Bún cá", "hủ tiếu xào": "Hủ tiếu xào",
  "mì xào": "Mì xào", "lẩu thái": "Lẩu Thái", "lẩu hải sản": "Lẩu hải sản",
  // BATCH 6
  "bún ốc": "Bún ốc", "cháo lòng": "Cháo lòng", "cháo hải sản": "Cháo hải sản",
  "cơm gà": "Cơm gà", "cơm sườn": "Cơm sườn",
  "bánh chưng": "Bánh chưng", "bánh tét": "Bánh tét", "bánh giò": "Bánh giò",
  "bò lúc lắc": "Bò lúc lắc", "gà nướng": "Gà nướng", "cá chiên": "Cá chiên",
  "rau xào thập cẩm": "Rau xào thập cẩm", "đậu phụ sốt cà": "Đậu phụ sốt cà",
  "canh sườn": "Canh sườn", "croissant": "Croissant", "donut": "Donut",
  "bánh su kem": "Bánh su kem", "há cảo": "Há cảo", "sủi cảo": "Sủi cảo",
  "xíu mại": "Xíu mại",
  // BATCH 7
  "thịt kho tàu": "Thịt kho tàu", "gà luộc": "Gà luộc", "heo quay": "Heo quay",
  "vịt quay": "Vịt quay", "cá kho": "Cá kho", "tôm chiên": "Tôm chiên",
  "cua rang muối": "Cua rang muối", "rau mùng tơi": "Canh mùng tơi",
  "rau lang": "Rau lang luộc", "lá lốt": "Lá lốt", "sả": "Sả",
  "củ cải trắng": "Củ cải trắng", "trà đào": "Trà đào",
  "nước chanh muối": "Nước chanh muối", "sữa bắp": "Sữa bắp",
  "chuối sấy": "Chuối sấy", "mít sấy": "Mít sấy", "xoài sấy": "Xoài sấy",
  // BATCH 8
  "nui": "Nui", "bánh canh bột lọc": "Bánh canh bột lọc", "bột sắn dây": "Bột sắn dây",
  "khoai lang tím": "Khoai lang tím", "gạo nếp": "Gạo nếp", "bánh đúc": "Bánh đúc",
  "sữa chua uống": "Sữa chua uống", "kem": "Kem", "sữa bột": "Sữa bột",
  "sữa dừa": "Sữa dừa", "nước cốt dừa": "Nước cốt dừa", "kem tươi": "Kem tươi",
  "bún bò xào": "Bún bò xào", "phở xào": "Phở xào", "cơm rang dưa bò": "Cơm rang dưa bò",
  "miến xào": "Miến xào", "canh cải": "Canh cải", "canh rau đay": "Canh rau đay",
  "gà xào sả ớt": "Gà xào sả ớt", "bò xào rau cải": "Bò xào rau cải",
  "tôm xào": "Tôm xào", "mực xào": "Mực xào",
  "nem chua rán": "Nem chua rán", "bắp xào bơ": "Bắp xào bơ",
  "đậu gà": "Đậu gà", "đậu trắng": "Đậu trắng", "hạt dẻ": "Hạt dẻ",
  "rong biển khô": "Rong biển khô",
  // BATCH 9
  "cá sốt cà": "Cá sốt cà", "cá hấp": "Cá hấp", "cá chiên xù": "Cá chiên xù",
  "tôm hấp": "Tôm hấp", "tôm luộc": "Tôm luộc", "mực nướng": "Mực nướng",
  "cá viên chiên": "Cá viên chiên", "chả cá": "Chả cá",
  "thịt bò nướng": "Thịt bò nướng", "sườn nướng": "Sườn nướng",
  "thịt heo luộc": "Thịt heo luộc", "gà chiên": "Gà chiên",
  "trứng chiên": "Trứng chiên", "trứng ốp la": "Trứng ốp la",
  "rau cần": "Rau cần", "rau diếp cá": "Rau diếp cá", "cải xoong": "Cải xoong",
  "cải bẹ xanh": "Cải bẹ xanh", "rau húng": "Rau húng", "tía tô": "Tía tô",
  "kinh giới": "Kinh giới", "hành lá": "Hành lá", "hành tím": "Hành tím",
  "dừa tươi nạo": "Dừa nạo", "nho khô": "Nho khô", "táo đỏ khô": "Táo đỏ khô",
  "bún mắm": "Bún mắm", "bún cá sứa": "Bún cá sứa", "cao lầu": "Cao lầu",
  "bánh đa cua": "Bánh đa cua", "bún thang": "Bún thang", "miến gà": "Miến gà",
  "cơm hến": "Cơm hến", "bánh bèo": "Bánh bèo", "bánh nậm": "Bánh nậm",
  "bánh bột lọc": "Bánh bột lọc", "bánh ít": "Bánh ít",
  "chè bưởi": "Chè bưởi", "chè khoai": "Chè khoai", "chè chuối": "Chè chuối",
  "sâm bổ lượng": "Sâm bổ lượng", "chè khúc bạch": "Chè khúc bạch",
  "tào phớ": "Tào phớ",
  // BATCH 10
  "cơm trộn bibimbap": "Bibimbap", "gà chiên hàn": "Gà chiên Hàn",
  "mì udon": "Mì udon", "tempura": "Tempura", "gyoza": "Gyoza",
  "takoyaki": "Takoyaki", "pasta carbonara": "Pasta carbonara",
  "pasta bolognese": "Pasta bolognese", "salad caesar": "Salad Caesar",
  "steak bò": "Steak bò", "cà ri nhật": "Cà ri Nhật",
  "cơm chay": "Cơm chay", "bún chay": "Bún chay", "phở chay": "Phở chay",
  "lẩu chay": "Lẩu chay", "nấm kho tiêu": "Nấm kho tiêu",
  "nước rau má": "Nước rau má", "nước sâm": "Nước sâm",
  "trà sữa trân châu": "Trà sữa trân châu", "matcha latte": "Matcha latte",
  "nước ép dứa": "Nước ép dứa", "bánh tráng mè": "Bánh tráng mè",
  "khoai lang chiên": "Khoai lang chiên",
  "đậu phộng rang muối": "Đậu phộng rang", "hạt hướng dương rang": "Hạt hướng dương",
  "mắm nêm": "Mắm nêm", "tương bần": "Tương bần", "giấm": "Giấm",
  "tiêu": "Tiêu", "ớt bột": "Ớt bột", "nghệ bột": "Nghệ bột",
  "thịt hộp": "Thịt hộp", "cá mòi hộp": "Cá mòi hộp",
  "xúc xích nướng": "Xúc xích nướng", "bò viên chiên": "Bò viên chiên",
  "nem chua": "Nem chua", "chả lụa chiên": "Chả lụa chiên",
  // BATCH 11+12
  "bún chả cá": "Bún chả cá", "bún mắm nêm": "Bún mắm nêm", "bún kèn": "Bún kèn",
  "bánh canh cua": "Bánh canh cua", "hủ tiếu xương": "Hủ tiếu xương",
  "phở cuốn": "Phở cuốn", "bánh xèo miền tây": "Bánh xèo miền Tây",
  "cơm cháy kho quẹt": "Cơm cháy kho quẹt",
  "bánh tráng cuốn thịt heo": "Bánh tráng cuốn thịt", "gỏi gà": "Gỏi gà",
  "nộm đu đủ": "Nộm đu đủ", "bò bía": "Bò bía",
  "thịt luộc": "Thịt luộc", "thịt nướng": "Thịt nướng",
  "sườn xào chua ngọt": "Sườn xào chua ngọt",
  "thịt rang cháy cạnh": "Thịt rang cháy cạnh",
  "cá lóc kho": "Cá lóc kho", "cá hồi nướng": "Cá hồi nướng",
  "cá thu kho": "Cá thu kho", "gà hầm": "Gà hầm",
  "vịt om sấu": "Vịt om sấu", "bò hầm": "Bò hầm", "bò sốt vang": "Bò sốt vang",
  "nấm đông cô": "Nấm đông cô", "nấm mèo": "Nấm mèo",
  "đậu rồng": "Đậu rồng", "đậu hà lan": "Đậu Hà Lan", "bí ngô": "Bí ngô",
  "mướp hương": "Mướp hương", "thiên lý": "Thiên lý", "rau sam": "Rau sam",
  "rau má": "Rau má", "lá giang": "Lá giang",
  "cháo gói": "Cháo gói", "bún gói": "Bún gói",
  "pizza đông lạnh": "Pizza đông lạnh", "cơm hộp": "Cơm hộp", "sandwich": "Sandwich",
  "muffin": "Muffin", "brownie": "Brownie", "waffle": "Waffle", "pancake": "Pancake",
  "bánh chuối nướng": "Bánh chuối nướng", "bánh da lợn": "Bánh da lợn",
  "kem dừa": "Kem dừa", "yogurt đông lạnh": "Yogurt đông lạnh",
};

export function getFoodDisplay(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  if (DISPLAY_MAP[key]) return DISPLAY_MAP[key];
  // Fallback an toàn: viết hoa chữ đầu — không bao giờ hiện tên bịa
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// ------------------------------------------------------------
// STANDALONE_DISHES — món "trọn suất" kiểu quán VN: đã tự đủ
// tinh bột + đạm + gia vị bên trong công thức thực tế (bánh
// cuốn có nhân thịt/mộc nhĩ, phở/bún/hủ tiếu có nước dùng +
// thịt, cháo có thịt bằm...). KHÁC với nguyên liệu rời (cơm,
// khoai lang, bánh mì) vốn cần ghép thêm đạm mới thành bữa.
// Validator chặn: chọn standalone rồi ghép thêm carb/protein
// rời khác cùng bữa (VD "bánh cuốn + trứng luộc" — vô lý vì
// bánh cuốn đã là 1 suất, không ai ăn kèm trứng luộc rời).
// Dessert/trái cây vẫn ghép bình thường.
// ------------------------------------------------------------
export const STANDALONE_DISHES = new Set([
  "bún", "miến", "bánh phở", "hủ tiếu", "bánh cuốn", "cháo", "mì ý",
  // Composite dishes (đã có macro cả tô)
  "phở bò", "phở gà", "bún bò huế", "bún riêu", "bún chả", "bún thịt nướng",
  "hủ tiếu nam vang", "bánh canh", "mì quảng", "cháo gà", "cháo thịt bằm",
  "xôi xéo", "xôi gà", "xôi lạc", "bánh cuốn nhân thịt", "bánh mì thịt",
  "cơm tấm", "bún đậu mắm tôm",
  // Batch 3 composite
  "canh chua cá", "canh rau ngót", "canh bí đỏ", "canh mồng tơi", "canh cua", "canh bầu", "canh khổ qua",
  "thịt kho", "cá kho tộ", "trứng kho", "gà kho gừng", "tôm rang", "cơm chiên",
  // Batch 4 composite
  "bánh xèo", "gỏi cuốn", "nem rán", "bánh khọt", "bánh tráng trộn", "gỏi ngó sen",
  "hamburger", "pizza", "hotdog",
  "chè đậu xanh", "chè đậu đỏ", "chè trôi nước", "bánh flan",
  // Batch 5
  "sushi", "kimbap", "tokbokki", "ramen", "pad thái", "cà ri gà",
  "bún mọc", "bún cá", "hủ tiếu xào", "mì xào", "lẩu thái", "lẩu hải sản",
  // Batch 6
  "bún ốc", "cháo lòng", "cháo hải sản", "cơm gà", "cơm sườn",
  "bánh chưng", "bánh tét", "bánh giò", "bò lúc lắc",
  "rau xào thập cẩm", "đậu phụ sốt cà", "canh sườn",
  // Batch 8
  "bún bò xào", "phở xào", "cơm rang dưa bò", "miến xào",
  "canh cải", "canh rau đay", "gà xào sả ớt", "bò xào rau cải",
  "tôm xào", "mực xào", "thịt kho tàu",
]);

export function isStandaloneDish(foodKey) {
  return STANDALONE_DISHES.has((foodKey || "").toLowerCase().trim());
}
