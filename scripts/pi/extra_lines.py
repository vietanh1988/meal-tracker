#!/usr/bin/env python3
"""31/10 cá tính Pi: nhóm câu riêng của app (không nằm trong bộ Muse nên build.py không ghi đè) → src/pi/extraLines.json.
  mon_an   bình luận đúng món vừa ăn (muc = mã nhóm món, src/pi/piMood.js FOOD_GROUPS)
  cu_nhot  chạm Pi 5 lần liền: nhột          doi_cham  chạm 10 lần liền: dỗi (5 giây không phản ứng)
  het_doi  vắng ≥ 2 ngày, chạm 3 lần dỗ → hết dỗi
text = Pi nam (cậu nhóc lầy, ham ăn, hay khoe), nu = Pi nữ (cô bé điệu, nhõng nhẽo). Không chê cơ thể, không khuyên nhịn ăn.
Chạy: python3 scripts/pi/extra_lines.py
"""
import json, os
M = lambda i, muc, mat, nam, nu, giong="vui_tuoi": {"id": i, "muc": muc, "text": nam, "nu": nu, "mat": mat, "giong": giong}
C = lambda i, mat, nam, nu, giong="vui_tuoi": {"id": i, "text": nam, "nu": nu, "mat": mat, "giong": giong}
NHOM = [
  {"ma": "mon_an", "ten": "Bình luận món vừa ăn (theo nhóm món)", "kich_hoat": "vua_ghi_bua_co_mon_quen", "cau": [
    M("MON-01", "pho_bun", "haohung", "Phở hả? Húp nước lèo giùm Pi một miếng đi, Pi ghiền mùi quế hồi lắm.", "Phở nóng hổi ghê! Thổi cho nguội rồi ăn nha, kẻo phỏng lưỡi là Pi xót đó."),
    M("MON-02", "pho_bun", "nhaymat", "Bún nữa nè! Bạn ăn bún, Pi ăn… ké mùi thơm. Ghi rồi là yên tâm.", "Bún ngon quá trời, Pi nhìn mà thèm. Ăn ngon miệng nha bạn."),
    M("MON-03", "com_tam", "cuoilon", "Cơm tấm sườn! Bạn sành ăn quá, Pi xin miếng bì được không?", "Cơm tấm thơm ghê á! Ăn kèm dưa leo cho mát nha, Pi dặn đó."),
    M("MON-04", "tra_sua", "nhaymat", "Trà sữa hả? Pi không cấm đâu, chỉ cần ghi đủ là Pi giả bộ không thấy.", "Trà sữa! Pi cũng mê lắm á. Lần sau mình chọn ít đường cho xinh nha."),
    M("MON-05", "tra_sua", "suynghi", "Trà sữa vô sổ rồi. Bữa sau nhớ thêm ly nước lọc cho cân, Pi canh.", "Ghi trà sữa rồi nè. Uống thêm ly nước lọc nữa là hoàn hảo luôn."),
    M("MON-06", "rau", "yeu", "Có rau! Bạn ăn rau là Pi tự hào, vì Pi cũng là… rau mà.", "Ăn rau xanh nè, đúng gu Pi luôn! Da bạn sẽ đẹp như lá Pi đó."),
    M("MON-07", "trung", "haohung", "Trứng! Đạm xịn mà rẻ, bạn biết chọn ghê. Pi chấm điểm mười.", "Trứng nè, ngon mà nhiều đạm. Bạn chọn khéo quá trời."),
    M("MON-08", "ga", "cuoilon", "Gà hả? Pi nghe thơm từ đây. Đạm ngon vậy là cơ bắp cười tươi rồi.", "Gà nè, nhiều đạm lắm á. Bạn ăn ngon miệng nha, Pi vui ghê."),
    M("MON-09", "ca", "yeu", "Cá nè! Ăn cá thông minh, Pi đoán mai bạn còn khôn hơn Pi.", "Cá ngon mà tốt nữa, bạn khéo chọn ghê. Pi thương nhất mấy bữa có cá."),
    M("MON-10", "banh_mi", "nhaymat", "Bánh mì! Món quốc dân, Pi xin cái đầu bánh giòn giòn được không?", "Bánh mì giòn rụm nè! Ăn kèm chút rau là hết ý luôn bạn ơi."),
    M("MON-11", "xoi", "cuoilon", "Xôi sáng hả? Chắc bụng ghê, đi cả buổi không đói. Pi duyệt.", "Xôi dẻo thơm ghê á. Ăn xong nhớ uống ly nước nha bạn."),
    M("MON-12", "mi_tom", "suynghi", "Mì tôm cứu đói thần thánh! Lần sau thêm trứng với rau vô là đủ chất liền.", "Mì tôm hả… bỏ thêm trứng với rau vào cho đủ chất nha, Pi năn nỉ đó."),
  ]},
  {"ma": "cu_nhot", "ten": "Chạm Pi 5 lần liền (nhột)", "kich_hoat": "cham_pi_5_lan", "cau": [
    C("NHOT-01", "cuoilon", "Ha ha nhột quá! Chạm nữa là Pi méc cái cân á!", "Hi hi nhột quá à! Đừng chọc nữa mà, Pi cười muốn rụng lá rồi.", "hao_hung"),
    C("NHOT-02", "cuoilon", "Ê ê nhột! Rảnh tay vậy thì ghi bữa giùm Pi đi nè.", "Nhột nhột! Bạn chọc Pi hoài là Pi dỗi đó nha.", "hao_hung"),
    C("NHOT-03", "cuoilon", "Ui da, chỗ đó nhột nhất! Bạn biết hết điểm yếu của Pi rồi.", "Á á nhột! Tay bạn hư ghê á, hứ.", "hao_hung"),
  ]},
  {"ma": "doi_cham", "ten": "Chạm Pi 10 lần liền (dỗi, 5 giây không phản ứng)", "kich_hoat": "cham_pi_10_lan", "cau": [
    C("DOICHAM-01", "buon", "Đủ rồi nha! Pi quay lưng 5 giây cho bạn biết tay.", "Hứ! Chọc hoài, Pi dỗi rồi. Năm giây nữa mới thèm nói chuyện.", "an_ui"),
    C("DOICHAM-02", "buon", "Pi đình công! Muốn Pi vui lại thì đi uống ly nước đi.", "Pi giận rồi đó… Muốn dỗ thì ghi một bữa cho Pi xem đi.", "an_ui"),
  ]},
  {"ma": "het_doi", "ten": "Hết dỗi (vắng lâu, chạm 3 lần dỗ)", "kich_hoat": "do_pi_3_lan", "cau": [
    C("HETDOI-01", "cuoilon", "Thôi được rồi, Pi tha cho lần này. Ghi một bữa là huề cả làng!", "Hứ… thôi Pi hết giận rồi. Mai đừng bỏ Pi lâu vậy nữa nha.", "hao_hung"),
    C("HETDOI-02", "yeu", "Dỗ khéo ghê, Pi mềm lòng rồi. Giờ mình làm việc hôm nay nha!", "Bạn dỗ Pi dễ thương quá, Pi hết dỗi liền. Mình bắt đầu lại nha.", "diu_dang"),
  ]},
]
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
json.dump({"meta": {"ghi_chu": "31/10 nhóm câu riêng của app (scripts/pi/extra_lines.py), không nằm trong bộ Muse"}, "nhom": NHOM},
          open(os.path.join(root, "src", "pi", "extraLines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sum(len(g["cau"]) for g in NHOM), "câu ×2")
