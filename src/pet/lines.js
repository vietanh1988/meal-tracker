// Kho câu Pi nói (chốt 20/10 — giọng Pi). Mỗi việc có câu cho Pi nam và Pi nữ; {so} = số thật máy ghép vào.
// Luật chung: xưng "Pi", gọi "bạn", ≤ ~15 chữ, không emoji, không chê / dọa / trách, không bàn béo gầy (cân tăng thì im).
// Đây là bản soạn sẵn ban đầu; khi có bảng DB, Quản trị sửa / thêm câu, file này chỉ là dữ liệu gốc.
export const VOICE = {
  nam: { label: "Pi nam", tag: "Bạn tập cùng · hăng hái, lém lỉnh", words: "chiến, ngon, quá đã, rủ rê" },
  nu: { label: "Pi nữ", tag: "Bạn thân · dịu dàng, quan tâm", words: "nè, ghê, nha, dặn dò" },
};

// key, tên việc (chữ đời thường), khi nào nói, ưu tiên (số nhỏ nói trước), câu theo giọng
export const EVENTS = [
  { key: "back", label: "Quay lại sau mấy ngày vắng", when: "Mở app sau ≥ 2 ngày không có bữa đã ăn", prio: 1,
    nam: ["Ê bạn về rồi! Pi chờ mãi đó!", "Về rồi hả? Chiến tiếp thôi!"], nu: ["A, bạn quay lại rồi! Pi nhớ bạn lắm!", "Bạn về rồi nè, Pi vui ghê!"] },
  { key: "level", label: "Pi lên cấp", when: "Ngay khi đủ kinh nghiệm", prio: 2,
    nam: ["Lên cấp {so}! Pi mạnh thêm rồi nhé!"], nu: ["Pi lên cấp {so} rồi, cảm ơn bạn nha!"] },
  { key: "streak", label: "Chuỗi ngày liền đã ăn", when: "Mốc 3 · 7 · 14 · 30 ngày", prio: 3,
    nam: ["{so} ngày liền đủ bữa, phong độ đấy!", "Chuỗi {so} ngày, giữ lửa nha bạn!"], nu: ["{so} ngày liền rồi nè, Pi tự hào lắm!", "Chuỗi {so} ngày luôn, giỏi ghê!"] },
  { key: "full", label: "Ăn đủ bữa hôm nay", when: "Bấm Đã ăn bữa cuối trong ngày", prio: 4,
    nam: ["Đủ bữa rồi, chiến quá bạn ơi!", "Hôm nay ăn chuẩn bài, ngon!"], nu: ["Hôm nay ăn đủ bữa luôn, giỏi ghê!", "Đủ bữa rồi nè, Pi vui lắm!"] },
  { key: "weight", label: "Cân giảm sau 1 tuần đều", when: "Cân tuần thấp hơn tuần trước · cân tăng thì Pi im", prio: 5,
    nam: ["Đều tay cả tuần, kết quả tới rồi đó!"], nu: ["Cả tuần đều đặn, thấy kết quả rồi nè!"] },
  { key: "meal_late", label: "Quá giờ chưa ăn", when: "Quá giờ bữa + 1 tiếng", prio: 6,
    nam: ["Tới giờ ăn rồi! Ăn xong bấm Đã ăn nha."], nu: ["Bạn ăn chưa nè? Ăn xong bấm Đã ăn nha."] },
  { key: "water", label: "Còn thiếu nước", when: "Sau 15:00, còn thiếu ≥ 2 ly", prio: 7,
    nam: ["Còn {so} ly nữa thôi, làm luôn không?"], nu: ["Còn {so} ly nước nữa nha, uống từ từ thôi."] },
  { key: "gym", label: "Ngày tập", when: "Sáng ngày có lịch tập", prio: 8,
    nam: ["Hôm nay ngày tập, quẩy hết mình nha!"], nu: ["Hôm nay đi tập nè, cố lên nha!"] },
  { key: "rest", label: "Ngày nghỉ", when: "Sáng ngày không có lịch tập", prio: 9,
    nam: ["Nghỉ ngơi cũng là tập, sạc pin đi bạn!"], nu: ["Hôm nay nghỉ ngơi cho khỏe nha."] },
  { key: "night", label: "Khuya rồi", when: "Sau 22:30", prio: 10,
    nam: ["Khuya rồi, ngủ lấy sức mai chiến tiếp."], nu: ["Khuya rồi đó, đi ngủ sớm nha bạn."] },
  { key: "poke_sleep", label: "Chạm vào Pi lúc đang ngủ", when: "Khách chạm Pi khi Pi ngủ", prio: 11,
    nam: ["Ơ… Pi ngủ tiếp chút nha…"], nu: ["Ưm… cho Pi ngủ thêm xíu…"] },
];
export const EV = Object.fromEntries(EVENTS.map((e) => [e.key, e]));
export const say = (key, variant, so, i = 0) => {
  const l = EV[key][variant === "nu" ? "nu" : "nam"];
  return l[i % l.length].replace("{so}", so ?? "");
};
