// ============================================================
// LOCAL FOOD DATABASE — Macro per 100g (verified USDA + VN sources)
// Ưu tiên cao nhất: localDB → USDA (raw only) → AI fallback
// ============================================================

// Cooking modifiers — thay đổi macro khi chế biến (per 100g)
export const COOK_MODIFIERS = {
  // Không thay đổi
  "sống":    {p:0, c:0, f:0, cal:0},
  "tươi":    {p:0, c:0, f:0, cal:0},
  "raw":     {p:0, c:0, f:0, cal:0},

  // Mất nước → macro cô đặc nhẹ
  "luộc":    {p:1, c:0, f:0, cal:5},
  "hấp":     {p:1, c:0, f:0, cal:5},

  // Nướng — mất nước + mỡ chảy ra
  "nướng":   {p:2, c:0, f:1, cal:15},
  "nướng lò":{p:2, c:0, f:1, cal:15},

  // Xào — thêm dầu
  "xào":     {p:0, c:0, f:5, cal:45},

  // Chiên — ngập dầu
  "chiên":   {p:0, c:3, f:8, cal:80},
  "rán":     {p:0, c:3, f:8, cal:80},

  // Chiên giòn — bột + dầu
  "chiên giòn":{p:0, c:8, f:10, cal:100},
  "tẩm bột chiên":{p:0, c:8, f:10, cal:100},

  // Áp chảo — chảo chống dính, không dầu (giống luộc)
  "áp chảo": {p:1, c:0, f:0, cal:5},

  // Kho — đường + dầu + nước mắm
  "kho":     {p:0, c:3, f:2, cal:30},
  "rim":     {p:0, c:4, f:2, cal:35},

  // Hầm — mềm, mất ít dinh dưỡng
  "hầm":     {p:0, c:1, f:1, cal:12},
  "om":      {p:0, c:1, f:1, cal:12},
  "tần":     {p:0, c:1, f:0, cal:8},

  // Quay — mỡ chảy + giòn
  "quay":    {p:1, c:2, f:5, cal:50},

  // Sấy — mất nước hoàn toàn, macro × ~3
  "sấy":     {p:0, c:0, f:0, cal:0, note:"multiply_3x"},
  "sấy khô": {p:0, c:0, f:0, cal:0, note:"multiply_3x"},

  // Rang — hạt
  "rang":    {p:0, c:0, f:2, cal:20},
  "roasted": {p:0, c:0, f:2, cal:20},

  // Muối/dầm — không đổi macro đáng kể
  "muối":    {p:0, c:0, f:0, cal:0},
  "dầm":     {p:0, c:2, f:0, cal:8},
  "ngâm":    {p:0, c:1, f:0, cal:4},
};

// ============================================================
// FOOD DATABASE — per 100g, base form (raw hoặc cooked phổ biến nhất)
// ============================================================
export const LOCAL_FOODS = {

  // ==================== 1. THỊT GIA CẦM ====================
  "ức gà":       {p:23.1, c:0,   f:1.2,  cal:110, fiber:0, form:"raw",   cat:"poultry"},
  "ức gà nướng": {p:31.0, c:0,   f:3.6,  cal:165, fiber:0, form:"cooked",cat:"poultry"},
  "ức gà luộc":  {p:29.8, c:0,   f:3.1,  cal:151, fiber:0, form:"cooked",cat:"poultry"},
  "đùi gà":      {p:17.3, c:0,   f:15.3, cal:209, fiber:0, form:"raw",   cat:"poultry"},
  "cánh gà":     {p:17.5, c:0,   f:15.1, cal:203, fiber:0, form:"raw",   cat:"poultry"},
  "gà nguyên con":{p:17.4, c:0,   f:15.1, cal:215, fiber:0, form:"raw",  cat:"poultry"},
  "lòng gà":     {p:17.5, c:1.4, f:5.6,  cal:127, fiber:0, form:"raw",   cat:"poultry"},
  "thịt vịt":    {p:19.3, c:0,   f:11.2, cal:180, fiber:0, form:"raw",   cat:"poultry"},
  "vịt":         {p:19.3, c:0,   f:11.2, cal:180, fiber:0, form:"raw",   cat:"poultry"},

  // ==================== 2. THỊT BÒ ====================
  "thăn bò":     {p:26.0, c:0,   f:8.0,  cal:179, fiber:0, form:"raw",   cat:"beef"},
  "bắp bò":      {p:22.0, c:0,   f:5.4,  cal:140, fiber:0, form:"raw",   cat:"beef"},
  "nạm bò":      {p:18.0, c:0,   f:16.0, cal:218, fiber:0, form:"raw",   cat:"beef"},
  "gân bò":      {p:36.7, c:0,   f:0.5,  cal:150, fiber:0, form:"raw",   cat:"beef"},
  "thịt bò xay": {p:17.2, c:0,   f:15.0, cal:215, fiber:0, form:"raw",   cat:"beef"},
  "sườn bò":     {p:17.5, c:0,   f:22.6, cal:274, fiber:0, form:"raw",   cat:"beef"},
  "thịt bò":     {p:20.0, c:0,   f:12.0, cal:192, fiber:0, form:"raw",   cat:"beef"},
  "bò":          {p:20.0, c:0,   f:12.0, cal:192, fiber:0, form:"raw",   cat:"beef"},
  "bò viên":     {p:14.0, c:3.0, f:8.0,  cal:140, fiber:0, form:"cooked",cat:"beef"},

  // ==================== 3. THỊT HEO ====================
  "thịt heo nạc":{p:27.3, c:0,   f:3.5,  cal:143, fiber:0, form:"raw",   cat:"pork"},
  "thịt lợn nạc":{p:27.3, c:0,   f:3.5,  cal:143, fiber:0, form:"raw",   cat:"pork"},
  "ba chỉ":      {p:9.3,  c:0,   f:53.0, cal:518, fiber:0, form:"raw",   cat:"pork"},
  "ba rọi":      {p:9.3,  c:0,   f:53.0, cal:518, fiber:0, form:"raw",   cat:"pork"},
  "sườn heo":    {p:15.5, c:0,   f:26.7, cal:304, fiber:0, form:"raw",   cat:"pork"},
  "sườn lợn":    {p:15.5, c:0,   f:26.7, cal:304, fiber:0, form:"raw",   cat:"pork"},
  "thịt heo xay":{p:16.9, c:0,   f:21.2, cal:263, fiber:0, form:"raw",   cat:"pork"},
  "thịt lợn xay":{p:16.9, c:0,   f:21.2, cal:263, fiber:0, form:"raw",   cat:"pork"},
  "nạc vai heo": {p:16.5, c:0,   f:18.3, cal:233, fiber:0, form:"raw",   cat:"pork"},
  "thịt heo":    {p:20.5, c:0,   f:11.0, cal:187, fiber:0, form:"raw",   cat:"pork"},
  "thịt lợn":    {p:20.5, c:0,   f:11.0, cal:187, fiber:0, form:"raw",   cat:"pork"},
  "heo":         {p:20.5, c:0,   f:11.0, cal:187, fiber:0, form:"raw",   cat:"pork"},

  // ==================== 4. CÁ & HẢI SẢN ====================
  "cá hồi":      {p:20.4, c:0,   f:13.4, cal:208, fiber:0, form:"raw",   cat:"seafood"},
  "cá ngừ":      {p:29.9, c:0,   f:1.0,  cal:130, fiber:0, form:"raw",   cat:"seafood"},
  "cá rô phi":   {p:20.1, c:0,   f:1.7,  cal:96,  fiber:0, form:"raw",   cat:"seafood"},
  "cá basa":     {p:15.0, c:0,   f:6.0,  cal:116, fiber:0, form:"raw",   cat:"seafood"},
  "cá thu":      {p:18.6, c:0,   f:13.9, cal:205, fiber:0, form:"raw",   cat:"seafood"},
  "cá diêu hồng":{p:18.0, c:0,   f:2.0,  cal:92,  fiber:0, form:"raw",   cat:"seafood"},
  "cá lóc":      {p:18.2, c:0,   f:2.5,  cal:96,  fiber:0, form:"raw",   cat:"seafood"},
  "cá tra":      {p:14.0, c:0,   f:7.0,  cal:120, fiber:0, form:"raw",   cat:"seafood"},
  "cá nục":      {p:19.5, c:0,   f:4.2,  cal:118, fiber:0, form:"raw",   cat:"seafood"},
  "cá chép":     {p:17.8, c:0,   f:5.6,  cal:127, fiber:0, form:"raw",   cat:"seafood"},
  "cá saba":     {p:18.6, c:0,   f:13.9, cal:205, fiber:0, form:"raw",   cat:"seafood"},
  "cá":          {p:18.0, c:0,   f:5.0,  cal:120, fiber:0, form:"raw",   cat:"seafood"},
  "tôm":         {p:24.0, c:0.2, f:0.3,  cal:99,  fiber:0, form:"raw",   cat:"seafood"},
  "tôm sú":      {p:21.0, c:0,   f:0.6,  cal:90,  fiber:0, form:"raw",   cat:"seafood"},
  "mực":         {p:15.6, c:3.1, f:1.4,  cal:92,  fiber:0, form:"raw",   cat:"seafood"},
  "ngao":        {p:12.8, c:3.6, f:1.0,  cal:74,  fiber:0, form:"raw",   cat:"seafood"},
  "nghêu":       {p:12.8, c:3.6, f:1.0,  cal:74,  fiber:0, form:"raw",   cat:"seafood"},
  "cua":         {p:18.1, c:0,   f:1.1,  cal:83,  fiber:0, form:"raw",   cat:"seafood"},
  "hàu":         {p:9.0,  c:4.7, f:2.5,  cal:81,  fiber:0, form:"raw",   cat:"seafood"},
  "bạch tuộc":   {p:14.9, c:2.2, f:1.0,  cal:82,  fiber:0, form:"raw",   cat:"seafood"},
  "cá ngừ hộp":  {p:26.5, c:0,   f:0.8,  cal:116, fiber:0, form:"cooked",cat:"seafood"},

  // ==================== 5. TRỨNG & SỮA ====================
  "trứng gà":    {p:12.6, c:0.7, f:9.5,  cal:143, fiber:0, form:"raw",   cat:"egg_dairy"},
  "trứng":       {p:12.6, c:0.7, f:9.5,  cal:143, fiber:0, form:"raw",   cat:"egg_dairy"},
  "trứng vịt":   {p:12.8, c:1.4, f:13.8, cal:185, fiber:0, form:"raw",   cat:"egg_dairy"},
  "trứng cút":   {p:13.1, c:0.4, f:11.1, cal:158, fiber:0, form:"raw",   cat:"egg_dairy"},
  "lòng trắng trứng":{p:10.9,c:0.7,f:0.2,cal:52, fiber:0, form:"raw",   cat:"egg_dairy"},
  "lòng đỏ trứng":{p:15.9,c:3.6,f:26.5, cal:322, fiber:0, form:"raw",   cat:"egg_dairy"},
  "sữa tươi":    {p:3.2,  c:4.8, f:3.3,  cal:61,  fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa":         {p:3.2,  c:4.8, f:3.3,  cal:61,  fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa tách béo":{p:3.4,  c:5.0, f:0.1,  cal:34,  fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa đậu nành":{p:3.3,  c:6.3, f:1.8,  cal:54,  fiber:0.6,form:"liquid",cat:"egg_dairy"},
  "sữa chua":    {p:3.5,  c:4.7, f:3.3,  cal:61,  fiber:0, form:"liquid",cat:"egg_dairy"},
  "sữa chua hy lạp":{p:10.0,c:3.6,f:0.7, cal:59,  fiber:0, form:"liquid",cat:"egg_dairy"},
  "phô mai":     {p:25.0, c:1.3, f:33.1, cal:403, fiber:0, form:"solid", cat:"egg_dairy"},
  "bơ":          {p:0.9,  c:0.1, f:81.1, cal:717, fiber:0, form:"solid", cat:"egg_dairy"},

  // ==================== 6. TINH BỘT & NGŨ CỐC ====================
  "cơm trắng":   {p:2.7,  c:28.2,f:0.3,  cal:130, fiber:0.4,form:"cooked",cat:"starch"},
  "cơm":         {p:2.7,  c:28.2,f:0.3,  cal:130, fiber:0.4,form:"cooked",cat:"starch"},
  "cơm gạo lứt": {p:2.6,  c:23.5,f:0.9,  cal:112, fiber:1.8,form:"cooked",cat:"starch"},
  "gạo lứt":     {p:7.9,  c:77.2,f:2.9,  cal:370, fiber:3.5,form:"dry",   cat:"starch"},
  "khoai lang":   {p:1.6,  c:20.1,f:0.1,  cal:86,  fiber:3.0,form:"raw",   cat:"starch"},
  "khoai tây":    {p:2.1,  c:17.5,f:0.1,  cal:77,  fiber:2.2,form:"raw",   cat:"starch"},
  "khoai sọ":     {p:1.5,  c:26.5,f:0.2,  cal:112, fiber:4.1,form:"raw",   cat:"starch"},
  "khoai môn":    {p:1.5,  c:26.5,f:0.2,  cal:112, fiber:4.1,form:"raw",   cat:"starch"},
  "yến mạch":     {p:16.9, c:66.3,f:6.9,  cal:389, fiber:10.6,form:"dry",  cat:"starch"},
  "bột yến mạch": {p:16.9, c:66.3,f:6.9,  cal:389, fiber:10.6,form:"dry",  cat:"starch"},
  "bánh mì":      {p:9.0,  c:49.0,f:3.2,  cal:265, fiber:2.7,form:"cooked",cat:"starch"},
  "bánh mì đen":  {p:10.0, c:43.0,f:3.5,  cal:247, fiber:6.0,form:"cooked",cat:"starch"},
  "bún":          {p:3.4,  c:24.9,f:0.1,  cal:109, fiber:0.4,form:"cooked",cat:"starch"},
  "miến":         {p:0.1,  c:86.1,f:0.1,  cal:334, fiber:0.5,form:"dry",   cat:"starch"},
  "mì ý":         {p:5.8,  c:30.9,f:0.9,  cal:158, fiber:1.8,form:"cooked",cat:"starch"},
  "ngô":          {p:3.3,  c:19.0,f:1.5,  cal:86,  fiber:2.7,form:"raw",   cat:"starch"},
  "bắp":          {p:3.3,  c:19.0,f:1.5,  cal:86,  fiber:2.7,form:"raw",   cat:"starch"},
  "xôi":          {p:3.5,  c:37.0,f:0.6,  cal:168, fiber:0.3,form:"cooked",cat:"starch"},
  "bánh tráng":   {p:3.0,  c:80.0,f:0.5,  cal:330, fiber:0.5,form:"dry",   cat:"starch"},

  // ==================== 7. TRÁI CÂY ====================
  "chuối":        {p:1.1,  c:22.8,f:0.3,  cal:89,  fiber:2.6,form:"raw",   cat:"fruit"},
  "táo":          {p:0.3,  c:13.8,f:0.2,  cal:52,  fiber:2.4,form:"raw",   cat:"fruit"},
  "cam":          {p:0.9,  c:11.8,f:0.1,  cal:47,  fiber:2.4,form:"raw",   cat:"fruit"},
  "bưởi":         {p:0.8,  c:10.7,f:0.1,  cal:42,  fiber:1.6,form:"raw",   cat:"fruit"},
  "xoài":         {p:0.8,  c:15.0,f:0.4,  cal:60,  fiber:1.6,form:"raw",   cat:"fruit"},
  "ổi":           {p:2.6,  c:14.3,f:1.0,  cal:68,  fiber:5.4,form:"raw",   cat:"fruit"},
  "dưa hấu":     {p:0.6,  c:7.6, f:0.2,  cal:30,  fiber:0.4,form:"raw",   cat:"fruit"},
  "nho":          {p:0.7,  c:18.1,f:0.2,  cal:69,  fiber:0.9,form:"raw",   cat:"fruit"},
  "dâu tây":      {p:0.7,  c:7.7, f:0.3,  cal:32,  fiber:2.0,form:"raw",   cat:"fruit"},
  "thanh long":   {p:1.1,  c:11.0,f:0.4,  cal:50,  fiber:3.0,form:"raw",   cat:"fruit"},
  "bơ quả":       {p:2.0,  c:8.5, f:14.7, cal:160, fiber:6.7,form:"raw",   cat:"fruit"},
  "quả bơ":       {p:2.0,  c:8.5, f:14.7, cal:160, fiber:6.7,form:"raw",   cat:"fruit"},
  "đu đủ":        {p:0.5,  c:10.8,f:0.3,  cal:43,  fiber:1.7,form:"raw",   cat:"fruit"},
  "kiwi":         {p:1.1,  c:14.7,f:0.5,  cal:61,  fiber:3.0,form:"raw",   cat:"fruit"},
  "lê":           {p:0.4,  c:15.2,f:0.1,  cal:57,  fiber:3.1,form:"raw",   cat:"fruit"},
  "mận":          {p:0.7,  c:11.4,f:0.3,  cal:46,  fiber:1.4,form:"raw",   cat:"fruit"},
  "vải":          {p:0.8,  c:16.5,f:0.4,  cal:66,  fiber:1.3,form:"raw",   cat:"fruit"},
  "chôm chôm":   {p:0.7,  c:16.0,f:0.2,  cal:68,  fiber:0.9,form:"raw",   cat:"fruit"},
  "sầu riêng":   {p:1.5,  c:27.1,f:5.3,  cal:147, fiber:3.8,form:"raw",   cat:"fruit"},
  "mít":          {p:1.7,  c:23.2,f:0.6,  cal:95,  fiber:1.5,form:"raw",   cat:"fruit"},
  "dừa":          {p:3.3,  c:15.2,f:33.5, cal:354, fiber:9.0,form:"raw",   cat:"fruit"},
  "chanh":        {p:1.1,  c:9.3, f:0.3,  cal:29,  fiber:2.8,form:"raw",   cat:"fruit"},
  "việt quất":    {p:0.7,  c:14.5,f:0.3,  cal:57,  fiber:2.4,form:"raw",   cat:"fruit"},
  "na":           {p:1.7,  c:23.6,f:0.6,  cal:94,  fiber:4.4,form:"raw",   cat:"fruit"},
  "sapoche":      {p:0.4,  c:20.0,f:1.1,  cal:83,  fiber:5.3,form:"raw",   cat:"fruit"},
  "măng cụt":     {p:0.4,  c:17.9,f:0.6,  cal:73,  fiber:1.8,form:"raw",   cat:"fruit"},

  // ==================== 8. RAU CỦ ====================
  "bông cải xanh":{p:2.8,  c:7.0, f:0.4,  cal:34,  fiber:2.6,form:"raw",   cat:"veg"},
  "bông cải trắng":{p:1.9, c:5.0, f:0.3,  cal:25,  fiber:2.0,form:"raw",   cat:"veg"},
  "rau bina":     {p:2.9,  c:3.6, f:0.4,  cal:23,  fiber:2.2,form:"raw",   cat:"veg"},
  "rau muống":    {p:2.6,  c:3.1, f:0.2,  cal:19,  fiber:2.1,form:"raw",   cat:"veg"},
  "rau dền":      {p:2.5,  c:4.0, f:0.3,  cal:23,  fiber:2.0,form:"raw",   cat:"veg"},
  "rau ngót":     {p:5.3,  c:3.4, f:0.7,  cal:36,  fiber:2.0,form:"raw",   cat:"veg"},
  "mồng tơi":    {p:1.8,  c:3.4, f:0.3,  cal:19,  fiber:1.6,form:"raw",   cat:"veg"},
  "rau cải":      {p:1.5,  c:2.2, f:0.2,  cal:13,  fiber:1.0,form:"raw",   cat:"veg"},
  "cải thảo":     {p:1.2,  c:2.0, f:0.2,  cal:12,  fiber:1.2,form:"raw",   cat:"veg"},
  "bắp cải":      {p:1.3,  c:5.8, f:0.1,  cal:25,  fiber:2.5,form:"raw",   cat:"veg"},
  "xà lách":      {p:1.4,  c:2.9, f:0.2,  cal:15,  fiber:1.3,form:"raw",   cat:"veg"},
  "cà chua":      {p:0.9,  c:3.9, f:0.2,  cal:18,  fiber:1.2,form:"raw",   cat:"veg"},
  "dưa chuột":   {p:0.7,  c:3.6, f:0.1,  cal:15,  fiber:0.5,form:"raw",   cat:"veg"},
  "dưa leo":     {p:0.7,  c:3.6, f:0.1,  cal:15,  fiber:0.5,form:"raw",   cat:"veg"},
  "cà rốt":       {p:0.9,  c:9.6, f:0.2,  cal:41,  fiber:2.8,form:"raw",   cat:"veg"},
  "hành tây":     {p:1.1,  c:9.3, f:0.1,  cal:40,  fiber:1.7,form:"raw",   cat:"veg"},
  "ớt chuông":   {p:1.0,  c:6.0, f:0.3,  cal:26,  fiber:2.1,form:"raw",   cat:"veg"},
  "nấm":         {p:3.1,  c:3.3, f:0.3,  cal:22,  fiber:1.0,form:"raw",   cat:"veg"},
  "đậu bắp":     {p:1.9,  c:7.5, f:0.2,  cal:33,  fiber:3.2,form:"raw",   cat:"veg"},
  "bí đỏ":        {p:1.0,  c:6.5, f:0.1,  cal:26,  fiber:0.5,form:"raw",   cat:"veg"},
  "bí xanh":      {p:1.2,  c:3.1, f:0.3,  cal:17,  fiber:1.0,form:"raw",   cat:"veg"},
  "su su":        {p:0.8,  c:4.5, f:0.1,  cal:19,  fiber:1.7,form:"raw",   cat:"veg"},
  "su hào":       {p:1.7,  c:6.2, f:0.1,  cal:27,  fiber:3.6,form:"raw",   cat:"veg"},
  "măng":         {p:2.6,  c:5.2, f:0.3,  cal:27,  fiber:2.2,form:"raw",   cat:"veg"},
  "măng tây":     {p:2.2,  c:3.9, f:0.1,  cal:20,  fiber:2.1,form:"raw",   cat:"veg"},
  "giá đỗ":       {p:3.0,  c:5.9, f:0.2,  cal:31,  fiber:1.8,form:"raw",   cat:"veg"},
  "đậu cô ve":   {p:1.8,  c:7.0, f:0.1,  cal:31,  fiber:3.4,form:"raw",   cat:"veg"},
  "đậu que":      {p:1.8,  c:7.0, f:0.1,  cal:31,  fiber:3.4,form:"raw",   cat:"veg"},
  "đậu phụ":     {p:8.0,  c:1.9, f:4.8,  cal:76,  fiber:0.3,form:"solid", cat:"veg"},
  "tỏi":          {p:6.4,  c:33.1,f:0.5,  cal:149, fiber:2.1,form:"raw",   cat:"veg"},
  "gừng":         {p:1.8,  c:17.8,f:0.8,  cal:80,  fiber:2.0,form:"raw",   cat:"veg"},

  // ==================== 9. ĐẬU / HẠT / DẦU ====================
  "đậu nành":    {p:36.5, c:30.2,f:19.9, cal:446, fiber:9.3,form:"dry",   cat:"nuts"},
  "đậu đen":     {p:21.6, c:62.4,f:1.4,  cal:341, fiber:15.5,form:"dry",  cat:"nuts"},
  "đậu xanh":    {p:23.9, c:62.6,f:1.2,  cal:347, fiber:16.3,form:"dry",  cat:"nuts"},
  "đậu đỏ":      {p:22.5, c:60.0,f:0.5,  cal:333, fiber:15.2,form:"dry",  cat:"nuts"},
  "đậu lăng":    {p:25.8, c:60.1,f:1.1,  cal:352, fiber:10.7,form:"dry",  cat:"nuts"},
  "edamame":     {p:11.9, c:8.4, f:5.2,  cal:121, fiber:5.2,form:"cooked",cat:"nuts"},
  "lạc":          {p:25.8, c:16.1,f:49.2, cal:567, fiber:8.5,form:"raw",   cat:"nuts"},
  "đậu phộng":   {p:25.8, c:16.1,f:49.2, cal:567, fiber:8.5,form:"raw",   cat:"nuts"},
  "hạt điều":    {p:18.2, c:30.2,f:43.9, cal:553, fiber:3.3,form:"raw",   cat:"nuts"},
  "hạnh nhân":   {p:21.2, c:21.6,f:49.9, cal:579, fiber:12.5,form:"raw",  cat:"nuts"},
  "hạt óc chó":  {p:15.2, c:13.7,f:65.2, cal:654, fiber:6.7,form:"raw",   cat:"nuts"},
  "hạt chia":    {p:16.5, c:42.1,f:30.7, cal:486, fiber:34.4,form:"dry",  cat:"nuts"},
  "hạt lanh":    {p:18.3, c:28.9,f:42.2, cal:534, fiber:27.3,form:"dry",  cat:"nuts"},
  "hạt bí":      {p:30.2, c:10.7,f:49.1, cal:559, fiber:6.0,form:"raw",   cat:"nuts"},
  "hạt hướng dương":{p:20.8,c:20.0,f:51.5,cal:584,fiber:8.6,form:"raw",  cat:"nuts"},
  "mè":          {p:17.7, c:23.5,f:49.7, cal:573, fiber:11.8,form:"raw",  cat:"nuts"},
  "vừng":        {p:17.7, c:23.5,f:49.7, cal:573, fiber:11.8,form:"raw",  cat:"nuts"},
  "hạt mắc ca":  {p:7.9,  c:13.8,f:75.8, cal:718, fiber:8.6,form:"raw",   cat:"nuts"},
  "bơ đậu phộng":{p:25.1, c:20.0,f:50.4, cal:588, fiber:6.0,form:"solid", cat:"nuts"},
  "dầu ô liu":   {p:0,    c:0,   f:100,  cal:884, fiber:0,  form:"liquid",cat:"nuts"},
  "dầu dừa":     {p:0,    c:0,   f:100,  cal:862, fiber:0,  form:"liquid",cat:"nuts"},
  "dầu ăn":      {p:0,    c:0,   f:100,  cal:884, fiber:0,  form:"liquid",cat:"nuts"},
  "dầu mè":      {p:0,    c:0,   f:100,  cal:884, fiber:0,  form:"liquid",cat:"nuts"},

  // ==================== 10. GIA VỊ & NƯỚC CHẤM ====================
  "nước mắm":    {p:5.1,  c:3.6, f:0,    cal:35,  fiber:0,  form:"liquid",cat:"sauce"},
  "xì dầu":      {p:5.6,  c:4.9, f:0.1,  cal:53,  fiber:0,  form:"liquid",cat:"sauce"},
  "nước tương":  {p:5.6,  c:4.9, f:0.1,  cal:53,  fiber:0,  form:"liquid",cat:"sauce"},
  "mật ong":     {p:0.3,  c:82.4,f:0,    cal:304, fiber:0.2,form:"liquid",cat:"sauce"},
  "đường":       {p:0,    c:100, f:0,    cal:387, fiber:0,  form:"dry",   cat:"sauce"},
  "tương ớt":    {p:0.9,  c:32.5,f:0.5,  cal:130, fiber:1.5,form:"liquid",cat:"sauce"},
  "mayonnaise":  {p:1.0,  c:0.6, f:79.4, cal:717, fiber:0,  form:"liquid",cat:"sauce"},

  // ==================== 11. BỔ SUNG GYM ====================
  "whey":        {p:80.0, c:7.0, f:3.0,  cal:380, fiber:0,  form:"powder",cat:"supp"},
  "bột whey":    {p:80.0, c:7.0, f:3.0,  cal:380, fiber:0,  form:"powder",cat:"supp"},
  "whey isolate":{p:90.0, c:2.0, f:1.0,  cal:375, fiber:0,  form:"powder",cat:"supp"},
  "mass gainer": {p:15.0, c:75.0,f:3.0,  cal:390, fiber:1.0,form:"powder",cat:"supp"},
  "casein":      {p:80.0, c:5.0, f:2.0,  cal:360, fiber:0,  form:"powder",cat:"supp"},
  "protein bar": {p:25.0, c:35.0,f:12.0, cal:350, fiber:5.0,form:"solid", cat:"supp"},
  "granola":     {p:10.0, c:64.0,f:18.0, cal:471, fiber:5.0,form:"dry",   cat:"supp"},
  "granola bar": {p:8.0,  c:60.0,f:14.0, cal:400, fiber:3.0,form:"solid", cat:"supp"},
  "creatine":    {p:0,    c:0,   f:0,    cal:0,   fiber:0,  form:"powder",cat:"supp"},
  "bcaa":        {p:0,    c:0,   f:0,    cal:0,   fiber:0,  form:"powder",cat:"supp"},

  // ==================== 12. CHẾ BIẾN SẴN ====================
  "xúc xích":    {p:12.0, c:2.0, f:28.0, cal:301, fiber:0,  form:"cooked",cat:"processed"},
  "giò":         {p:15.5, c:2.0, f:5.5,  cal:120, fiber:0,  form:"cooked",cat:"processed"},
  "chả lụa":    {p:15.5, c:2.0, f:5.5,  cal:120, fiber:0,  form:"cooked",cat:"processed"},
  "chả":        {p:14.0, c:3.0, f:8.0,  cal:140, fiber:0,  form:"cooked",cat:"processed"},
  "nem":         {p:8.0,  c:20.0,f:12.0, cal:220, fiber:1.0,form:"cooked",cat:"processed"},
  "patê":        {p:11.4, c:1.5, f:28.0, cal:319, fiber:0,  form:"cooked",cat:"processed"},

  // ==================== 13. ĐỒ UỐNG ====================
  "nước dừa":    {p:0.7,  c:3.7, f:0.2,  cal:19,  fiber:0,  form:"liquid",cat:"drink"},
  "nước cam":    {p:0.7,  c:10.4,f:0.2,  cal:45,  fiber:0.2,form:"liquid",cat:"drink"},
  "cà phê đen":  {p:0.1,  c:0,   f:0,    cal:2,   fiber:0,  form:"liquid",cat:"drink"},
  "cà phê":      {p:0.1,  c:0,   f:0,    cal:2,   fiber:0,  form:"liquid",cat:"drink"},
  "trà xanh":    {p:0,    c:0,   f:0,    cal:1,   fiber:0,  form:"liquid",cat:"drink"},
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
  const g = gram || 100;
  const r = g / 100;
  const mod = cookKey ? COOK_MODIFIERS[cookKey] : null;

  // Base per 100g
  let p = base.p;
  let c = base.c;
  let f = base.f;
  let cal = base.cal;
  let fiber = base.fiber || 0;

  // Apply cooking modifier (per 100g)
  if (mod) {
    if (mod.note === "multiply_3x") {
      // Sấy khô: macro × 3 (mất 70% nước)
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
