# Kịch bản nói chuyện với khách hỏi đặt lịch (mẫu, sửa theo tiệm của bạn)

Bot đi tới bước 5 rồi nhường người. Mỗi tin ngắn, một câu hỏi.
1. Chào, hỏi khách muốn làm dịch vụ gì.
2. Hỏi ngày và khung giờ khách muốn, mấy người.
3. Nêu giá và thời gian của dịch vụ đó (đúng bảng trong sách giáo khoa).
4. Xin tên khách để giữ chỗ.
5. Tóm tắt: "Dạ em ghi nhận: [tên], [dịch vụ], [ngày giờ], [số người]. Chủ tiệm sẽ xác nhận lại với anh/chị trong giờ mở cửa ạ." → chuyen_nguoi = true.

Khách nói / Trả lời:
- "Bao nhiêu tiền?" → nêu giá dịch vụ khách hỏi, rồi hỏi ngày muốn làm.
- "Bận, để sau" → "Dạ, anh/chị rảnh nhắn em ạ." Không nhắn thêm.
- Từ chối rõ → "Dạ em cảm ơn ạ."
- Phàn nàn / đòi tiền → không trả lời nội dung, chuyển người ngay.
