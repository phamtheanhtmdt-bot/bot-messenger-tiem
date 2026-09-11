# Bot Messenger cho doanh nghiệp

Bot trả lời tin nhắn Fanpage bằng AI, cho mọi ngành: spa, nhà hàng, bán lẻ, tư vấn, đào tạo, sửa chữa...
Khách nhắn, bot đọc "sách giáo khoa" về doanh nghiệp của bạn rồi trả lời trong vài giây. Khách muốn chốt, mặc cả,
khiếu nại, hay hỏi thứ không có trong sách, bot mời khách liên hệ trực tiếp và ghi vào sổ để bạn biết.

**Bạn không cần biết code.** Mở thư mục này trong ứng dụng **Claude Code**, làm theo
[docs/checklist-hoc-vien.md](docs/checklist-hoc-vien.md): mỗi bước có sẵn câu để nói với Claude Code, Claude chạy lệnh giúp bạn.

```
Khách nhắn Fanpage → Facebook gõ cửa Worker (Cloudflare, chạy 24/24)
                        ↓ Worker hỏi AI (OpenAI hoặc dịch vụ tương thích) kèm sách giáo khoa của bạn
                        ↓ Worker gửi trả khách, mỗi ý một tin, có "đang gõ"
```

## Bạn sửa gì, không sửa gì

| Đường dẫn | Là gì | Bạn có sửa không |
|---|---|---|
| `kien-thuc/doanh-nghiep.md` | Sách giáo khoa: doanh nghiệp là ai, sản phẩm, giá, quy trình, câu hay hỏi, điều được hứa | **Có, bắt buộc** |
| `kien-thuc/kich-ban.md` | Kịch bản nói chuyện (hỏi gì trước, khi nào báo giá, khi nào chuyển người) | Nên |
| `src/nhan-cach.js` | Tính cách, xưng hô, luật cứng; đóng vai trợ lý hay chính chủ | Có |
| `wrangler.toml` | Cấu hình: 5 chỗ `<...>` Claude Code điền giúp | Claude điền |
| `src/index.js`, `facebook.js`, `kho.js`, `ai.js` | Bộ máy: webhook, gửi tin, kho nhớ, gọi AI | Không |
| `docs/kich-ban-test.md` | Test theo vai trước khi cho khách thật | Đọc |
| `CLAUDE.md` | Hướng dẫn cho Claude Code cách giúp bạn | Không |

## Cửa quản trị (thay `KEY` bằng ADMIN_KEY)

```
GET  /admin?key=KEY                               trạng thái, khách cần người, lỗi gần đây, webhook lần cuối
POST /admin/bot?key=KEY&trang_thai=tat|bat        tắt / bật bot
POST /admin/thu?key=KEY  {"psid":"a","text":".."}  hỏi AI thử, KHÔNG gửi Facebook
GET  /admin/khach?key=KEY&psid=<PSID>             lịch sử một khách
POST /admin/mo-lai?key=KEY&psid=<PSID>            bỏ dấu "người đang trực" cho một khách
```

## Secrets (không bao giờ ghi vào file trong git)

`FB_PAGE_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `ADMIN_KEY`, `OPENAI_API_KEY`. Claude Code đặt giúp bằng
`npx wrangler secret put`, bạn chỉ dán giá trị vào chat khi được hỏi.

## Điều bot làm để không loạn inbox

- Bạn tự trả lời khách nào (Hộp thư Trang, Pancake...) → bot im với khách đó `GIO_NGUOI_TRUC` giờ (mặc định 6).
- App khác xin quyền hội thoại → worker nhường ngay. Facebook gửi lại cùng một tin → chỉ trả lời một lần.
- AI hỏng (hết tiền, khoá sai) → khách vẫn nhận một câu mời liên hệ trực tiếp, lỗi ghi ở `/admin`.

## Giới hạn cần biết

- Facebook chỉ cho bot trả lời khách đã nhắn trong 24 giờ gần nhất.
- Chỉ MỘT app được bật "Kiểm soát cuộc trò chuyện" trên Page.
- Tốn tiền AI theo tin (vài trăm đồng một tin). Không bật nạp tiền tự động ở nhà cung cấp AI.

Giấy phép MIT. Tác giả: Phạm Thế Anh.
