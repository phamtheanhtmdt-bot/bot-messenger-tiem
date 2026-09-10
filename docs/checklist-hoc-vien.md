# Checklist: tự dựng bot Messenger trả lời khách cho tiệm của bạn

Mục tiêu: khách nhắn Fanpage → bot đọc "sách giáo khoa" về tiệm → trả lời trong vài giây → khách muốn chốt thì
bot nhường người thật. Làm theo thứ tự, mỗi mục có cách KIỂM TRA ĐẠT, chưa đạt thì chưa sang mục sau.
Thời gian lần đầu: khoảng 2–3 giờ. Bản mẫu chạy thật trên một Fanpage dịch vụ, 10/09/2026.

## 0. Cần có trước khi bắt đầu

- [ ] Fanpage mà bạn là **quản trị viên** (không phải biên tập viên).
- [ ] Tài khoản Facebook đó vào được https://developers.facebook.com.
- [ ] Tài khoản Cloudflare miễn phí tại https://dash.cloudflare.com (đăng ký bằng email).
- [ ] Máy Windows đã cài WSL Ubuntu, Node.js 20 trở lên, Git. Kiểm tra: mở WSL gõ `node -v` và `git --version`.
- [ ] Bộ não AI, chọn MỘT: (a) Claude Code đã đăng nhập, gõ `claude --version` chạy được; hoặc (b) một khoá API
      dịch vụ tương thích OpenAI (OpenAI, Kyma...). Luồng (a) cần máy bật, luồng (b) chạy 24/24.
- [ ] Mã nguồn: trong WSL gõ `git clone https://github.com/phamtheanhtmdt-bot/bot-messenger-tiem.git /mnt/d/bot-tiem`.

## 1. Tạo ứng dụng Facebook (một lần)

- [ ] 1.1 developers.facebook.com → My Apps → **Create App** → chọn "Business" → đặt tên (ví dụ "Bot Tiệm Nails").
      Kiểm tra: có App ID dạng số 15 chữ số ở góc trên.
- [ ] 1.2 Dashboard → **Add product** → **Messenger** → Set up.
- [ ] 1.3 Messenger → Settings → **Access Tokens** → Add or remove Pages → chọn Page của bạn → **Generate token**.
      Khi Facebook hỏi quyền, giữ tick: `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`.
      Lưu token vào file `fb-page-token.txt` trong thư mục bot (file này đã bị .gitignore chặn).
      Kiểm tra: mở https://developers.facebook.com/tools/debug/accesstoken/ dán token → `Valid: True`,
      Scopes có `pages_messaging`.
- [ ] 1.4 Settings → Basic → **App Secret** → Show → lưu tạm. Ghi lại cả **App ID**.
- [ ] 1.5 Công tắc **App Mode** ở thanh trên chuyển sang **Live**.
      Lưu ý: nếu sau này bot chỉ nhắn được cho chính bạn mà không nhắn được khách lạ, app cần xin
      Advanced Access cho `pages_messaging` (App Review) hoặc xác minh doanh nghiệp.

## 2. Dựng worker trên Cloudflare (hộp thư của bot)

- [ ] 2.1 Mở WSL: `cd /mnt/d/bot-tiem && npm install`.
- [ ] 2.2 `npx wrangler login` → trình duyệt mở → Allow. Kiểm tra: `npx wrangler whoami` in ra email và Account ID.
- [ ] 2.3 Tạo kho nhớ: `npx wrangler kv namespace create KHO` → chép dòng `id = "..."`.
- [ ] 2.4 Sửa `wrangler.toml`: `name` (tên worker của bạn, không dấu), `account_id` (từ 2.2), `FB_PAGE_ID`
      (Page → Giới thiệu → ID Trang), `FB_APP_ID` (từ 1.4), `id` của KV (từ 2.3).
- [ ] 2.5 `npx wrangler deploy` → in ra địa chỉ `https://<tên>.<tài-khoản>.workers.dev`.
      Kiểm tra: mở địa chỉ đó thấy chữ "đang chạy".
- [ ] 2.6 Nghĩ 2 chuỗi ngẫu nhiên dài 20+ ký tự: một làm `FB_VERIFY_TOKEN`, một làm `ADMIN_KEY`. Lưu lại.
- [ ] 2.7 Đặt secret (mỗi cái một lệnh, giá trị ghi trong file KHÔNG xuống dòng cuối):
      ```
      printf '%s' 'GIÁ_TRỊ' > .secret.tmp && npx wrangler secret put FB_PAGE_TOKEN < .secret.tmp
      ```
      Làm lần lượt cho: `FB_PAGE_TOKEN`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `ADMIN_KEY`, và `OPENAI_API_KEY`
      nếu chọn luồng (b). Xong xoá `.secret.tmp`.
- [ ] 2.8 Kiểm tra bắt tay:
      ```
      curl "https://<worker>/webhook?hub.mode=subscribe&hub.verify_token=<FB_VERIFY_TOKEN>&hub.challenge=123"
      ```
      Đạt khi màn hình in đúng `123`.
- [ ] 2.9 Kiểm tra cửa quản trị: mở `https://<worker>/admin?key=<ADMIN_KEY>` thấy JSON có `"bot"`.

## 3. Nối Facebook với worker

- [ ] 3.1 developers.facebook.com → app → Messenger → Settings → **Webhooks** → Add Callback URL:
      URL = `https://<worker>/webhook`, Verify token = `FB_VERIFY_TOKEN` → Verify and save.
      Đạt khi Facebook không báo lỗi (worker phải trả đúng challenge như 2.8).
- [ ] 3.2 Cùng chỗ → Manage/Add subscriptions → tick `messages`, `message_echoes`, `standby`, `messaging_handovers`.
- [ ] 3.3 Access Tokens → dòng Page của bạn → **Add subscriptions** (subscribe Page vào app).
- [ ] 3.4 Vào Facebook → Trang → Cài đặt → Nhắn tin → **Nhắn tin nâng cao** → Connected Apps → dòng app của bạn
      → Chỉnh sửa → bật **Kiểm soát cuộc trò chuyện**. Nếu Page có AI của Meta, bật thêm
      **Kiểm soát các cuộc trò chuyện với Business AI**. Chỉ bật cho MỘT app; Pancake/Botcake để "kênh dự phòng".
- [ ] 3.5 Kiểm tra sống: từ một nick khác nhắn "alo" vào Page. Mở `/admin?key=` → `webhookLanCuoi` có giờ,
      `khachDangCho` = 1. Chưa thấy thì xem lại 3.1–3.4, hay gặp nhất là 3.3 và 3.4.

## 4. Dạy bot về tiệm của bạn

- [ ] 4.1 Sửa `kien-thuc/mo-dung.md` (đổi thành tiệm bạn): tiệm là ai, địa chỉ, giờ mở, bảng giá dịch vụ,
      cách đặt lịch, câu hỏi hay gặp và câu trả lời, 3 điều bot ĐƯỢC hứa, việc nào phải chuyển người.
      Nguyên tắc: không có trong file thì bot không được nói.
- [ ] 4.2 Sửa `src/nhan-cach.js`: xưng hô, giọng, luật cứng (không giảm giá, không hứa thời gian...).
- [ ] 4.3 `npx wrangler deploy` lại.
- [ ] 4.4 Kiểm tra (chỉ dùng được khi luồng b, hoặc chạy `python3 local/tra-loi.py --thu "..."` với luồng a):
      ```
      curl -X POST "https://<worker>/admin/thu?key=<ADMIN_KEY>" -H "content-type: application/json" \
        -d '{"psid":"a","text":"làm móng gel giá bao nhiêu?"}'
      ```
      Đạt khi câu trả lời đúng giá trong file và không bịa.

## 5. Chọn bộ não, chỉ một trong hai

### 5A. Claude Code trên máy (không cần khoá API, máy phải bật)
- [ ] `wrangler.toml`: `CHE_DO = "may-tinh"` → deploy.
- [ ] Trong WSL: `python3 local/tra-loi.py --thu "chị ơi giá bao nhiêu"` → in JSON có `tra_loi`. Mất 5–10 giây.
- [ ] Sửa đường dẫn trong `local/tra-loi.sh`, `local/tra-loi-hidden.vbs`, `local/dang-ky-task.ps1` từ
      `D:\bot-tiem` / `/mnt/d/bot-tiem` sang thư mục của bạn, và tên user WSL.
- [ ] PowerShell (Windows): `powershell -ExecutionPolicy Bypass -File D:\bot-tiem\local\dang-ky-task.ps1`.
      Đạt khi in `LastTaskResult : 0`. Task chạy mỗi 1 phút.

### 5B. Worker tự gọi AI (chạy 24/24, tốn tiền theo tin)
- [ ] `wrangler.toml`: `CHE_DO = "worker"`, `AI_BASE_URL` (ví dụ `https://api.openai.com/v1`), `MODEL`
      (một hoặc nhiều tên cách nhau dấu phẩy) → deploy.
- [ ] Secret `OPENAI_API_KEY` đã đặt (2.7).
- [ ] Bật bot: `curl -X POST "https://<worker>/admin/bot?key=<ADMIN_KEY>&trang_thai=bat"`.
- [ ] Không bật nạp tiền tự động ở nhà cung cấp AI; giữ số dư thấp.

## 6. Test theo vai trước khi cho khách thật

- [ ] Khách hỏi giá → đúng giá, không bịa.
- [ ] Khách xin giảm giá → không hứa, chuyển người.
- [ ] Khách "chốt luôn" → trả lời lịch sự + `/admin` có mục trong `khachCanNguoi`, bot im với khách đó 6 giờ.
- [ ] Chủ tiệm tự trả lời một khách trong Hộp thư/Pancake → bot im với khách đó 6 giờ.
- [ ] Khách gửi ảnh không chữ → bot hỏi lại, không đoán.
- [ ] Tắt bot bằng `/admin/bot?trang_thai=tat` → bot im hẳn; bật lại được.
- [ ] Toàn bộ 12 bước ở `docs/kich-ban-test.md`.

## 7. Vận hành và khi hỏng

- [ ] Mỗi sáng mở `/admin?key=`: xem `khachCanNguoi` (khách chờ người), `loiGanDay` (lỗi), `webhookLanCuoi`.
- [ ] Bot chỉ trả lời được khách nhắn trong 24 giờ gần nhất (luật Facebook). Khách cũ hơn: chăm tay.
- [ ] Luồng 5A: máy tắt/ngủ = bot ngừng. Xem `local/tra-loi.log` nếu không thấy trả lời.
- [ ] Không bao giờ đưa token/secret vào git, vào chat nhóm, vào trang web lạ.
- [ ] Đổi giá, đổi dịch vụ: sửa `kien-thuc/*.md` → deploy. Không cần sửa code.
- [ ] Không thấy tin tới webhook: kiểm tra theo thứ tự 3.4 → 3.3 → 3.1 → token còn hạn (1.3).
- [ ] Bot gửi lỗi "app khác đang kiểm soát": xem 3.4, chỉ một app được bật "Kiểm soát cuộc trò chuyện".
