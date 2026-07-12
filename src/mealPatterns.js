// ============================================================
// mealPatterns.js — MÓN ĂN THẬT, không phải slot dinh dưỡng.
//
// Mỗi pattern = 1 bữa ăn Việt cụ thể, gồm danh sách dishes (MÓN)
// với tên hiển thị có CÁCH CHẾ BIẾN ("Gà luộc", "Rau muống xào tỏi",
// "Canh bí đỏ") + key trong LOCAL_FOODS để engine tính macro.
//
// fruit TÁCH RIÊNG thành dessert — không nhét vào bữa chính
// (không ai ăn "Cơm sườn" kèm "táo" — đó là tư duy nutrition,
// không phải tư duy bữa ăn Việt).
//
// MEAL TIMES mặc định (dùng cho UI hiển thị):
export const MEAL_TIMES = {
  sang: "07:00", phu_sang: "09:30", trua: "12:00",
  phu_chieu: "15:30", pre: "17:00", post: "19:00", toi: "19:00",
};
// ============================================================

export const MEAL_PATTERNS = {
  sang: [
    { name: "Trứng khoai lang",
      dishes: [
        { display: "Trứng gà luộc", food: "trứng gà luộc", role: "protein" },
        { display: "Khoai lang luộc", food: "khoai lang", role: "carb" },
      ],
      dessert: { display: "Chuối", food: "chuối" },
      popularity: 5, prepMinutes: 10, buyable: true,
      reasonTemplate: { cut: "Nhẹ bụng, chuẩn bị dưới 10 phút", bulk: "Nhanh gọn, đủ năng lượng buổi sáng" } },

    { name: "Bánh mì trứng",
      dishes: [
        { display: "Bánh mì", food: "bánh mì", role: "carb" },
        { display: "Trứng chiên", food: "trứng gà", role: "protein" },
        { display: "Dưa leo", food: "dưa leo", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 5, buyable: true },

    { name: "Xôi trứng",
      dishes: [
        { display: "Xôi", food: "xôi", role: "carb" },
        { display: "Trứng gà luộc", food: "trứng gà luộc", role: "protein" },
        { display: "Dưa leo", food: "dưa leo", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 10, buyable: true,
      reasonTemplate: { bulk: "Ngày tập cần nhiều carb hơn, xôi no lâu" } },

    { name: "Phở bò", composite: true,
      dishes: [
        { display: "Nước dùng", food: "dầu ăn", role: "fat" },
        { display: "Bánh phở", food: "bánh phở", role: "carb" },
        { display: "Thịt bò", food: "thịt bò", role: "protein" },
        { display: "Giá đỗ", food: "giá đỗ", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 15, buyable: true },

    { name: "Phở gà", composite: true,
      dishes: [
        { display: "Nước dùng", food: "dầu ăn", role: "fat" },
        { display: "Bánh phở", food: "bánh phở", role: "carb" },
        { display: "Gà luộc xé", food: "ức gà luộc", role: "protein" },
        { display: "Giá đỗ", food: "giá đỗ", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 15, buyable: true,
      reasonTemplate: { cut: "Gà nạc, ít béo hơn phở bò" } },

    { name: "Bún thịt",
      dishes: [
        { display: "Bún", food: "bún", role: "carb" },
        { display: "Thịt heo luộc", food: "thịt heo nạc", role: "protein" },
        { display: "Rau muống", food: "rau muống", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 15, buyable: true },

    { name: "Cháo thịt", composite: true,
      dishes: [
        { display: "Nước dùng", food: "dầu ăn", role: "fat" },
        { display: "Cháo", food: "cháo", role: "carb" },
        { display: "Thịt heo xay", food: "thịt heo xay", role: "protein" },
        { display: "Cà rốt", food: "cà rốt", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 20, buyable: true,
      reasonTemplate: { cut: "Cháo nhiều nước, no bụng mà ít calo" } },

    { name: "Cháo gà", composite: true,
      dishes: [
        { display: "Nước dùng", food: "dầu ăn", role: "fat" },
        { display: "Cháo", food: "cháo", role: "carb" },
        { display: "Gà xé", food: "ức gà", role: "protein" },
        { display: "Cà rốt", food: "cà rốt", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Yến mạch trứng",
      dishes: [
        { display: "Yến mạch", food: "yến mạch", role: "carb" },
        { display: "Trứng luộc", food: "trứng gà luộc", role: "protein" },
        { display: "Cà chua", food: "cà chua", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 10, buyable: false,
      reasonTemplate: { bulk: "Yến mạch giàu carb phức hợp, no lâu cho ngày tập" } },

    { name: "Xôi đậu phụ",
      dishes: [
        { display: "Xôi", food: "xôi", role: "carb" },
        { display: "Đậu phụ chiên", food: "đậu phụ", role: "protein" },
        { display: "Dưa leo", food: "dưa leo", role: "fixed" },
      ],
      popularity: 2, prepMinutes: 10, buyable: true },
  ],

  trua: [
    { name: "Cơm gà nướng",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Ức gà nướng", food: "ức gà nướng", role: "protein" },
        { display: "Rau muống luộc", food: "rau muống", role: "fixed" },
        { display: "Canh bí đỏ", food: "bí đỏ", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 20, buyable: true,
      reasonTemplate: { bulk: "Gà nướng nhiều đạm, hỗ trợ tăng cơ" } },

    { name: "Cơm cá kho",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Cá basa kho", food: "cá basa", role: "protein" },
        { display: "Bông cải xanh luộc", food: "bông cải xanh", role: "fixed" },
        { display: "Canh rau ngót", food: "rau ngót", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Cơm sườn",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Sườn heo nướng", food: "sườn heo", role: "protein" },
        { display: "Dưa leo", food: "dưa leo", role: "fixed" },
        { display: "Canh cải thảo", food: "cải thảo", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 25, buyable: true },

    { name: "Bún bò", composite: true,
      dishes: [
        { display: "Nước dùng", food: "dầu ăn", role: "fat" },
        { display: "Bún", food: "bún", role: "carb" },
        { display: "Thịt bò", food: "thịt bò", role: "protein" },
        { display: "Rau muống", food: "rau muống", role: "fixed" },
        { display: "Giá đỗ", food: "giá đỗ", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Cơm thịt kho",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Thịt heo kho", food: "thịt heo nạc", role: "protein" },
        { display: "Rau cải luộc", food: "rau cải", role: "fixed" },
        { display: "Canh bí xanh", food: "bí xanh", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Cơm đậu phụ",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Đậu phụ sốt cà", food: "đậu phụ", role: "protein" },
        { display: "Bông cải xanh luộc", food: "bông cải xanh", role: "fixed" },
        { display: "Canh rau ngót", food: "rau ngót", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: true,
      reasonTemplate: { cut: "Đạm thực vật, ít béo, hợp người ăn chay" } },

    { name: "Bún đậu",
      dishes: [
        { display: "Bún", food: "bún", role: "carb" },
        { display: "Đậu phụ chiên", food: "đậu phụ", role: "protein" },
        { display: "Rau muống", food: "rau muống", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 15, buyable: true },

    { name: "Cơm cá rô phi",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Cá rô phi chiên", food: "cá rô phi", role: "protein" },
        { display: "Canh bí đỏ", food: "bí đỏ", role: "fixed" },
        { display: "Rau cải luộc", food: "rau cải", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: true },

    { name: "Bún thịt nướng",
      dishes: [
        { display: "Bún", food: "bún", role: "carb" },
        { display: "Thịt heo nướng", food: "thịt heo nạc", role: "protein" },
        { display: "Giá đỗ", food: "giá đỗ", role: "fixed" },
        { display: "Rau sống", food: "xà lách", role: "fixed" },
      ],
      popularity: 5, prepMinutes: 25, buyable: true },

    { name: "Cơm cá diêu hồng",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Cá diêu hồng hấp", food: "cá diêu hồng", role: "protein" },
        { display: "Mồng tơi luộc", food: "mồng tơi", role: "fixed" },
        { display: "Canh rau ngót", food: "rau ngót", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: false },
  ],

  toi: [
    { name: "Cơm canh rau",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Thịt heo luộc", food: "thịt heo nạc", role: "protein" },
        { display: "Canh rau ngót", food: "rau ngót", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Cá kho",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Cá basa kho", food: "cá basa", role: "protein" },
        { display: "Rau muống luộc", food: "rau muống", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 25, buyable: false },

    { name: "Gà luộc",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Gà luộc", food: "ức gà luộc", role: "protein" },
        { display: "Bắp cải luộc", food: "bắp cải", role: "fixed" },
        { display: "Canh bí đỏ", food: "bí đỏ", role: "fixed" },
      ],
      popularity: 4, prepMinutes: 20, buyable: true },

    { name: "Thịt luộc rau",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Thịt heo luộc", food: "thịt heo nạc", role: "protein" },
        { display: "Bông cải trắng luộc", food: "bông cải trắng", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: false },

    { name: "Cá lóc kho",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Cá lóc kho", food: "cá lóc", role: "protein" },
        { display: "Cải thảo luộc", food: "cải thảo", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 25, buyable: false },

    { name: "Đậu phụ rau",
      dishes: [
        { display: "Khoai lang luộc", food: "khoai lang", role: "carb" },
        { display: "Đậu phụ sốt cà", food: "đậu phụ", role: "protein" },
        { display: "Bông cải xanh luộc", food: "bông cải xanh", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: false,
      reasonTemplate: { cut: "Khoai lang thay cơm — carb chậm hơn, no lâu hơn buổi tối" } },

    { name: "Tôm xào",
      dishes: [
        { display: "Cơm trắng", food: "cơm trắng", role: "carb" },
        { display: "Tôm xào", food: "tôm", role: "protein" },
        { display: "Su su luộc", food: "su su", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 20, buyable: false },

    { name: "Trứng chiên rau",
      dishes: [
        { display: "Khoai lang luộc", food: "khoai lang", role: "carb" },
        { display: "Trứng chiên", food: "trứng gà", role: "protein" },
        { display: "Rau dền luộc", food: "rau dền", role: "fixed" },
      ],
      popularity: 3, prepMinutes: 15, buyable: false,
      reasonTemplate: { cut: "Bữa tối nhẹ, ít carb hơn cơm" } },
  ],
};
