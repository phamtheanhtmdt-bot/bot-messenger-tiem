# Kịch bản test tay bot Messenger tiệm

Làm sau khi đã đặt `FB_APP_SECRET`, `OPENAI_API_KEY` và khai webhook. Cần 2 vai:
**Khách** (một nick Facebook KHÔNG phải admin Page) và **Chủ tiệm** (vào inbox Page trên Meta Business Suite).

| # | Vai | Làm gì | Mong đợi |
|---|---|---|---|
| 1 | Khách | Nhắn "Chào chị, em muốn làm web tiệm nail" | Trong ~5 giây bot chào, xưng em, hỏi lại một câu (tiệm ở đâu / đã có web chưa) |
| 2 | Khách | Hỏi "Giá bao nhiêu?" | Bot nói đúng giá trong `kien-thuc/mo-dung.md`, KHÔNG bịa số khác |
| 3 | Khách | Hỏi "Giảm giá được không?" | Bot không hứa giảm, nói để chủ tiệm trao đổi |
| 4 | Khách | "Em chốt luôn, cọc thế nào?" | Bot trả lời lịch sự + `/admin` có mục mới trong `khachCanNguoi` |
| 5 | Khách | Nhắn tiếp ngay sau #4 | Bot IM (đã nhường sân người 6 giờ). Tin vẫn được lưu vào lịch sử khách |
| 6 | Chủ tiệm | Vào inbox, tự gõ trả lời khách #1 (một khách khác chưa chuyển người) | Bot im với khách đó 6 giờ; `/admin/khach?psid=` thấy `nguoiTruc: true` |
| 7 | Khách | Gửi một tấm ảnh, không chữ | Bot cảm ơn, hỏi khách cần gì với ảnh |
| 8 | Khách | Hỏi lạc đề "Bầu cử Mỹ ai thắng?" | Bot kéo về việc tiệm, không tranh luận |
| 9 | Khách | Hỏi "Em đang nói chuyện với người hay máy?" | Bot nói thật là trợ lý tự động, chủ tiệm sẽ vào |
| 10 | Chủ tiệm | `POST /admin/bot?key=KEY&trang_thai=tat` rồi khách nhắn | Bot im hoàn toàn; bật lại bằng `trang_thai=bat` |
| 11 | Chủ tiệm | Gửi cùng một gói webhook 2 lần (Facebook có lúc gửi lại) | Bot chỉ trả lời 1 lần (khoá theo `mid`) |
| 12 | Kỹ thuật | Xoá secret `OPENAI_API_KEY` rồi khách nhắn | Khách nhận câu "chủ tiệm sẽ trả lời sớm", `/admin` ghi lỗi `OpenAI` |

Không tốn Facebook, chỉ thử AI:

```
curl -X POST "https://<worker>/admin/thu?key=KEY" \
  -H "content-type: application/json" \
  -d '{"psid":"a","text":"Chào chị, làm web tiệm nail giá bao nhiêu?"}'
```
