# Checklist: tự dựng bot Messenger trả lời khách cho doanh nghiệp của bạn

Bạn làm việc qua **ứng dụng Claude Code** trên máy tính: mở thư mục dự án, gõ câu yêu cầu, Claude chạy lệnh giúp.
Mỗi bước có (a) việc bạn tự bấm trên Facebook/Cloudflare, hoặc (b) một câu để nói với Claude Code. Mỗi bước có cách
KIỂM TRA ĐẠT; chưa đạt thì chưa sang bước sau. Lần đầu mất khoảng 2 giờ.

## 0. Cần có trước khi bắt đầu

- [ ] Fanpage mà bạn là **quản trị viên**.
- [ ] Tài khoản Facebook đó vào được https://developers.facebook.com.
- [ ] Tài khoản Cloudflare miễn phí: https://dash.cloudflare.com (đăng ký bằng email, không cần thẻ).
- [ ] Ứng dụng **Claude Code** đã cài và đăng nhập (claude.ai/code → tải bản máy tính).
- [ ] Máy có **Node.js 20+** (nodejs.org, bản LTS) và **Git** (git-scm.com). Kiểm tra: mở Claude Code, nói
      "kiểm tra máy tôi đã có node và git chưa" → Claude báo số phiên bản.
- [ ] Một **khoá API AI**: OpenAI (platform.openai.com → API keys) hoặc dịch vụ tương thích OpenAI mà giảng viên chỉ định.
      Nạp ít (10–20 USD), **không bật nạp tiền tự động**.
- [ ] Tải mã: vào https://github.com/phamtheanhtmdt-bot/bot-messenger-doanh-nghiep → nút **Code** → **Download ZIP** → giải nén
      vào một thư mục dễ nhớ, ví dụ `D:\bot-messenger`. Rồi mở Claude Code → **Open folder** → chọn thư mục đó.
      Đạt khi trong thư mục có `CLAUDE.md`, `src`, `kien-thuc`, `docs`.

## 1. Tạo ứng dụng Facebook (làm tay, một lần)

- [ ] 1.1 developers.facebook.com → My Apps → **Create App** → chọn **Business** → đặt tên (ví dụ "Bot [tên doanh nghiệp]").
      Đạt khi góc trên có **App ID** (số 15 chữ số). Ghi lại.
- [ ] 1.2 Dashboard → **Add product** → **Messenger** → Set up.
- [ ] 1.3 Messenger → Settings → **Access Tokens** → Add or remove Pages → chọn Page → **Generate token**. Giữ tick 3 quyền:
      `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`. Chép token, giữ ở chỗ an toàn (sẽ dán cho Claude ở 2.4).
      Đạt khi dán token vào developers.facebook.com/tools/debug/accesstoken thấy Valid: True, Scopes có pages_messaging.
- [ ] 1.4 Settings → Basic → **App Secret** → Show → chép. Ghi lại cả **App ID**.
- [ ] 1.5 Công tắc **App Mode** ở thanh trên → **Live**.
      Nếu về sau bot chỉ nhắn được cho chính bạn, app cần xin Advanced Access cho pages_messaging (App Review) hoặc xác minh doanh nghiệp.
- [ ] 1.6 Lấy **ID Trang**: vào Page → Giới thiệu → cuối trang có "ID Trang". Ghi lại.

## 2. Dựng worker trên Cloudflare (Claude Code làm giúp)

- [ ] 2.1 Nói với Claude Code: **"Đọc CLAUDE.md và làm phần 2 của docs/checklist-hoc-vien.md. Bắt đầu từ kiểm tra máy và đăng nhập Cloudflare."**
      Claude chạy `npm install`, rồi `npx wrangler login` → trình duyệt mở → bấm **Allow**.
      Đạt khi Claude báo `whoami` in ra email và Account ID của bạn.
- [ ] 2.2 Claude tạo kho nhớ (`kv namespace create KHO`) và điền 5 chỗ `<...>` trong `wrangler.toml`. Claude sẽ hỏi bạn
      **tên worker** (chữ thường không dấu, ví dụ `bot-an-spa`), **ID Trang** (1.6), **App ID** (1.1).
- [ ] 2.3 Claude chạy `npx wrangler deploy`. Đạt khi Claude đưa bạn địa chỉ `https://<tên>.<tài-khoản>.workers.dev`
      và mở lên thấy chữ "đang chạy".
- [ ] 2.4 Đặt 5 secret. Claude sẽ hỏi lần lượt, bạn dán vào chat: **Page token** (1.3), **App Secret** (1.4), **khoá AI** (phần 0).
      Hai cái còn lại (`FB_VERIFY_TOKEN`, `ADMIN_KEY`) Claude tự sinh chuỗi ngẫu nhiên và cho bạn biết để giữ.
      Đạt khi Claude báo 5 dòng "Success! Uploaded secret".
- [ ] 2.5 Kiểm tra bắt tay: nói **"kiểm tra bắt tay webhook"**. Đạt khi Claude báo worker trả đúng challenge.
- [ ] 2.6 Kiểm tra cửa quản trị: nói **"mở /admin xem trạng thái"**. Đạt khi thấy `bot`, `webhookLanCuoi`.

## 3. Nối Facebook với worker (làm tay, Claude kiểm tra)

- [ ] 3.1 developers.facebook.com → app → Messenger → Settings → **Webhooks** → Add Callback URL:
      URL = `https://<worker>/webhook`, Verify token = `FB_VERIFY_TOKEN` (Claude đã cho ở 2.4) → Verify and save.
      Đạt khi Facebook không báo lỗi.
- [ ] 3.2 Cùng chỗ → Add subscriptions → tick `messages`, `message_echoes`, `standby`, `messaging_handovers`.
- [ ] 3.3 Access Tokens → dòng Page của bạn → **Add subscriptions**.
- [ ] 3.4 Facebook → Trang → Cài đặt → Nhắn tin → **Nhắn tin nâng cao** → Connected Apps → dòng app của bạn → Chỉnh sửa →
      bật **Kiểm soát cuộc trò chuyện**. Page có AI của Meta thì bật thêm **Kiểm soát các cuộc trò chuyện với Business AI**,
      và tắt AI của Meta trong Business Suite → Hộp thư → Tự động hoá. Chỉ bật cho MỘT app.
- [ ] 3.5 Kiểm tra sống: từ một nick khác nhắn "alo" vào Page. Nói với Claude: **"xem /admin, webhook đã nhận chưa"**.
      Đạt khi `webhookLanCuoi` có giờ. Chưa thấy: xem lại 3.4 → 3.3 → 3.1.

## 4. Dạy bot về doanh nghiệp của bạn

- [ ] 4.1 Mở `kien-thuc/doanh-nghiep.md`, điền các chỗ [ngoặc vuông]: bạn là ai, sản phẩm và giá, quy trình mua, câu hay hỏi,
      3 điều được hứa, khi nào chuyển người. Có 4 ví dụ ở cuối file để tham khảo, xoá khi xong.
      Hoặc nói với Claude: **"Phỏng vấn tôi để điền kien-thuc/doanh-nghiep.md"** rồi trả lời từng câu.
- [ ] 4.2 Mở `src/nhan-cach.js`: thay [TÊN DOANH NGHIỆP], [TÊN CHỦ], [KÊNH LIÊN HỆ TRỰC TIẾP]. Muốn bot đóng vai chính bạn
      (không phải trợ lý) thì nói với Claude: **"đổi bot sang đóng vai chính chủ"**.
- [ ] 4.3 Nói **"deploy lại"**.
- [ ] 4.4 Nói **"hỏi thử bot: [một câu khách hay hỏi về giá]"**. Đạt khi câu trả lời đúng giá trong sách, không bịa,
      chia 2–3 dòng ngắn, xưng hô "anh/chị" khi chưa biết khách.
- [ ] 4.5 Nói **"bật bot"**. Đạt khi `/admin` báo `"bot": "bat"`.

## 5. Test theo vai trước khi cho khách thật

- [ ] Khách hỏi giá → đúng giá, không bịa.
- [ ] Khách xin giảm giá → không hứa.
- [ ] Khách "chốt luôn" → bot thu thông tin, mời liên hệ trực tiếp, `/admin` có mục trong `khachCanNguoi`.
- [ ] Khách hỏi tiếp sau khi chốt → bot vẫn trả lời.
- [ ] Bạn tự trả lời một khách trong Hộp thư → bot im với khách đó 6 giờ.
- [ ] Khách gửi ảnh không chữ → bot hỏi lại, không đoán.
- [ ] Đủ 12 bước ở `docs/kich-ban-test.md`.

## 6. Vận hành và khi hỏng

- [ ] Mỗi sáng nói với Claude: **"xem /admin có khách nào cần người và có lỗi gì không"**.
- [ ] Đổi giá, đổi sản phẩm: sửa `kien-thuc/doanh-nghiep.md` → "deploy lại". Không cần sửa code.
- [ ] Bot chỉ trả lời được khách nhắn trong 24 giờ gần nhất (luật Facebook). Khách cũ hơn: chăm tay.
- [ ] Không bao giờ đưa token, secret, khoá AI vào file trong git, vào chat nhóm, hay trang web lạ.
- [ ] Tin không tới webhook: kiểm 3.4 → 3.3 → 3.1 → token còn hạn (1.3).
- [ ] Bot gửi lỗi "app khác đang kiểm soát": xem 3.4, chỉ một app được bật "Kiểm soát cuộc trò chuyện".
- [ ] Bot trả lời "người phụ trách sẽ vào trả lời" cho mọi khách: khoá AI hết tiền hoặc sai, xem `loiGanDay` ở `/admin`.
