// Thư viện bài tập gym (thuần, không import).
// Mỗi bài: { id, vi, en, muscle, sub, equip, level, pattern, steps, tip }

export const MUSCLES = [["nguc","Ngực"],["lung","Lưng"],["vai","Vai"],["tay_truoc","Tay trước"],["tay_sau","Tay sau"],["chan","Chân"],["mong","Mông"],["bung","Bụng"],["cardio","Cardio"]];
export const EQUIPS = { ta_don:"Tạ đòn", ta_don_tay:"Tạ đơn", may:"Máy", cap:"Máy cáp", xa:"Xà / xà kép", khong:"Không dụng cụ", ghe:"Ghế", kettlebell:"Tạ ấm", day:"Dây kháng lực" };
export const PATTERNS = ["press","fly","row","pulldown","pullup","squat","lunge","hinge","curl","extension","raise","calf","core","cardio"];

const B = "co_ban";
const A = "nang_cao";
const x = (id, vi, en, muscle, sub, equip, level, pattern, steps, tip) =>
  ({ id, vi, en, muscle, sub, equip, level, pattern, steps, tip });

export const EXERCISES = [
  // ===== NGỰC =====
  x("barbell-bench-press", "Đẩy ngực tạ đòn", "Barbell Bench Press", "nguc", ["tay_sau", "vai"], "ta_don", B, "press", [
    "Nằm ngửa trên ghế phẳng, mắt ngay dưới thanh tạ, hai chân đặt vững xuống sàn.",
    "Nắm thanh rộng hơn vai một chút, siết bả vai ra sau và xuống.",
    "Hạ thanh từ từ chạm nhẹ giữa ngực, khuỷu tay chếch khoảng 45 độ so với thân.",
    "Đẩy thanh lên thẳng tay, giữ mông và lưng trên luôn áp ghế.",
  ], "Tập nặng nên có người đỡ tạ; không nảy thanh tạ trên ngực."),
  x("incline-barbell-press", "Đẩy ngực trên tạ đòn", "Incline Barbell Press", "nguc", ["vai", "tay_sau"], "ta_don", B, "press", [
    "Chỉnh ghế dốc khoảng 30–45 độ, nằm sao cho thanh tạ ở ngay trên mắt.",
    "Nắm thanh rộng hơn vai, siết bả vai và ưỡn nhẹ ngực.",
    "Hạ thanh xuống phần ngực trên, gần xương quai xanh.",
    "Đẩy thanh lên thẳng tay theo đường hơi chéo về phía mặt.",
  ], "Ghế dốc quá 45 độ sẽ chuyển sức sang vai nhiều hơn ngực."),
  x("decline-barbell-press", "Đẩy ngực dưới tạ đòn", "Decline Barbell Press", "nguc", ["tay_sau"], "ta_don", A, "press", [
    "Nằm trên ghế dốc xuống, móc chân chắc vào chỗ giữ.",
    "Nắm thanh rộng hơn vai, nhấc thanh ra khỏi giá.",
    "Hạ thanh xuống phần ngực dưới, kiểm soát tốc độ.",
    "Đẩy thanh lên thẳng tay, giữ đầu và vai áp ghế.",
  ], "Luôn có người đỡ tạ vì đầu thấp hơn ngực, khó tự thoát khi kẹt."),
  x("dumbbell-bench-press", "Đẩy ngực tạ đơn", "Dumbbell Bench Press", "nguc", ["tay_sau", "vai"], "ta_don_tay", B, "press", [
    "Ngồi đặt tạ lên đùi, ngả lưng nằm xuống ghế phẳng, đưa tạ lên ngang ngực.",
    "Siết bả vai, lòng bàn tay hướng về phía chân.",
    "Hạ tạ hai bên ngực đến khi khuỷu hơi thấp hơn mặt ghế.",
    "Đẩy tạ lên và hơi khép vào nhau trên ngực, không đập tạ.",
  ], "Tạ đơn cho biên độ sâu hơn tạ đòn; đừng hạ quá sâu gây đau vai."),
  x("incline-dumbbell-press", "Đẩy ngực trên tạ đơn", "Incline Dumbbell Press", "nguc", ["vai", "tay_sau"], "ta_don_tay", B, "press", [
    "Chỉnh ghế dốc 30–45 độ, nằm xuống với hai tạ ngang vai.",
    "Siết bả vai, ngực ưỡn nhẹ, chân đặt vững.",
    "Đẩy tạ lên thẳng tay phía trên ngực trên.",
    "Hạ tạ chậm về hai bên ngực trên rồi lặp lại.",
  ], "Giữ cổ tay thẳng, tạ nằm ngay trên khuỷu tay."),
  x("dumbbell-fly", "Ép ngực tạ đơn", "Dumbbell Fly", "nguc", ["vai"], "ta_don_tay", B, "fly", [
    "Nằm ghế phẳng, cầm tạ duỗi thẳng phía trên ngực, lòng bàn tay đối nhau.",
    "Hơi chùng khuỷu tay và giữ nguyên góc đó suốt bài.",
    "Mở rộng tay sang hai bên thành vòng cung đến khi ngực căng.",
    "Ép tạ về lại phía trên ngực như đang ôm một thân cây.",
  ], "Dùng tạ nhẹ, không mở tay quá thấp vì dễ chấn thương vai."),
  x("incline-dumbbell-fly", "Ép ngực trên tạ đơn", "Incline Dumbbell Fly", "nguc", ["vai"], "ta_don_tay", B, "fly", [
    "Nằm ghế dốc 30 độ, tạ duỗi phía trên ngực, khuỷu hơi chùng.",
    "Mở tay sang hai bên theo vòng cung, cảm nhận ngực trên căng.",
    "Dừng khi tay ngang tầm vai, không hạ sâu hơn.",
    "Ép tạ về giữa, siết ngực một nhịp ở trên.",
  ], "Giữ góc khuỷu cố định, đừng biến bài thành đẩy tạ."),
  x("cable-crossover", "Ép ngực cáp", "Cable Crossover", "nguc", ["vai"], "cap", B, "fly", [
    "Đặt ròng rọc hai bên ở vị trí cao, mỗi tay cầm một tay nắm.",
    "Bước lên một bước, hơi đổ người tới, khuỷu tay chùng nhẹ.",
    "Kéo hai tay theo vòng cung xuống và chéo về trước bụng.",
    "Siết ngực một nhịp rồi mở tay ra chậm về vị trí đầu.",
  ], "Giữ thân cố định, không lấy đà bằng lưng."),
  x("low-to-high-cable-fly", "Ép ngực cáp từ dưới lên", "Low To High Cable Fly", "nguc", ["vai"], "cap", B, "fly", [
    "Đặt ròng rọc hai bên ở vị trí thấp, cầm tay nắm, đứng giữa máy.",
    "Khuỷu tay hơi chùng, lòng bàn tay hướng lên trước.",
    "Kéo tay theo vòng cung lên trước mặt ngang tầm cằm.",
    "Siết ngực trên rồi hạ tay xuống chậm.",
  ], "Bài này nhắm ngực trên; đừng nhún vai khi kéo lên."),
  x("pec-deck-fly", "Ép ngực máy", "Pec Deck Fly", "nguc", ["vai"], "may", B, "fly", [
    "Chỉnh ghế để tay cầm ngang tầm ngực, lưng áp sát đệm.",
    "Cầm tay nắm, khuỷu tay hơi chùng.",
    "Ép hai tay vào giữa trước ngực, siết ngực một nhịp.",
    "Mở tay ra chậm đến khi ngực căng, không để tạ đập.",
  ], "Đừng mở tay ra sau quá xa thân vì dễ kéo căng vai."),
  x("chest-press-machine", "Đẩy ngực máy", "Chest Press Machine", "nguc", ["tay_sau", "vai"], "may", B, "press", [
    "Chỉnh ghế để tay cầm ngang giữa ngực, lưng áp đệm.",
    "Nắm tay cầm, siết bả vai ra sau.",
    "Đẩy tay cầm ra trước đến gần thẳng tay.",
    "Thu về chậm đến khi ngực căng rồi đẩy tiếp.",
  ], "Máy dễ tập cho người mới; không khóa cứng khuỷu ở cuối."),
  x("smith-machine-bench-press", "Đẩy ngực máy Smith", "Smith Machine Bench Press", "nguc", ["tay_sau", "vai"], "may", B, "press", [
    "Đặt ghế phẳng dưới thanh Smith sao cho thanh rơi vào giữa ngực.",
    "Nắm thanh rộng hơn vai, xoay thanh để mở chốt.",
    "Hạ thanh chậm xuống giữa ngực.",
    "Đẩy lên thẳng tay rồi xoay thanh để móc lại khi xong.",
  ], "Chỉnh chốt chặn an toàn ngay trên ngực trước khi tập."),
  x("push-up", "Hít đất", "Push-up", "nguc", ["tay_sau", "vai"], "khong", B, "press", [
    "Chống hai tay rộng hơn vai, người thẳng một đường từ đầu đến gót.",
    "Siết bụng và mông, không để hông võng hay chổng lên.",
    "Hạ người đến khi ngực gần chạm sàn, khuỷu chếch về sau.",
    "Đẩy người lên thẳng tay, giữ thân thẳng.",
  ], "Chưa làm được thì chống gối hoặc chống tay lên ghế cho nhẹ hơn."),
  x("incline-push-up", "Hít đất chống ghế", "Incline Push-up", "nguc", ["tay_sau", "vai"], "ghe", B, "press", [
    "Chống hai tay lên mép ghế chắc chắn, rộng hơn vai.",
    "Lùi chân để người thẳng một đường, siết bụng.",
    "Hạ ngực xuống gần mép ghế.",
    "Đẩy người lên thẳng tay.",
  ], "Chỗ chống càng cao bài càng nhẹ, hợp cho người mới."),
  x("decline-push-up", "Hít đất gác chân", "Decline Push-up", "nguc", ["vai", "tay_sau"], "ghe", A, "press", [
    "Gác hai mũi chân lên ghế, hai tay chống sàn rộng hơn vai.",
    "Giữ người thẳng, siết bụng và mông.",
    "Hạ người đến khi ngực gần chạm sàn.",
    "Đẩy mạnh lên thẳng tay.",
  ], "Bài nặng hơn hít đất thường, tập trung ngực trên và vai."),
  x("chest-dips", "Nhún xà kép ngực", "Chest Dips", "nguc", ["tay_sau", "vai"], "xa", A, "press", [
    "Chống tay lên xà kép, nhấc người lên thẳng tay.",
    "Đổ người về trước khoảng 30 độ, co chân ra sau.",
    "Hạ người đến khi vai ngang khuỷu tay, cảm nhận ngực căng.",
    "Đẩy người lên thẳng tay, giữ thân hơi đổ trước.",
  ], "Vai yếu hoặc đau thì không hạ sâu; có thể dùng máy hỗ trợ."),

  // ===== LƯNG =====
  x("pull-up", "Kéo xà", "Pull-up", "lung", ["tay_truoc"], "xa", A, "pullup", [
    "Nắm xà rộng hơn vai, lòng bàn tay hướng ra trước, treo thẳng tay.",
    "Siết bả vai xuống, siết bụng để người không đung đưa.",
    "Kéo người lên đến khi cằm qua xà, ngực hướng về xà.",
    "Hạ người chậm về thẳng tay rồi lặp lại.",
  ], "Chưa kéo được thì dùng dây kháng lực hoặc máy hỗ trợ."),
  x("chin-up", "Kéo xà tay ngửa", "Chin-up", "lung", ["tay_truoc"], "xa", A, "pullup", [
    "Nắm xà rộng bằng vai, lòng bàn tay hướng về mặt.",
    "Treo thẳng tay, siết bụng và bả vai.",
    "Kéo người lên đến khi cằm qua xà.",
    "Hạ người chậm về thẳng tay.",
  ], "Tay ngửa dùng tay trước nhiều hơn, thường dễ hơn kéo xà thường."),
  x("lat-pulldown", "Kéo xà máy", "Lat Pulldown", "lung", ["tay_truoc"], "cap", B, "pulldown", [
    "Ngồi vào máy, kẹp đùi dưới đệm, nắm thanh rộng hơn vai.",
    "Ngả người ra sau một chút, ưỡn ngực.",
    "Kéo thanh xuống ngực trên, khuỷu tay hướng xuống sàn.",
    "Thả thanh lên chậm đến thẳng tay, cảm nhận lưng giãn.",
  ], "Không kéo thanh ra sau gáy; không giật người ra sau để kéo."),
  x("close-grip-lat-pulldown", "Kéo xà máy tay hẹp", "Close Grip Lat Pulldown", "lung", ["tay_truoc"], "cap", B, "pulldown", [
    "Gắn tay cầm chữ V, ngồi vào máy, kẹp đùi dưới đệm.",
    "Nắm tay cầm, ngả người nhẹ ra sau, ưỡn ngực.",
    "Kéo tay cầm xuống ngực trên, khép khuỷu sát thân.",
    "Thả lên chậm đến khi tay duỗi thẳng.",
  ], "Nghĩ đến việc kéo bằng khuỷu tay, không bằng bàn tay."),
  x("straight-arm-pulldown", "Kéo cáp tay thẳng", "Straight Arm Pulldown", "lung", [], "cap", B, "pulldown", [
    "Đứng trước máy cáp, ròng rọc ở vị trí cao, nắm thanh rộng bằng vai.",
    "Lùi một bước, gập hông nhẹ, tay gần thẳng.",
    "Kéo thanh xuống theo vòng cung đến sát đùi, giữ tay thẳng.",
    "Đưa thanh lên chậm về ngang tầm mắt.",
  ], "Giữ khuỷu gần thẳng suốt bài để lưng xô làm việc chính."),
  x("barbell-row", "Chèo tạ đòn", "Barbell Row", "lung", ["tay_truoc", "vai"], "ta_don", B, "row", [
    "Đứng chân rộng bằng hông, nắm thanh rộng hơn vai.",
    "Gập hông, lưng thẳng, thân gần song song sàn, gối hơi chùng.",
    "Kéo thanh lên chạm bụng trên, siết bả vai lại.",
    "Hạ thanh chậm về thẳng tay, giữ lưng không cong.",
  ], "Lưng cong là dấu hiệu tạ quá nặng; giảm tạ ngay."),
  x("t-bar-row", "Chèo tạ chữ T", "T-Bar Row", "lung", ["tay_truoc", "vai"], "ta_don", B, "row", [
    "Đứng hai bên thanh tạ chữ T, dùng tay cầm chữ V hoặc tay cầm của máy.",
    "Gập hông, lưng thẳng, ngực ưỡn, gối hơi chùng.",
    "Kéo tạ lên sát ngực dưới, siết bả vai.",
    "Hạ tạ chậm về thẳng tay.",
  ], "Không giật thân lên để kéo; giữ góc lưng cố định."),
  x("seated-cable-row", "Kéo cáp ngồi", "Seated Cable Row", "lung", ["tay_truoc"], "cap", B, "row", [
    "Ngồi vào máy, chân đặt lên bệ, gối hơi chùng, nắm tay cầm chữ V.",
    "Ngồi thẳng lưng, ngực ưỡn, tay duỗi thẳng.",
    "Kéo tay cầm về bụng, khuỷu sát thân, siết bả vai.",
    "Duỗi tay ra chậm, để vai hơi đưa ra trước.",
  ], "Không ngả người ra sau quá nhiều để lấy đà."),
  x("one-arm-dumbbell-row", "Chèo tạ đơn một tay", "One Arm Dumbbell Row", "lung", ["tay_truoc"], "ta_don_tay", B, "row", [
    "Chống một tay và một gối lên ghế, tay kia cầm tạ thả thẳng.",
    "Giữ lưng thẳng song song sàn.",
    "Kéo tạ lên về phía hông, khuỷu sát thân.",
    "Hạ tạ chậm về thẳng tay rồi đổi bên.",
  ], "Không xoay thân để kéo; kéo bằng lưng, không bằng tay."),
  x("chest-supported-dumbbell-row", "Chèo tạ đơn nằm ghế dốc", "Chest Supported Dumbbell Row", "lung", ["vai", "tay_truoc"], "ta_don_tay", B, "row", [
    "Chỉnh ghế dốc 30–45 độ, nằm sấp áp ngực vào ghế.",
    "Hai tay cầm tạ thả thẳng xuống sàn.",
    "Kéo tạ lên về phía hông, siết bả vai lại.",
    "Hạ tạ chậm về thẳng tay.",
  ], "Ngực luôn áp ghế, giúp lưng dưới được nghỉ."),
  x("machine-row", "Chèo máy", "Machine Row", "lung", ["tay_truoc"], "may", B, "row", [
    "Chỉnh ghế để tay cầm ngang ngực, ngực áp đệm.",
    "Nắm tay cầm, tay duỗi thẳng.",
    "Kéo tay cầm về phía thân, siết bả vai.",
    "Thả về chậm đến thẳng tay.",
  ], "Giữ ngực áp đệm, không nhún vai khi kéo."),
  x("inverted-row", "Kéo người dưới xà thấp", "Inverted Row", "lung", ["tay_truoc"], "xa", B, "row", [
    "Nằm dưới xà thấp, nắm xà rộng hơn vai, gót chân chạm sàn.",
    "Giữ người thẳng từ vai đến gót, siết bụng.",
    "Kéo ngực lên chạm xà, siết bả vai.",
    "Hạ người chậm về thẳng tay.",
  ], "Co gối cho nhẹ; duỗi chân thẳng cho nặng hơn."),
  x("deadlift", "Kéo tạ đòn", "Deadlift", "lung", ["chan", "mong"], "ta_don", A, "hinge", [
    "Đứng chân rộng bằng hông, thanh tạ ở giữa bàn chân.",
    "Gập hông nắm thanh ngay ngoài gối, lưng thẳng, ngực ưỡn.",
    "Đạp chân xuống sàn, đứng thẳng lên, thanh luôn sát chân.",
    "Đẩy hông ra sau để hạ thanh xuống, giữ lưng thẳng.",
  ], "Tuyệt đối không cong lưng; tạ nặng thì học kỹ thuật với tạ nhẹ trước."),
  x("rack-pull", "Kéo tạ đòn từ giá", "Rack Pull", "lung", ["mong"], "ta_don", A, "hinge", [
    "Đặt thanh tạ trên giá ngang hoặc ngay dưới gối.",
    "Nắm thanh rộng bằng vai, lưng thẳng, ngực ưỡn.",
    "Đẩy hông về trước để đứng thẳng, siết lưng trên.",
    "Hạ thanh về giá có kiểm soát.",
  ], "Biên độ ngắn nên dễ quá tạ; vẫn phải giữ lưng thẳng."),
  x("back-extension", "Ưỡn lưng trên ghế", "Back Extension", "lung", ["mong"], "may", B, "hinge", [
    "Chỉnh đệm ghế ngang hông, móc gót chân dưới đệm giữ.",
    "Khoanh tay trước ngực, người thẳng.",
    "Gập người xuống từ hông, lưng thẳng.",
    "Nâng người lên đến khi thẳng hàng với chân, không ưỡn quá.",
  ], "Không ngửa người ra sau quá thẳng hàng để tránh đau lưng dưới."),
  x("barbell-shrug", "Nhún vai tạ đòn", "Barbell Shrug", "lung", ["vai"], "ta_don", B, "raise", [
    "Đứng thẳng, nắm thanh rộng bằng vai, tay duỗi thẳng.",
    "Nhún hai vai thẳng lên về phía tai.",
    "Giữ một nhịp ở trên, siết cơ cầu vai.",
    "Hạ vai xuống chậm.",
  ], "Không xoay vai tròn; chỉ nhún lên xuống thẳng."),
  x("dumbbell-shrug", "Nhún vai tạ đơn", "Dumbbell Shrug", "lung", ["vai"], "ta_don_tay", B, "raise", [
    "Đứng thẳng, hai tay cầm tạ thả dọc hai bên thân.",
    "Nhún vai thẳng lên về phía tai.",
    "Giữ một nhịp ở trên.",
    "Hạ vai xuống chậm.",
  ], "Giữ tay thẳng, không co khuỷu để kéo tạ."),

  // ===== VAI =====
  x("overhead-press", "Đẩy vai tạ đòn đứng", "Overhead Press", "vai", ["tay_sau"], "ta_don", B, "press", [
    "Đứng chân rộng bằng hông, thanh tạ đặt trên ngực trên, tay rộng hơn vai.",
    "Siết bụng và mông, giữ thân thẳng.",
    "Đẩy thanh thẳng lên qua đầu, đưa đầu ra trước khi thanh qua mặt.",
    "Hạ thanh chậm về ngực trên.",
  ], "Không ưỡn lưng dưới để đẩy; siết bụng suốt bài."),
  x("dumbbell-shoulder-press", "Đẩy vai tạ đơn", "Dumbbell Shoulder Press", "vai", ["tay_sau"], "ta_don_tay", B, "press", [
    "Ngồi ghế dựng thẳng, cầm tạ ngang vai, lòng bàn tay hướng ra trước.",
    "Lưng áp ghế, siết bụng.",
    "Đẩy tạ thẳng lên qua đầu, gần chạm nhau ở trên.",
    "Hạ tạ chậm về ngang tai.",
  ], "Không khóa cứng khuỷu ở trên; giữ cổ tay thẳng."),
  x("arnold-press", "Đẩy vai Arnold", "Arnold Press", "vai", ["tay_sau"], "ta_don_tay", B, "press", [
    "Ngồi ghế dựng thẳng, cầm tạ trước ngực, lòng bàn tay hướng về mặt.",
    "Vừa đẩy tạ lên vừa xoay cổ tay ra ngoài.",
    "Ở trên cao lòng bàn tay hướng ra trước, tay gần thẳng.",
    "Hạ tạ và xoay ngược lại về vị trí đầu.",
  ], "Xoay đều và chậm; dùng tạ nhẹ hơn đẩy vai thường."),
  x("machine-shoulder-press", "Đẩy vai máy", "Machine Shoulder Press", "vai", ["tay_sau"], "may", B, "press", [
    "Chỉnh ghế để tay cầm ngang vai, lưng áp đệm.",
    "Nắm tay cầm, siết bụng.",
    "Đẩy tay cầm lên đến gần thẳng tay.",
    "Hạ chậm về ngang vai.",
  ], "Phù hợp người mới; không để tạ đập khi hạ."),
  x("landmine-press", "Đẩy tạ đòn một đầu", "Landmine Press", "vai", ["nguc", "tay_sau"], "ta_don", B, "press", [
    "Cắm một đầu thanh tạ vào góc hoặc đế, cầm đầu kia ngang vai.",
    "Đứng so le chân, siết bụng.",
    "Đẩy thanh lên và ra trước đến thẳng tay.",
    "Hạ chậm về ngang vai rồi đổi tay.",
  ], "Đường đẩy chéo nên dễ chịu cho vai hơn đẩy thẳng qua đầu."),
  x("lateral-raise", "Dang tạ đơn", "Lateral Raise", "vai", [], "ta_don_tay", B, "raise", [
    "Đứng thẳng, hai tay cầm tạ dọc thân, khuỷu hơi chùng.",
    "Nâng tạ sang hai bên đến ngang vai.",
    "Dẫn bằng khuỷu tay, không nhún vai.",
    "Hạ tạ chậm về hai bên thân.",
  ], "Dùng tạ nhẹ, không vung người lấy đà."),
  x("cable-lateral-raise", "Dang cáp một tay", "Cable Lateral Raise", "vai", [], "cap", B, "raise", [
    "Đặt ròng rọc ở vị trí thấp, đứng nghiêng, tay xa máy cầm tay nắm.",
    "Khuỷu hơi chùng, tay ở trước đùi.",
    "Nâng tay sang ngang đến tầm vai.",
    "Hạ chậm rồi đổi bên.",
  ], "Cáp giữ lực đều cả biên độ; không nghiêng người lấy đà."),
  x("front-raise", "Nâng tạ trước mặt", "Front Raise", "vai", [], "ta_don_tay", B, "raise", [
    "Đứng thẳng, cầm tạ trước đùi, lòng bàn tay hướng xuống.",
    "Giữ tay gần thẳng, siết bụng.",
    "Nâng tạ ra trước đến ngang vai.",
    "Hạ tạ chậm về trước đùi.",
  ], "Không ngả người ra sau; vai trước thường đã được tập qua bài đẩy."),
  x("rear-delt-fly", "Dang tạ vai sau", "Rear Delt Fly", "vai", ["lung"], "ta_don_tay", B, "fly", [
    "Gập người từ hông, lưng thẳng, hai tay cầm tạ thả dưới ngực.",
    "Khuỷu hơi chùng, lòng bàn tay đối nhau.",
    "Dang tạ sang hai bên đến ngang vai.",
    "Hạ chậm về vị trí đầu.",
  ], "Dùng tạ nhẹ, tránh siết bả vai quá để vai sau làm chính."),
  x("reverse-pec-deck", "Ép vai sau máy", "Reverse Pec Deck", "vai", ["lung"], "may", B, "fly", [
    "Ngồi quay mặt vào máy ép ngực, ngực áp đệm.",
    "Nắm tay cầm ngang vai, tay gần thẳng.",
    "Mở tay ra sau đến ngang thân.",
    "Đưa tay về chậm.",
  ], "Không nhún vai, giữ cổ thả lỏng."),
  x("face-pull", "Kéo cáp về mặt", "Face Pull", "vai", ["lung"], "cap", B, "row", [
    "Gắn dây thừng ở ròng rọc cao ngang mặt, nắm hai đầu dây.",
    "Lùi lại để tay duỗi thẳng, đứng vững.",
    "Kéo dây về phía mặt, tách hai tay ra hai bên tai.",
    "Giữ một nhịp, siết vai sau rồi duỗi tay về chậm.",
  ], "Bài tốt cho vai khỏe và dáng thẳng; dùng tạ vừa phải."),
  x("upright-row", "Kéo tạ dọc thân", "Upright Row", "vai", ["lung"], "ta_don", B, "row", [
    "Đứng thẳng, nắm thanh rộng hơn vai một chút, tạ trước đùi.",
    "Kéo thanh lên sát thân, dẫn bằng khuỷu tay.",
    "Dừng khi khuỷu ngang vai, thanh ngang ngực.",
    "Hạ thanh chậm xuống.",
  ], "Nắm rộng và không kéo cao quá vai để tránh chèn ép vai."),
  x("pike-push-up", "Hít đất chổng mông", "Pike Push-up", "vai", ["tay_sau"], "khong", A, "press", [
    "Chống tay xuống sàn rộng bằng vai, đẩy hông lên cao thành hình chữ V.",
    "Giữ chân thẳng, đầu nằm giữa hai tay.",
    "Co khuỷu hạ đỉnh đầu xuống gần sàn.",
    "Đẩy người lên về vị trí chữ V.",
  ], "Bài thay đẩy vai khi không có tạ; tập từ từ để cổ tay quen."),

  // ===== TAY TRƯỚC =====
  x("barbell-curl", "Cuốn tạ đòn", "Barbell Curl", "tay_truoc", [], "ta_don", B, "curl", [
    "Đứng thẳng, nắm thanh rộng bằng vai, lòng bàn tay ngửa.",
    "Khép khuỷu sát hông.",
    "Cuốn thanh lên ngang ngực, siết tay trước.",
    "Hạ thanh chậm về thẳng tay.",
  ], "Không đung đưa người lấy đà; khuỷu đứng yên."),
  x("ez-bar-curl", "Cuốn tạ đòn cong", "EZ Bar Curl", "tay_truoc", [], "ta_don", B, "curl", [
    "Đứng thẳng, nắm thanh cong ở chỗ gấp, lòng bàn tay ngửa.",
    "Khép khuỷu sát hông.",
    "Cuốn thanh lên ngang ngực.",
    "Hạ chậm về thẳng tay.",
  ], "Thanh cong giúp cổ tay dễ chịu hơn thanh thẳng."),
  x("dumbbell-curl", "Cuốn tạ đơn", "Dumbbell Curl", "tay_truoc", [], "ta_don_tay", B, "curl", [
    "Đứng thẳng, hai tay cầm tạ dọc thân, lòng bàn tay hướng ra trước.",
    "Khép khuỷu sát hông.",
    "Cuốn tạ lên ngang vai, siết tay trước.",
    "Hạ chậm về thẳng tay.",
  ], "Có thể cuốn từng tay luân phiên để tập trung hơn."),
  x("hammer-curl", "Cuốn búa", "Hammer Curl", "tay_truoc", [], "ta_don_tay", B, "curl", [
    "Đứng thẳng, cầm tạ dọc thân, lòng bàn tay đối nhau.",
    "Khép khuỷu sát hông.",
    "Cuốn tạ lên ngang vai, giữ cổ tay thẳng như cầm búa.",
    "Hạ chậm về thẳng tay.",
  ], "Bài này tập cả cẳng tay, giúp bắp tay trông dày hơn."),
  x("preacher-curl", "Cuốn tạ ghế dốc", "Preacher Curl", "tay_truoc", [], "ghe", B, "curl", [
    "Ngồi ghế cuốn tay, đặt mặt sau cánh tay áp lên đệm dốc.",
    "Cầm thanh cong hoặc tạ đơn, lòng bàn tay ngửa.",
    "Cuốn tạ lên đến khi tay trước siết hết.",
    "Hạ chậm đến gần thẳng tay.",
  ], "Không duỗi khóa thẳng tay ở dưới, dễ đau khuỷu."),
  x("incline-dumbbell-curl", "Cuốn tạ đơn ghế dốc", "Incline Dumbbell Curl", "tay_truoc", [], "ta_don_tay", B, "curl", [
    "Ngồi ghế dốc 45–60 độ, hai tay cầm tạ thả thẳng xuống.",
    "Giữ cánh tay vuông góc sàn, vai áp ghế.",
    "Cuốn tạ lên, không đưa khuỷu ra trước.",
    "Hạ chậm về thẳng tay.",
  ], "Tay trước được kéo giãn nhiều hơn; dùng tạ nhẹ hơn cuốn đứng."),
  x("concentration-curl", "Cuốn tạ tập trung", "Concentration Curl", "tay_truoc", [], "ta_don_tay", B, "curl", [
    "Ngồi ghế, chân dang rộng, tì mặt sau cánh tay vào đùi trong.",
    "Cầm tạ thả thẳng, lòng bàn tay ngửa.",
    "Cuốn tạ lên về phía vai, siết tay trước.",
    "Hạ chậm rồi đổi tay.",
  ], "Giữ cánh tay tì cố định, chỉ cẳng tay di chuyển."),
  x("cable-curl", "Cuốn cáp", "Cable Curl", "tay_truoc", [], "cap", B, "curl", [
    "Gắn thanh ngắn ở ròng rọc thấp, nắm thanh lòng bàn tay ngửa.",
    "Đứng thẳng, khép khuỷu sát hông.",
    "Cuốn thanh lên ngang ngực.",
    "Hạ chậm về thẳng tay.",
  ], "Cáp giữ lực đều; đừng ngả người ra sau."),
  x("reverse-curl", "Cuốn tạ úp tay", "Reverse Curl", "tay_truoc", [], "ta_don", B, "curl", [
    "Đứng thẳng, nắm thanh rộng bằng vai, lòng bàn tay úp.",
    "Khép khuỷu sát hông.",
    "Cuốn thanh lên ngang ngực, giữ cổ tay thẳng.",
    "Hạ chậm về thẳng tay.",
  ], "Dùng tạ nhẹ hơn cuốn thường; bài này tập nhiều cẳng tay."),
  x("band-curl", "Cuốn dây kháng lực", "Resistance Band Curl", "tay_truoc", [], "day", B, "curl", [
    "Dẫm lên giữa dây, hai tay nắm hai đầu, lòng bàn tay ngửa.",
    "Khép khuỷu sát hông.",
    "Cuốn tay lên ngang vai.",
    "Hạ chậm, giữ dây luôn căng.",
  ], "Kiểm tra dây không nứt trước khi tập."),

  // ===== TAY SAU =====
  x("triceps-pushdown", "Đẩy cáp tay sau", "Triceps Pushdown", "tay_sau", [], "cap", B, "extension", [
    "Gắn thanh ngắn ở ròng rọc cao, nắm thanh lòng bàn tay úp.",
    "Đứng thẳng, khép khuỷu sát hông.",
    "Đẩy thanh xuống đến thẳng tay, siết tay sau.",
    "Cho thanh lên chậm đến khi cẳng tay ngang sàn.",
  ], "Khuỷu đứng yên, không đổ người lên thanh."),
  x("rope-pushdown", "Đẩy cáp dây thừng", "Rope Pushdown", "tay_sau", [], "cap", B, "extension", [
    "Gắn dây thừng ở ròng rọc cao, nắm hai đầu dây.",
    "Khép khuỷu sát hông, đứng thẳng.",
    "Đẩy dây xuống và tách hai đầu ra ở dưới.",
    "Cho dây lên chậm.",
  ], "Tách dây ở cuối giúp tay sau siết mạnh hơn."),
  x("overhead-triceps-extension", "Duỗi tay sau qua đầu", "Overhead Triceps Extension", "tay_sau", [], "ta_don_tay", B, "extension", [
    "Ngồi hoặc đứng, hai tay ôm một tạ đơn đưa thẳng qua đầu.",
    "Giữ cánh tay sát tai, siết bụng.",
    "Hạ tạ ra sau gáy bằng cách gập khuỷu.",
    "Duỗi thẳng tay đẩy tạ lên.",
  ], "Không xòe khuỷu ra hai bên; không ưỡn lưng."),
  x("cable-overhead-triceps-extension", "Duỗi tay sau qua đầu bằng cáp", "Cable Overhead Triceps Extension", "tay_sau", [], "cap", B, "extension", [
    "Gắn dây thừng ở ròng rọc thấp, quay lưng vào máy, giữ dây sau gáy.",
    "Bước lên một bước, đổ người nhẹ, khuỷu hướng ra trước.",
    "Duỗi tay ra trước và lên đến thẳng.",
    "Gập khuỷu cho dây về chậm sau gáy.",
  ], "Giữ cánh tay cố định, chỉ cẳng tay di chuyển."),
  x("skull-crusher", "Đẩy tạ nằm tay sau", "Skull Crusher", "tay_sau", [], "ta_don", B, "extension", [
    "Nằm ghế phẳng, cầm thanh cong duỗi thẳng tay phía trên ngực.",
    "Nghiêng tay nhẹ về phía đầu.",
    "Gập khuỷu hạ thanh về gần trán.",
    "Duỗi tay đẩy thanh lên lại.",
  ], "Hạ chậm, có kiểm soát; dùng tạ vừa sức vì thanh ở gần mặt."),
  x("close-grip-bench-press", "Đẩy ngực tay hẹp", "Close Grip Bench Press", "tay_sau", ["nguc", "vai"], "ta_don", B, "press", [
    "Nằm ghế phẳng, nắm thanh rộng bằng vai.",
    "Siết bả vai, chân đặt vững.",
    "Hạ thanh xuống ngực dưới, khép khuỷu sát thân.",
    "Đẩy thanh lên thẳng tay.",
  ], "Không nắm quá hẹp, dễ đau cổ tay."),
  x("bench-dips", "Chống ghế tay sau", "Bench Dips", "tay_sau", ["nguc", "vai"], "ghe", B, "press", [
    "Ngồi mép ghế, chống hai tay sát hông, đưa mông ra khỏi ghế.",
    "Duỗi chân ra trước, gót chạm sàn.",
    "Gập khuỷu hạ người đến khi cánh tay gần ngang sàn.",
    "Đẩy người lên thẳng tay.",
  ], "Giữ lưng sát mép ghế; đau vai thì không hạ sâu."),
  x("dumbbell-kickback", "Đá tạ tay sau", "Dumbbell Kickback", "tay_sau", [], "ta_don_tay", B, "extension", [
    "Chống một tay và gối lên ghế, tay kia cầm tạ.",
    "Đưa cánh tay sát thân, song song sàn.",
    "Duỗi thẳng cẳng tay ra sau, siết tay sau.",
    "Gập khuỷu về chậm rồi đổi bên.",
  ], "Cánh tay đứng yên, không vung tạ."),
  x("diamond-push-up", "Hít đất kim cương", "Diamond Push-up", "tay_sau", ["nguc"], "khong", A, "press", [
    "Chống tay gần nhau dưới ngực, ngón cái và trỏ chạm thành hình thoi.",
    "Người thẳng từ đầu đến gót, siết bụng.",
    "Hạ ngực xuống gần tay, khuỷu sát thân.",
    "Đẩy người lên thẳng tay.",
  ], "Chống gối nếu chưa làm được đúng kỹ thuật."),
  x("triceps-dips", "Nhún xà kép tay sau", "Triceps Dips", "tay_sau", ["nguc", "vai"], "xa", A, "press", [
    "Chống tay lên xà kép, nhấc người lên thẳng tay.",
    "Giữ thân thẳng đứng, khuỷu khép sát.",
    "Hạ người đến khi khuỷu vuông góc.",
    "Đẩy người lên thẳng tay.",
  ], "Thân càng đứng thẳng thì tay sau càng làm nhiều."),

  // ===== CHÂN =====
  x("barbell-back-squat", "Gánh tạ", "Barbell Back Squat", "chan", ["mong"], "ta_don", B, "squat", [
    "Đặt thanh tạ trên lưng trên, đứng chân rộng bằng vai, mũi chân hơi mở.",
    "Hít sâu, siết bụng, ngực ưỡn.",
    "Ngồi xuống bằng cách đẩy hông ra sau, gối theo hướng mũi chân.",
    "Xuống đến đùi ngang sàn rồi đạp chân đứng lên.",
  ], "Đặt thanh chặn an toàn trên giá; không để gối chụm vào trong."),
  x("front-squat", "Gánh tạ trước", "Front Squat", "chan", ["mong", "bung"], "ta_don", A, "squat", [
    "Đặt thanh tạ trên vai trước, khuỷu nâng cao ngang vai.",
    "Đứng chân rộng bằng vai, thân thẳng.",
    "Ngồi xuống sâu, giữ khuỷu cao và thân đứng.",
    "Đạp chân đứng lên.",
  ], "Khuỷu tụt xuống thì thanh dễ trượt; cần cổ tay và vai dẻo."),
  x("goblet-squat", "Gánh tạ đơn trước ngực", "Goblet Squat", "chan", ["mong"], "ta_don_tay", B, "squat", [
    "Ôm một tạ đơn dựng đứng trước ngực.",
    "Đứng chân rộng hơn vai một chút, mũi chân hơi mở.",
    "Ngồi xuống sâu, khuỷu nằm giữa hai gối.",
    "Đạp chân đứng lên, giữ ngực thẳng.",
  ], "Bài tốt để học squat đúng trước khi gánh tạ đòn."),
  x("bodyweight-squat", "Squat không tạ", "Bodyweight Squat", "chan", ["mong"], "khong", B, "squat", [
    "Đứng chân rộng bằng vai, tay duỗi trước ngực.",
    "Đẩy hông ra sau, ngồi xuống như ngồi ghế.",
    "Xuống đến đùi ngang sàn, gót chân không nhấc.",
    "Đạp chân đứng lên.",
  ], "Gối đi theo hướng mũi chân, không chụm vào."),
  x("jump-squat", "Bật nhảy squat", "Jump Squat", "chan", ["mong", "cardio"], "khong", B, "squat", [
    "Đứng chân rộng bằng vai.",
    "Ngồi xuống nửa chừng.",
    "Bật mạnh lên cao, duỗi thẳng người.",
    "Tiếp đất nhẹ bằng mũi chân rồi ngồi xuống ngay.",
  ], "Tiếp đất nhẹ, gối hơi chùng để bảo vệ khớp gối."),
  x("leg-press", "Đạp đùi máy", "Leg Press", "chan", ["mong"], "may", B, "squat", [
    "Ngồi vào máy, lưng áp đệm, chân đặt lên bàn đạp rộng bằng vai.",
    "Mở khóa an toàn.",
    "Hạ bàn đạp đến khi gối gần vuông góc.",
    "Đạp lên đến gần thẳng chân, không khóa cứng gối.",
  ], "Không hạ sâu đến mức mông nhấc khỏi đệm."),
  x("hack-squat", "Squat máy hack", "Hack Squat", "chan", ["mong"], "may", B, "squat", [
    "Đứng vào máy, vai áp đệm, chân đặt rộng bằng vai trên bàn đạp.",
    "Mở khóa an toàn.",
    "Ngồi xuống đến khi đùi gần ngang bàn đạp.",
    "Đạp chân đứng lên, không khóa gối.",
  ], "Lưng luôn áp đệm; chân đặt cao hơn sẽ dùng mông nhiều hơn."),
  x("walking-lunge", "Chùng chân bước đi", "Walking Lunge", "chan", ["mong"], "ta_don_tay", B, "lunge", [
    "Đứng thẳng, hai tay cầm tạ dọc thân.",
    "Bước dài một chân ra trước, hạ người đến khi hai gối gần vuông góc.",
    "Đạp chân trước đứng lên và bước chân sau lên trước.",
    "Tiếp tục luân phiên hai chân.",
  ], "Gối sau gần chạm sàn, gối trước không đổ vào trong."),
  x("reverse-lunge", "Chùng chân lùi", "Reverse Lunge", "chan", ["mong"], "ta_don_tay", B, "lunge", [
    "Đứng thẳng, hai tay cầm tạ.",
    "Bước một chân ra sau, hạ người đến khi hai gối gần vuông góc.",
    "Đạp chân trước để về vị trí đứng.",
    "Đổi chân.",
  ], "Chùng lùi nhẹ cho gối hơn chùng tới."),
  x("bulgarian-split-squat", "Chùng chân gác ghế", "Bulgarian Split Squat", "chan", ["mong"], "ta_don_tay", B, "lunge", [
    "Đứng trước ghế, gác mu bàn chân sau lên ghế.",
    "Chân trước đặt cách ghế khoảng một bước dài, tay cầm tạ.",
    "Hạ người thẳng xuống đến khi đùi trước gần ngang sàn.",
    "Đạp chân trước đứng lên, xong một bên thì đổi chân.",
  ], "Đổ thân nhẹ về trước để mông làm nhiều hơn; giữ thăng bằng trước khi thêm tạ."),
  x("step-up", "Bước lên bục", "Step-up", "chan", ["mong"], "ta_don_tay", B, "lunge", [
    "Đứng trước bục hoặc ghế chắc, tay cầm tạ.",
    "Đặt cả bàn chân lên bục.",
    "Đạp chân trên để đứng hẳn lên bục.",
    "Bước xuống có kiểm soát rồi đổi chân.",
  ], "Đạp bằng chân trên, không lấy đà bằng chân dưới."),
  x("leg-extension", "Đá đùi máy", "Leg Extension", "chan", [], "may", B, "extension", [
    "Ngồi vào máy, đệm chân đặt ở cổ chân, gối thẳng trục máy.",
    "Nắm tay cầm hai bên ghế.",
    "Duỗi chân thẳng lên, siết đùi trước.",
    "Hạ chậm về vị trí đầu.",
  ], "Không đá giật; đau gối thì giảm tạ."),
  x("lying-leg-curl", "Móc đùi nằm", "Lying Leg Curl", "chan", [], "may", B, "curl", [
    "Nằm sấp trên máy, đệm chân đặt trên gót.",
    "Nắm tay cầm, hông áp đệm.",
    "Co chân kéo gót về phía mông.",
    "Hạ chậm về gần thẳng chân.",
  ], "Hông không nhấc lên khỏi đệm khi co chân."),
  x("seated-leg-curl", "Móc đùi ngồi", "Seated Leg Curl", "chan", [], "may", B, "curl", [
    "Ngồi vào máy, đệm chân đặt sau cổ chân, hạ đệm đùi giữ chặt.",
    "Lưng áp ghế, nắm tay cầm.",
    "Co chân kéo đệm xuống dưới ghế.",
    "Thả chậm về thẳng chân.",
  ], "Chỉnh trục máy thẳng với khớp gối."),
  x("romanian-deadlift", "Kéo tạ chân thẳng", "Romanian Deadlift", "chan", ["mong", "lung"], "ta_don", B, "hinge", [
    "Đứng thẳng cầm thanh trước đùi, gối hơi chùng.",
    "Đẩy hông ra sau, hạ thanh dọc đùi, lưng thẳng.",
    "Hạ đến khi đùi sau căng, thường ngang giữa ống chân.",
    "Đẩy hông về trước để đứng thẳng lại.",
  ], "Thanh luôn sát chân; lưng cong là hạ quá sâu."),
  x("sumo-deadlift", "Kéo tạ đòn chân rộng", "Sumo Deadlift", "chan", ["mong", "lung"], "ta_don", A, "hinge", [
    "Đứng chân rất rộng, mũi chân mở ra, thanh ở giữa bàn chân.",
    "Ngồi xuống nắm thanh giữa hai chân, lưng thẳng, ngực ưỡn.",
    "Đẩy gối ra ngoài, đạp chân xuống sàn để đứng thẳng.",
    "Hạ thanh xuống có kiểm soát, giữ lưng thẳng.",
  ], "Gối luôn theo hướng mũi chân; không cong lưng."),
  x("standing-calf-raise", "Nhón bắp chân đứng", "Standing Calf Raise", "chan", [], "may", B, "calf", [
    "Đứng trên mép bục của máy, vai đặt dưới đệm.",
    "Hạ gót xuống thấp hơn mép bục để bắp chân giãn.",
    "Nhón lên cao hết mức, siết bắp chân một nhịp.",
    "Hạ chậm xuống.",
  ], "Tập chậm, đủ biên độ; không nảy người."),
  x("seated-calf-raise", "Nhón bắp chân ngồi", "Seated Calf Raise", "chan", [], "may", B, "calf", [
    "Ngồi vào máy, đệm đặt trên đùi gần gối, mũi chân trên bục.",
    "Hạ gót xuống hết mức.",
    "Nhón gót lên cao, siết bắp chân.",
    "Hạ chậm xuống.",
  ], "Bài ngồi nhắm phần cơ bắp chân sâu bên dưới."),

  // ===== MÔNG =====
  x("hip-thrust", "Đẩy hông tạ đòn", "Hip Thrust", "mong", ["chan"], "ta_don", B, "hinge", [
    "Ngồi sàn, lưng trên tựa mép ghế, thanh tạ đặt ngang hông có đệm lót.",
    "Co gối, bàn chân đặt rộng bằng hông.",
    "Đẩy hông lên đến khi thân và đùi thẳng hàng, siết mông.",
    "Hạ hông xuống chậm.",
  ], "Cằm hơi cúi, không ưỡn lưng dưới ở trên cùng."),
  x("glute-bridge", "Nâng hông", "Glute Bridge", "mong", ["chan"], "khong", B, "hinge", [
    "Nằm ngửa, co gối, bàn chân đặt sát mông.",
    "Hai tay để dọc thân.",
    "Đẩy hông lên đến khi thân thẳng từ vai đến gối, siết mông.",
    "Hạ hông xuống chậm.",
  ], "Đạp bằng gót chân để mông làm việc nhiều hơn."),
  x("single-leg-glute-bridge", "Nâng hông một chân", "Single Leg Glute Bridge", "mong", ["chan"], "khong", B, "hinge", [
    "Nằm ngửa, co một gối, chân kia duỗi thẳng lên.",
    "Hai tay để dọc thân.",
    "Đạp gót chân đang chống để nâng hông lên.",
    "Hạ chậm rồi đổi chân.",
  ], "Giữ hông ngang bằng, không nghiêng sang một bên."),
  x("cable-kickback", "Đá chân cáp", "Cable Kickback", "mong", [], "cap", B, "extension", [
    "Gắn đai cổ chân ở ròng rọc thấp, đứng đối diện máy, tay vịn.",
    "Đổ người nhẹ, chân đeo đai hơi chùng gối.",
    "Đá chân ra sau, siết mông ở cuối.",
    "Đưa chân về chậm rồi đổi bên.",
  ], "Không ưỡn lưng để đá cao hơn."),
  x("hip-abduction-machine", "Dạng hông máy", "Hip Abduction Machine", "mong", [], "may", B, "raise", [
    "Ngồi vào máy, đệm đặt mặt ngoài gối.",
    "Lưng áp ghế, nắm tay cầm.",
    "Đẩy hai chân mở ra hết mức.",
    "Khép chân về chậm.",
  ], "Đổ người nhẹ về trước sẽ dùng mông nhiều hơn."),
  x("donkey-kick", "Đá chân sau", "Donkey Kick", "mong", [], "khong", B, "extension", [
    "Quỳ bốn điểm, tay dưới vai, gối dưới hông.",
    "Giữ gối co vuông góc.",
    "Đạp một chân lên trần, siết mông.",
    "Hạ chân về rồi đổi bên.",
  ], "Siết bụng để lưng không võng."),
  x("fire-hydrant", "Mở hông quỳ", "Fire Hydrant", "mong", [], "khong", B, "raise", [
    "Quỳ bốn điểm, tay dưới vai, gối dưới hông.",
    "Giữ gối co, nâng một chân sang ngang.",
    "Nâng đến khi đùi gần ngang sàn.",
    "Hạ chậm rồi đổi bên.",
  ], "Không nghiêng thân theo chân."),
  x("banded-lateral-walk", "Bước ngang dây", "Banded Lateral Walk", "mong", [], "day", B, "lunge", [
    "Đeo dây vòng ngay trên gối hoặc cổ chân.",
    "Đứng chân rộng bằng hông, khuỵu gối nhẹ.",
    "Bước ngang một chân, chân kia theo sau, giữ dây căng.",
    "Đi đủ số bước rồi đổi hướng.",
  ], "Giữ hông thấp và thân đứng yên, không lắc người."),
  x("kettlebell-swing", "Vung tạ ấm", "Kettlebell Swing", "mong", ["chan", "lung"], "kettlebell", B, "hinge", [
    "Đứng chân rộng hơn vai, hai tay cầm tạ ấm.",
    "Gập hông đưa tạ ra sau giữa hai chân, lưng thẳng.",
    "Đẩy hông mạnh về trước để vung tạ lên ngang ngực.",
    "Để tạ rơi về giữa chân và lặp lại.",
  ], "Lực từ hông, không phải tay; không cong lưng."),
  x("cable-pull-through", "Kéo cáp giữa chân", "Cable Pull Through", "mong", ["chan"], "cap", B, "hinge", [
    "Gắn dây thừng ở ròng rọc thấp, quay lưng vào máy, cầm dây giữa chân.",
    "Bước ra xa, chân rộng hơn vai.",
    "Gập hông cho dây kéo tay ra sau, lưng thẳng.",
    "Đẩy hông về trước để đứng thẳng, siết mông.",
  ], "Bài học động tác gập hông tốt trước khi kéo tạ đòn."),
  x("good-morning", "Gập người gánh tạ", "Good Morning", "mong", ["chan", "lung"], "ta_don", A, "hinge", [
    "Đặt thanh tạ trên lưng trên như gánh tạ, gối hơi chùng.",
    "Đẩy hông ra sau, gập người về trước, lưng thẳng.",
    "Gập đến khi thân gần ngang sàn hoặc đùi sau căng.",
    "Đẩy hông về trước để đứng thẳng.",
  ], "Bắt đầu với thanh không, tạ rất nhẹ; tuyệt đối giữ lưng thẳng."),

  // ===== BỤNG =====
  x("plank", "Plank", "Plank", "bung", [], "khong", B, "core", [
    "Chống hai cẳng tay xuống sàn, khuỷu dưới vai.",
    "Duỗi chân, người thẳng một đường từ đầu đến gót.",
    "Siết bụng và mông, thở đều.",
    "Giữ tư thế trong thời gian đã định.",
  ], "Không để hông võng hay chổng cao."),
  x("side-plank", "Plank nghiêng", "Side Plank", "bung", [], "khong", B, "core", [
    "Nằm nghiêng, chống một cẳng tay, khuỷu dưới vai.",
    "Chồng hai chân lên nhau.",
    "Nâng hông lên để người thẳng một đường.",
    "Giữ đủ thời gian rồi đổi bên.",
  ], "Chống gối dưới nếu thấy quá khó."),
  x("crunch", "Gập bụng", "Crunch", "bung", [], "khong", B, "core", [
    "Nằm ngửa, co gối, bàn chân đặt sàn.",
    "Đặt tay nhẹ sau tai hoặc khoanh trước ngực.",
    "Cuộn vai lên khỏi sàn, siết bụng.",
    "Hạ chậm xuống.",
  ], "Không kéo cổ bằng tay; cằm cách ngực một nắm tay."),
  x("sit-up", "Gập bụng ngồi dậy", "Sit-up", "bung", [], "khong", B, "core", [
    "Nằm ngửa, co gối, móc chân hoặc nhờ người giữ.",
    "Khoanh tay trước ngực.",
    "Cuộn người ngồi dậy đến khi ngực gần gối.",
    "Hạ lưng xuống chậm.",
  ], "Đau lưng dưới thì đổi sang gập bụng thường."),
  x("bicycle-crunch", "Gập bụng đạp xe", "Bicycle Crunch", "bung", [], "khong", B, "core", [
    "Nằm ngửa, tay sau tai, nhấc vai và chân khỏi sàn.",
    "Co một gối về ngực, chân kia duỗi.",
    "Xoay thân đưa khuỷu đối diện về phía gối đang co.",
    "Đổi bên liên tục như đạp xe.",
  ], "Làm chậm, xoay bằng thân chứ không phải bằng khuỷu."),
  x("reverse-crunch", "Gập bụng ngược", "Reverse Crunch", "bung", [], "khong", B, "core", [
    "Nằm ngửa, tay dọc thân, co gối nhấc chân lên.",
    "Siết bụng.",
    "Cuộn hông lên khỏi sàn, kéo gối về ngực.",
    "Hạ hông xuống chậm.",
  ], "Không vung chân lấy đà."),
  x("lying-leg-raise", "Nâng chân nằm", "Lying Leg Raise", "bung", [], "khong", B, "core", [
    "Nằm ngửa, tay dọc thân hoặc dưới mông.",
    "Duỗi thẳng chân, ép lưng dưới xuống sàn.",
    "Nâng chân lên đến khi vuông góc với sàn.",
    "Hạ chân chậm, dừng trước khi chạm sàn.",
  ], "Lưng dưới nhấc khỏi sàn thì co gối cho nhẹ hơn."),
  x("hanging-leg-raise", "Treo xà nâng chân", "Hanging Leg Raise", "bung", [], "xa", A, "core", [
    "Treo người trên xà, tay rộng bằng vai.",
    "Siết bụng, giữ người không đung đưa.",
    "Nâng chân lên ngang hông hoặc cao hơn.",
    "Hạ chân chậm.",
  ], "Chưa nâng thẳng chân được thì co gối trước."),
  x("russian-twist", "Xoay người kiểu Nga", "Russian Twist", "bung", [], "khong", B, "core", [
    "Ngồi sàn, co gối, ngả lưng ra sau khoảng 45 độ.",
    "Chắp tay hoặc ôm tạ nhẹ trước ngực.",
    "Xoay thân sang một bên rồi sang bên kia.",
    "Giữ lưng thẳng suốt bài.",
  ], "Nhấc chân khỏi sàn cho khó hơn; không cong lưng."),
  x("cable-crunch", "Gập bụng cáp", "Cable Crunch", "bung", [], "cap", B, "core", [
    "Gắn dây thừng ở ròng rọc cao, quỳ trước máy, giữ dây cạnh đầu.",
    "Hông giữ cố định.",
    "Cuộn người xuống, đưa khuỷu về phía gối, siết bụng.",
    "Duỗi người lên chậm.",
  ], "Gập bằng bụng, không ngồi mông xuống để kéo."),
  x("dead-bug", "Bọ chết", "Dead Bug", "bung", [], "khong", B, "core", [
    "Nằm ngửa, tay duỗi lên trần, gối co vuông góc.",
    "Ép lưng dưới xuống sàn.",
    "Duỗi đồng thời tay và chân đối diện xuống gần sàn.",
    "Đưa về rồi đổi bên.",
  ], "Lưng dưới luôn áp sàn; làm chậm."),
  x("hollow-hold", "Giữ người hình thuyền", "Hollow Hold", "bung", [], "khong", A, "core", [
    "Nằm ngửa, tay duỗi qua đầu, chân duỗi thẳng.",
    "Ép lưng dưới xuống sàn.",
    "Nhấc vai và chân khỏi sàn, người cong như chiếc thuyền.",
    "Giữ đủ thời gian, thở đều.",
  ], "Lưng dưới bật lên thì co gối hoặc đưa tay về trước."),
  x("mountain-climber", "Leo núi", "Mountain Climber", "bung", ["cardio", "vai"], "khong", B, "cardio", [
    "Vào tư thế hít đất, tay dưới vai.",
    "Kéo một gối về phía ngực.",
    "Đổi chân nhanh liên tục như đang chạy.",
    "Giữ hông thấp, vai ở trên tay.",
  ], "Giữ hông không nhô cao; tăng tốc dần."),

  // ===== CARDIO =====
  x("treadmill-walk", "Đi bộ máy chạy", "Treadmill Walk", "cardio", ["chan"], "may", B, "cardio", [
    "Đứng hai bên mép băng, bật máy ở tốc độ chậm.",
    "Bước lên băng, đi thẳng người.",
    "Tăng dần lên tốc độ đi nhanh nhưng vẫn nói được.",
    "Giảm tốc dần trước khi dừng.",
  ], "Kẹp dây an toàn vào áo; hạn chế bám tay vịn."),
  x("incline-treadmill-walk", "Đi bộ dốc máy chạy", "Incline Treadmill Walk", "cardio", ["chan", "mong"], "may", B, "cardio", [
    "Bật máy ở tốc độ đi bộ, độ dốc thấp.",
    "Tăng dần độ dốc lên 8–12%.",
    "Đi đều, thân thẳng, không bám tay vịn.",
    "Hạ dốc và tốc độ dần trước khi dừng.",
  ], "Đốt năng lượng tốt mà nhẹ cho khớp hơn chạy."),
  x("treadmill-run", "Chạy máy", "Treadmill Run", "cardio", ["chan"], "may", B, "cardio", [
    "Khởi động đi bộ 3–5 phút.",
    "Tăng tốc độ lên mức chạy vừa sức.",
    "Chạy bước ngắn, tiếp đất dưới thân, tay đánh tự nhiên.",
    "Giảm tốc dần về đi bộ rồi dừng.",
  ], "Kẹp dây an toàn; đau gối thì chuyển sang đi bộ dốc."),
  x("cycling", "Đạp xe", "Cycling", "cardio", ["chan"], "may", B, "cardio", [
    "Chỉnh yên sao cho khi bàn đạp thấp nhất gối còn hơi chùng.",
    "Ngồi thẳng lưng, tay đặt nhẹ trên ghi đông.",
    "Đạp đều nhịp, chọn mức lực vừa sức.",
    "Giảm lực vài phút cuối để thả lỏng.",
  ], "Yên quá thấp dễ đau gối; chỉnh đúng trước khi đạp."),
  x("elliptical", "Máy chạy hình elip", "Elliptical", "cardio", ["chan"], "may", B, "cardio", [
    "Đứng lên bàn đạp, nắm tay cầm di động.",
    "Đạp chân theo vòng elip, tay đẩy kéo nhịp nhàng.",
    "Giữ thân thẳng, chọn mức lực vừa sức.",
    "Giảm lực dần trước khi dừng.",
  ], "Ít va đập, hợp người nặng cân hoặc đau gối."),
  x("rowing-machine", "Chèo thuyền máy", "Rowing Machine", "cardio", ["lung", "chan"], "may", B, "row", [
    "Ngồi máy, buộc chân, nắm tay cầm, gối co.",
    "Đạp chân trước, sau đó ngả nhẹ người và kéo tay về bụng.",
    "Trở về theo thứ tự ngược lại: duỗi tay, đổ người, co gối.",
    "Giữ nhịp đều.",
  ], "Lực chính từ chân; không gù lưng khi kéo."),
  x("stair-climber", "Máy leo cầu thang", "Stair Climber", "cardio", ["chan", "mong"], "may", B, "cardio", [
    "Đứng lên máy, bật ở tốc độ chậm.",
    "Bước đủ cả bàn chân lên từng bậc.",
    "Giữ thân thẳng, chỉ vịn nhẹ tay.",
    "Giảm tốc dần trước khi dừng.",
  ], "Không đè người lên tay vịn, sẽ giảm hiệu quả."),
  x("jump-rope", "Nhảy dây", "Jump Rope", "cardio", ["chan"], "khong", B, "cardio", [
    "Chỉnh dây dài vừa: dẫm giữa dây, tay cầm ngang nách.",
    "Đứng thẳng, khuỷu sát thân, quay dây bằng cổ tay.",
    "Nhảy thấp bằng mũi chân, vừa đủ cho dây qua.",
    "Giữ nhịp đều, nghỉ khi mệt.",
  ], "Nhảy trên sàn có độ đàn hồi, đi giày thể thao."),
  x("jumping-jack", "Bật nhảy dang tay chân", "Jumping Jack", "cardio", [], "khong", B, "cardio", [
    "Đứng thẳng, tay dọc thân, chân khép.",
    "Bật nhảy dang chân rộng, đồng thời vỗ tay lên trên đầu.",
    "Bật nhảy về tư thế ban đầu.",
    "Lặp lại liên tục theo nhịp.",
  ], "Tiếp đất nhẹ bằng mũi chân."),
  x("high-knees", "Chạy nâng cao đùi", "High Knees", "cardio", ["chan", "bung"], "khong", B, "cardio", [
    "Đứng thẳng, chân rộng bằng hông.",
    "Chạy tại chỗ, nâng gối lên ngang hông.",
    "Đánh tay theo nhịp chân.",
    "Giữ thân thẳng, tiếp đất bằng mũi chân.",
  ], "Bắt đầu chậm rồi tăng tốc dần."),
  x("burpee", "Burpee", "Burpee", "cardio", ["nguc", "chan"], "khong", B, "cardio", [
    "Đứng thẳng, ngồi xuống chống hai tay xuống sàn.",
    "Bật hai chân ra sau vào tư thế hít đất.",
    "Thu chân về sát tay rồi bật nhảy lên cao, vỗ tay trên đầu.",
    "Tiếp đất nhẹ và lặp lại.",
  ], "Có thể bước chân thay vì bật nếu mới tập."),
];

export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
