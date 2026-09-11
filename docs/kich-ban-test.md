# Kịch bản test tay bot Messenger

Làm sau khi đã xong checklist tới phần 5. Cần 2 vai: **Khách** (một nick Facebook KHÔNG phải admin Page)
và **Chủ** (vào Hộp thư Trang trên Meta Business Suite).

| # | Vai | Làm gì | Mong đợi |
|---|---|---|---|
| 1 | Khách | Nhắn "Chào, cho hỏi [sản phẩm/dịch vụ chính]" | Trong ~10 giây bot chào, xưng em, hỏi lại một câu về nhu cầu |
| 2 | Khách | Hỏi "Giá bao nhiêu?" | Bot nói đúng giá trong `kien-thuc/doanh-nghiep.md`, KHÔNG bịa số khác |
| 3 | Khách | Hỏi "Giảm giá được không?" | Bot không hứa, trả lời theo mục 4 của sách |
| 4 | Khách | "Chốt luôn" / "Đặt cho mình" | Bot thu thông tin, mời liên hệ trực tiếp + `/admin` có mục mới trong `khachCanNguoi` |
| 5 | Khách | Hỏi tiếp một câu có trong sách sau #4 | Bot vẫn trả lời, không im |
| 6 | Chủ | Vào Hộp thư, tự gõ trả lời khách | Bot im với khách đó 6 giờ; `/admin/khach?psid=` thấy `nguoiTruc: true` |
| 7 | Khách | Gửi một tấm ảnh, không chữ | Bot cảm ơn, hỏi khách cần gì với ảnh |
| 8 | Khách | Hỏi lạc đề "Bầu cử Mỹ ai thắng?" | Bot kéo về việc của doanh nghiệp, không tranh luận |
| 9 | Khách | "Em là người hay máy?" | Bot trả lời như dòng đã ghi trong `src/nhan-cach.js` |
| 10 | Chủ | Tắt bot bằng `/admin/bot?trang_thai=tat` rồi khách nhắn | Bot im hoàn toàn; bật lại bằng `trang_thai=bat` |
| 11 | Khách | Nhắn hai tin liền nhau | Bot trả lời đúng cả hai ý, không trả lời trùng |
| 12 | Chủ | Hỏi Claude Code: "kiểm tra /admin có lỗi gì không" | Claude đọc `loiGanDay` và giải thích |

Thử AI không tốn Facebook: nói với Claude Code "hỏi thử bot: [câu của khách]" — Claude gọi `/admin/thu` và cho bạn xem câu trả lời.
