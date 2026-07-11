// ============================================================
// mealPatterns.js — TÀI SẢN TRUNG TÂM của Product (không phải Blueprint).
// "Macro ai cũng tính được. Pattern thì không."
//
// Mỗi pattern = 1 món có TÊN quen thuộc, đã map sẵn ra slot {protein,
// carb, veg, fruit?} — AI/Recommendation chọn 1 pattern thay vì tự ghép
// nguyên liệu rời. KHÔNG lưu macro/gram (macro tính qua LOCAL_FOODS như
// cũ, không đổi Nutrition Pipeline).
//
// Product Principle áp dụng khi chọn nguyên liệu: ưu tiên món RẺ + PHỔ
// THÔNG (không dùng "cá hồi" dù macro đẹp hơn "cá basa" — xem tier trong
// localFoodDB.js). 27 pattern khởi điểm (9 sáng/10 trưa/8 tối) — KHÔNG
// đuổi theo số lượng lớn hơn, mở rộng sau dựa trên tín hiệu thật (món
// nào hay bị đổi → thêm biến thể; món nào không ai chọn → bỏ).
//
// popularity: 1-5 (độ phổ biến, ước lượng chủ quan — sẽ hiệu chỉnh bằng
//   dữ liệu thật khi có Recommendation Memory ở Phase 2)
// prepMinutes: thời gian chuẩn bị ước lượng (phút)
// buyable: mua sẵn ngoài hàng được không (true = tiện cho dân văn phòng
//   sáng vội; false = cần tự nấu, phù hợp nội trợ có thời gian)
// reasonTemplate: câu giải thích TĨNH theo goalType — không tốn thêm
//   lệnh AI, chỉ chọn câu khớp context lúc hiển thị
// ============================================================

export const MEAL_PATTERNS = {
  sang: [
    { name: "Bánh mì trứng",
      slots: { protein: "trứng gà luộc", carb: "bánh mì", veg: "cà chua" },
      popularity: 5, prepMinutes: 5, buyable: true,
      reasonTemplate: { cut: "Nhẹ bụng, chuẩn bị dưới 10 phút", bulk: "Nhanh gọn, đủ năng lượng buổi sáng" } },

    { name: "Xôi trứng",
      slots: { protein: "trứng gà luộc", carb: "xôi", veg: "dưa leo" },
      popularity: 4, prepMinutes: 10, buyable: true,
      reasonTemplate: { bulk: "Ngày tập cần nhiều carb hơn, xôi no lâu" } },

    { name: "Phở bò",
      slots: { protein: "thịt bò", carb: "bánh phở", veg: "giá đỗ" },
      popularity: 5, prepMinutes: 15, buyable: true },

    { name: "Phở gà",
      slots: { protein: "ức gà", carb: "bánh phở", veg: "giá đỗ" },
      popularity: 5, prepMinutes: 15, buyable: true,
      reasonTemplate: { cut: "Ức gà nạc, ít béo hơn phở bò" } },

    { name: "Bún thịt",
      slots: { protein: "thịt heo nạc", carb: "bún", veg: "rau muống" },
      popularity: 3, prepMinutes: 15, buyable: true },

    { name: "Cháo thịt",
      slots: { protein: "thịt heo xay", carb: "cháo", veg: "cà rốt" },
      popularity: 4, prepMinutes: 20, buyable: true,
      reasonTemplate: { cut: "Cháo nhiều nước, no bụng mà ít calo" } },

    { name: "Cháo gà",
      slots: { protein: "ức gà", carb: "cháo", veg: "hành tây" },
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Miến gà",
      slots: { protein: "ức gà", carb: "miến", veg: "cà rốt" },
      popularity: 3, prepMinutes: 15, buyable: true },

    { name: "Yến mạch trứng",
      slots: { protein: "trứng gà", carb: "yến mạch", veg: "cà chua" },
      popularity: 3, prepMinutes: 10, buyable: false,
      reasonTemplate: { bulk: "Yến mạch giàu carb phức hợp, no lâu cho ngày tập" } },
  ],

  trua: [
    { name: "Cơm gà",
      slots: { protein: "ức gà", carb: "cơm trắng", veg: "rau muống", fruit: "chuối" },
      popularity: 5, prepMinutes: 20, buyable: true },

    { name: "Cơm cá",
      slots: { protein: "cá basa", carb: "cơm trắng", veg: "bông cải xanh", fruit: "cam" },
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Cơm sườn",
      slots: { protein: "sườn heo", carb: "cơm trắng", veg: "dưa leo", fruit: "táo" },
      popularity: 5, prepMinutes: 25, buyable: true },

    { name: "Bún bò",
      slots: { protein: "thịt bò", carb: "bún", veg: "rau muống", fruit: "chuối" },
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Thịt kho",
      slots: { protein: "thịt heo nạc", carb: "cơm trắng", veg: "rau cải", fruit: "ổi" },
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Cơm đậu phụ",
      slots: { protein: "đậu phụ", carb: "cơm trắng", veg: "bông cải xanh", fruit: "chuối" },
      popularity: 3, prepMinutes: 20, buyable: true,
      reasonTemplate: { cut: "Đạm thực vật, ít béo, hợp người ăn chay" } },

    { name: "Cơm cá rô phi",
      slots: { protein: "cá rô phi", carb: "cơm trắng", veg: "bí đỏ", fruit: "dưa hấu" },
      popularity: 3, prepMinutes: 20, buyable: true },

    { name: "Cơm gà nướng",
      slots: { protein: "ức gà nướng", carb: "cơm trắng", veg: "cải thảo", fruit: "táo" },
      popularity: 4, prepMinutes: 25, buyable: true,
      reasonTemplate: { bulk: "Gà nướng nhiều đạm, hỗ trợ tăng cơ" } },

    { name: "Bún thịt nướng",
      slots: { protein: "thịt heo nạc", carb: "bún", veg: "giá đỗ", fruit: "chuối" },
      popularity: 5, prepMinutes: 25, buyable: true },

    { name: "Cơm cá diêu hồng",
      slots: { protein: "cá diêu hồng", carb: "cơm trắng", veg: "mồng tơi", fruit: "cam" },
      popularity: 3, prepMinutes: 20, buyable: false },
  ],

  toi: [
    { name: "Cơm canh rau",
      slots: { protein: "thịt heo nạc", carb: "cơm trắng", veg: "rau ngót" },
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Cá kho",
      slots: { protein: "cá basa", carb: "cơm trắng", veg: "rau muống" },
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Thịt luộc rau",
      slots: { protein: "thịt heo nạc", carb: "cơm trắng", veg: "bông cải trắng" },
      popularity: 3, prepMinutes: 20, buyable: false },

    { name: "Gà luộc",
      slots: { protein: "ức gà luộc", carb: "cơm trắng", veg: "bắp cải" },
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Cá lóc kho",
      slots: { protein: "cá lóc", carb: "cơm trắng", veg: "cải thảo" },
      popularity: 3, prepMinutes: 25, buyable: false },

    { name: "Đậu phụ rau",
      slots: { protein: "đậu phụ", carb: "khoai lang", veg: "bông cải xanh" },
      popularity: 3, prepMinutes: 20, buyable: false,
      reasonTemplate: { cut: "Khoai lang thay cơm — carb chậm hơn, no lâu hơn buổi tối" } },

    { name: "Tôm rau",
      slots: { protein: "tôm", carb: "cơm trắng", veg: "su su" },
      popularity: 3, prepMinutes: 20, buyable: false },

    { name: "Trứng chiên rau",
      slots: { protein: "trứng gà", carb: "khoai lang", veg: "rau dền" },
      popularity: 3, prepMinutes: 15, buyable: false,
      reasonTemplate: { cut: "Bữa tối nhẹ, ít carb hơn cơm" } },
  ],
};
