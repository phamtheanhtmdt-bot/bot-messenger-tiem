# Bot Messenger cho tiệm

Bot trả lời tin nhắn Fanpage bằng AI, chạy trên Cloudflare Worker. Khách nhắn, bot đọc "sách giáo khoa"
về tiệm rồi trả lời trong vài giây. Khách muốn chốt lịch, khiếu nại, mặc cả, hay hỏi thứ không có
trong sách, bot nhường người thật và im 6 giờ với khách đó.

**Bắt đầu ở đây → [docs/checklist-hoc-vien.md](docs/checklist-hoc-vien.md)** (7 phần, mỗi việc có cách kiểm tra đạt).

```
Khách nhắn Fanpage → Facebook webhook → Worker (Cloudflare) ghi lịch sử, xếp hàng chờ
                                              ↓
              Bộ não soạn trả lời: 5A Claude Code trên máy bạn (local/tra-loi.py, liên tục (5 giây ngó hàng chờ một lần))
                                   hoặc 5B Worker tự gọi AI (OpenAI hoặc dịch vụ tương thích)
                                              ↓
                              Worker gửi tin cho khách bằng Messenger Send API
```

## Cấu trúc

| Đường dẫn | Là gì | Bạn có sửa không |
|---|---|---|
| `kien-thuc/mo-dung.md` | Sách giáo khoa: tiệm là ai, giá, giờ, câu hay gặp, điều được hứa | **Có, bắt buộc** |
| `src/nhan-cach.js` | Tính cách và luật cứng của bot | Có |
| `kich-ban/` | Kịch bản nói chuyện + mẫu tin (dùng cho luồng 5A) | Có |
| `wrangler.toml` | Cấu hình worker: 5 chỗ `<...>` phải điền | **Có, bắt buộc** |
| `src/index.js` | Bộ định tuyến: webhook, hàng chờ, cửa quản trị, Handover | Không cần |
| `src/facebook.js` | Gửi tin, kiểm chữ ký, giành/nhường quyền hội thoại | Không cần |
| `src/ai.js` | Gọi AI (luồng 5B), thử nhiều model lần lượt | Không cần |
| `src/kho.js` | Kho nhớ KV: lịch sử, hàng chờ, người trực | Không cần |
| `local/` | Bộ não trên máy (luồng 5A): script Python + task Windows | Sửa đường dẫn |
| `docs/kich-ban-test.md` | 12 bước test theo vai | Đọc |

## Cửa quản trị (thay `KEY` bằng ADMIN_KEY)

```
GET  /admin?key=KEY                               trạng thái, khách chờ người, lỗi gần đây, webhook lần cuối
POST /admin/bot?key=KEY&trang_thai=tat|bat        tắt/bật bot (luồng 5B)
POST /admin/thu?key=KEY  {"psid":"a","text":".."}  hỏi AI thử, KHÔNG gửi Facebook (luồng 5B)
GET  /admin/cho-xu-ly?key=KEY                     khách đang chờ + lịch sử (bộ não 5A lấy việc ở đây)
POST /admin/gui?key=KEY  {"psid":"..","text":".."} gửi tin cho khách qua worker
GET  /admin/khach?key=KEY&psid=<PSID>             lịch sử một khách
```

## Secrets (không bao giờ ghi vào file trong git)

`FB_PAGE_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `ADMIN_KEY`, và `OPENAI_API_KEY` khi dùng luồng 5B.
Đặt bằng `npx wrangler secret put TÊN < file` (file không có xuống dòng cuối). Chi tiết ở checklist bước 2.7.

## Điều bot làm để không loạn inbox

- Chủ tiệm tự trả lời khách nào (Hộp thư Trang, Pancake...) → bot im với khách đó `GIO_NGUOI_TRUC` giờ.
- App khác xin quyền hội thoại → worker nhường ngay. Bot chuyển người → trả hội thoại về Hộp thư Trang.
- Facebook gửi lại cùng một tin → chỉ trả lời một lần. Tin dài → tự cắt dưới 2000 ký tự.
- AI hỏng (hết tiền, khoá sai) → khách vẫn nhận một câu "chủ tiệm sẽ trả lời sớm", lỗi ghi ở `/admin`.

## Giới hạn cần biết

- Facebook chỉ cho bot trả lời khách đã nhắn trong 24 giờ gần nhất.
- Luồng 5A: máy tính tắt là bot ngừng. Luồng 5B: tốn tiền theo tin, đừng bật nạp tiền tự động.
- Chỉ MỘT app được bật "Kiểm soát cuộc trò chuyện" trên Page.

Giấy phép MIT. Tác giả: Phạm Thế Anh.
