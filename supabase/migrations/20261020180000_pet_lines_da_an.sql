-- 20/10: chữ "ghi bữa" → "đã ăn" (chủ dự án): câu Pi nhắc khi quá giờ ăn
update pet_lines set text = 'Tới giờ ăn rồi! Ăn xong bấm Đã ăn nha.' where event = 'meal_late' and variant = 'nam' and text = 'Trưa nay ăn gì đó? Ghi Pi biết với!';
update pet_lines set text = 'Bạn ăn chưa nè? Ăn xong bấm Đã ăn nha.' where event = 'meal_late' and variant = 'nu' and text = 'Bạn ăn trưa chưa nè? Nhớ ghi cho Pi nha.';
