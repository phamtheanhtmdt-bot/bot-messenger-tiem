# Hướng dẫn cho Claude Code khi giúp chủ doanh nghiệp dựng bot này

Người dùng là chủ doanh nghiệp, KHÔNG phải lập trình viên. Họ mở thư mục này trong ứng dụng Claude Code và nhờ bạn làm từng phần
của `docs/checklist-hoc-vien.md`. Việc của bạn: làm thay họ mọi thứ chạy được bằng lệnh, và chỉ dẫn từng bước cho những
việc phải bấm trên Facebook/Cloudflare.

## Cách làm việc
- Luôn đọc `docs/checklist-hoc-vien.md` trước, làm đúng phần người dùng yêu cầu, báo "đạt/chưa đạt" theo mục KIỂM TRA ĐẠT của từng bước.
- Nói tiếng Việt đời thường, giải thích thuật ngữ ngay tại chỗ. Một lần chỉ hỏi một thứ.
- Cần giá trị bí mật (token, App Secret, khoá AI): bảo người dùng dán vào chat, rồi ghi ra file tạm không xuống dòng và
  `npx wrangler secret put TÊN < file`, xong xoá file. KHÔNG bao giờ in lại giá trị bí mật, KHÔNG ghi vào file trong git, KHÔNG commit.
- Trước khi deploy lần đầu: kiểm tra `node -v` (≥ 20), `npm install`, `npx wrangler whoami` (chưa đăng nhập thì chạy `npx wrangler login`).
- `wrangler.toml` có 5 chỗ `<...>`: `name`, `account_id` (lấy từ `npx wrangler whoami`), `FB_PAGE_ID`, `FB_APP_ID`, `id` của KV
  (lấy từ `npx wrangler kv namespace create KHO`). Điền xong mới `npx wrangler deploy`.
- Sau mỗi lần sửa `kien-thuc/*.md` hoặc `src/nhan-cach.js` phải `npx wrangler deploy` thì bot mới đổi.
- Kiểm tra bot không tốn Facebook: `POST /admin/thu?key=ADMIN_KEY` với `{"psid":"a","text":"..."}`; xoá phiên thử bằng `{"psid":"a","xoa":true}`.
- Việc trên Facebook (tạo app, token, webhook, "Kiểm soát cuộc trò chuyện") không làm được bằng lệnh: chỉ dẫn từng cú bấm theo checklist, rồi kiểm tra kết quả bằng `/admin` (`webhookLanCuoi`, `khachDangCho`).
- Không sửa `src/index.js`, `src/facebook.js`, `src/kho.js`, `src/ai.js` trừ khi người dùng yêu cầu rõ. Nội dung để sửa là
  `kien-thuc/doanh-nghiep.md`, `kien-thuc/kich-ban.md`, `src/nhan-cach.js`, `wrangler.toml`.

## Sơ đồ
Khách nhắn Fanpage → Facebook webhook → Worker (Cloudflare) → gọi AI ở AI_BASE_URL với sách giáo khoa → gửi trả khách qua Messenger Send API.
Chủ doanh nghiệp tự trả lời khách nào → bot im 6 giờ với khách đó. Khách cần người → ghi sổ `khachCanNguoi` ở `/admin`.
