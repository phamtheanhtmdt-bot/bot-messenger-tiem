// Bot Messenger cho tiệm — Cloudflare Worker trả lời tin nhắn Fanpage bằng AI.
//
// Đường đi:
//   GET  /webhook   Facebook gọi một lần để "bắt tay" (kiểm FB_VERIFY_TOKEN)
//   POST /webhook   Facebook gõ cửa mỗi khi có tin mới → trả 200 ngay, xử lý nền
//   GET  /admin?key=ADMIN_KEY            trạng thái bot, khách cần người, lỗi gần đây
//   POST /admin/bot?key=...&trang_thai=bat|tat   tắt/bật bot toàn cục
//   POST /admin/thu?key=...  body {"psid":"thu","text":"..."}  hỏi AI mà KHÔNG gửi Facebook
//
// Bot im khi: bot bị tắt, hoặc người thật (chủ tiệm) vừa trả lời khách đó trong GIO_NGUOI_TRUC giờ.

import { kiemTraChuKy, guiTin, guiTinBot, baoDangGo, nhuongQuyen } from "./facebook.js";
import { hoiAI } from "./ai.js";
import * as kho from "./kho.js";

const json = (o, status = 200) =>
  new Response(JSON.stringify(o, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/webhook" && request.method === "GET") return batTay(url, env);
    if (p === "/webhook" && request.method === "POST") return nhanWebhook(request, env, ctx);
    if (p.startsWith("/admin")) return admin(request, url, env);
    if (p === "/") return new Response("bot-messenger-tiem đang chạy.", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return new Response("Not found", { status: 404 });
  },
};

function batTay(url, env) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === env.FB_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Sai verify token", { status: 403 });
}

async function nhanWebhook(request, env, ctx) {
  const raw = await request.text();
  const chuKy = await kiemTraChuKy(raw, request.headers.get("x-hub-signature-256"), env.FB_APP_SECRET);
  if (!chuKy.ok) {
    ctx.waitUntil(kho.ghiLog(env, { loai: "chu-ky", lyDo: chuKy.lyDo }));
    return new Response("Sai chữ ký", { status: 403 });
  }
  let goi;
  try { goi = JSON.parse(raw); } catch { return new Response("Không phải JSON", { status: 400 }); }
  if (goi.object !== "page") return new Response("Bỏ qua", { status: 200 });
  ctx.waitUntil(env.KHO.put("webhook:lan-cuoi", new Date().toISOString()));

  const viec = [];
  for (const entry of goi.entry || []) {
    for (const su of entry.messaging || []) viec.push(xuLySuKien(env, su));
    for (const su of entry.standby || []) viec.push(xuLySuKien(env, { ...su, standby: true }));
  }
  // Facebook cần 200 trong 20 giây; AI có thể lâu hơn → làm nền.
  ctx.waitUntil(Promise.allSettled(viec).then(async kq => {
    for (const r of kq) if (r.status === "rejected") await kho.ghiLog(env, { loai: "xu-ly", loi: String(r.reason?.message || r.reason) });
  }));
  return new Response("EVENT_RECEIVED", { status: 200 });
}

async function xuLySuKien(env, su) {
  // Sự kiện Định tuyến cuộc trò chuyện: ai xin quyền thì nhường ngay; quyền về tay app khác thì bot im 6 giờ.
  const psidHo = su.sender?.id === env.FB_PAGE_ID ? su.recipient?.id : su.sender?.id;
  if (su.request_thread_control && psidHo) {
    const appXin = String(su.request_thread_control.requested_owner_app_id || "");
    try { await nhuongQuyen(env, psidHo, appXin); } catch (e) { await kho.ghiLog(env, { loai: "nhuong", psid: psidHo, loi: String(e.message) }); }
    await kho.danhDauNguoiTruc(env, psidHo); await kho.xoaCho(env, psidHo);
    return;
  }
  const doiChu = su.pass_thread_control || su.take_thread_control;
  if (doiChu && psidHo) {
    const chuMoi = String(doiChu.new_owner_app_id || "");
    if (chuMoi && chuMoi !== String(env.FB_APP_ID)) { await kho.danhDauNguoiTruc(env, psidHo); await kho.xoaCho(env, psidHo); }
    return;
  }
  const msg = su.message;
  if (!msg) return; // delivery, read, postback... chưa dùng

  // Tin do Page gửi ra (echo). Nếu KHÔNG phải bot gửi → người thật đang trả lời → bot im một lúc.
  if (msg.is_echo) {
    const psid = su.recipient?.id;
    const laBot = msg.metadata === "bot-tiem" || String(msg.app_id || "") === String(env.FB_APP_ID);
    if (!laBot && psid) {
      await kho.danhDauNguoiTruc(env, psid);
      await kho.xoaCho(env, psid);
      if (msg.text) {
        const ls = await kho.layLichSu(env, psid);
        ls.push({ role: "assistant", content: msg.text, t: su.timestamp, nguoi: true });
        await kho.luuLichSu(env, psid, ls);
      }
    }
    return;
  }

  const psid = su.sender?.id;
  if (!psid || psid === env.FB_PAGE_ID) return;
  if (await kho.daXuLy(env, msg.mid)) return;

  const text = (msg.text || "").trim();
  const dinhKem = (msg.attachments || []).map(a => a.type).join(", ");
  const noiDung = text || (dinhKem ? `[khách gửi ${dinhKem}, không có chữ]` : "");
  if (!noiDung) return;

  const ls = await kho.layLichSu(env, psid);

  // Người thật đang trực → chỉ ghi lịch sử, không xếp hàng, không trả lời.
  if (await kho.nguoiDangTruc(env, psid)) {
    ls.push({ role: "user", content: noiDung, t: su.timestamp });
    await kho.luuLichSu(env, psid, ls);
    return;
  }
  // Bộ não bên ngoài (CHE_DO=may-tinh) hoặc bot tắt → ghi lịch sử + xếp vào hàng chờ.
  if ((env.CHE_DO || "may-tinh") !== "worker" || !(await kho.botDangBat(env))) {
    ls.push({ role: "user", content: noiDung, t: su.timestamp });
    await kho.luuLichSu(env, psid, ls);
    await kho.danhDauCho(env, psid, noiDung);
    return;
  }

  await baoDangGo(env, psid);
  let kq;
  try {
    kq = await traLoi(env, psid, ls, noiDung);
  } catch (e) {
    // AI hỏng (hết tiền, mạng, khoá sai...) → vẫn nhắn khách một câu, nhường sân cho người, ghi sổ.
    ls.push({ role: "user", content: noiDung, t: Date.now() });
    await kho.luuLichSu(env, psid, ls);
    await kho.ghiChuyenNguoi(env, { psid, tin: noiDung, lyDo: "AI lỗi: " + String(e.message || e) });
    await kho.danhDauNguoiTruc(env, psid);
    await guiTinBot(env, psid, "Dạ em đã nhận tin của anh/chị, chủ tiệm sẽ vào trả lời sớm nhất ạ.");
    throw e;
  }
  if (kq.traLoi) await guiTinBot(env, psid, kq.traLoi);
}

// Hỏi AI, cập nhật lịch sử, ghi sổ nếu cần người. Dùng chung cho webhook và /admin/thu.
async function traLoi(env, psid, ls, noiDung) {
  const kq = await hoiAI(env, ls, noiDung);
  let traLoi = kq.traLoi;
  if (kq.chuyenNguoi) {
    if (!traLoi) traLoi = "Dạ em ghi nhận rồi ạ, chủ tiệm sẽ vào trả lời anh/chị sớm nhất nhé.";
    await kho.ghiChuyenNguoi(env, { psid, tin: noiDung, lyDo: kq.lyDo });
    await kho.danhDauNguoiTruc(env, psid); // nhường sân cho người
    if (!psid.startsWith("thu-")) { try { await nhuongQuyen(env, psid); } catch (e) { await kho.ghiLog(env, { loai: "nhuong", psid, loi: String(e.message) }); } }
  }
  ls.push({ role: "user", content: noiDung, t: Date.now() });
  if (traLoi) ls.push({ role: "assistant", content: traLoi, t: Date.now() });
  await kho.luuLichSu(env, psid, ls);
  return { ...kq, traLoi };
}

async function admin(request, url, env) {
  if (!env.ADMIN_KEY || url.searchParams.get("key") !== env.ADMIN_KEY) return json({ loi: "sai key" }, 401);
  const p = url.pathname;

  if (p === "/admin" && request.method === "GET") {
    return json({
      bot: (await kho.botDangBat(env)) ? "bat" : "tat",
      cheDo: env.CHE_DO || "may-tinh",
      khachDangCho: (await kho.danhSachCho(env)).length,
      aiBaseUrl: env.AI_BASE_URL,
      models: String(env.MODEL || ""),
      gioNguoiTruc: Number(env.GIO_NGUOI_TRUC || 6),
      webhookLanCuoi: (await env.KHO.get("webhook:lan-cuoi")) || "chưa nhận gói tin nào",
      khachCanNguoi: await kho.docDanhSach(env, "chuyen-list"),
      loiGanDay: await kho.docDanhSach(env, "log"),
    });
  }
  if (p === "/admin/bot" && request.method === "POST") {
    const bat = url.searchParams.get("trang_thai") !== "tat";
    await kho.datTrangThaiBot(env, bat);
    return json({ bot: bat ? "bat" : "tat" });
  }
  if (p === "/admin/thu" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const psid = `thu-${b.psid || "mac-dinh"}`;
    if (b.xoa) { await env.KHO.delete(`ls:${psid}`); return json({ daXoa: psid }); }
    if (!b.text) return json({ loi: "thiếu text" }, 400);
    const ls = await kho.layLichSu(env, psid);
    const kq = await traLoi(env, psid, ls, b.text);
    return json({ traLoi: kq.traLoi, chuyenNguoi: kq.chuyenNguoi, lyDo: kq.lyDo, model: kq.model, daThu: kq.daThu, usage: kq.usage });
  }
  // Bộ não bên ngoài lấy danh sách khách đang chờ, kèm lịch sử.
  if (p === "/admin/cho-xu-ly" && request.method === "GET") {
    const ds = await kho.danhSachCho(env);
    const ra = [];
    for (const c of ds) {
      if (await kho.nguoiDangTruc(env, c.psid)) continue;
      ra.push({ ...c, lichSu: await kho.layLichSu(env, c.psid) });
    }
    return json({ soKhach: ra.length, khach: ra });
  }
  // Bộ não bên ngoài gửi tin cho khách qua worker (token Page ở đây, không rời khỏi Cloudflare).
  if (p === "/admin/gui" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    if (!b.psid || !b.text) return json({ loi: "thiếu psid hoặc text" }, 400);
    const ls = await kho.layLichSu(env, b.psid);
    try {
      await guiTinBot(env, b.psid, b.text);
    } catch (e) {
      await kho.ghiLog(env, { loai: "gui", psid: b.psid, loi: String(e.message || e) });
      return json({ ok: false, loi: String(e.message || e) }, 502);
    }
    ls.push({ role: "assistant", content: b.text, t: Date.now(), nao: b.nao || "may-tinh" });
    await kho.luuLichSu(env, b.psid, ls);
    await kho.xoaCho(env, b.psid);
    if (b.chuyen_nguoi) {
      await kho.ghiChuyenNguoi(env, { psid: b.psid, tin: b.tin || "", lyDo: b.ly_do || "" });
      await kho.danhDauNguoiTruc(env, b.psid);
      try { await nhuongQuyen(env, b.psid); } catch (e) { await kho.ghiLog(env, { loai: "nhuong", psid: b.psid, loi: String(e.message) }); }
    }
    return json({ ok: true });
  }
  if (p === "/admin/khach" && request.method === "GET") {
    const psid = url.searchParams.get("psid");
    return json({ psid, lichSu: await kho.layLichSu(env, psid), nguoiTruc: await kho.nguoiDangTruc(env, psid) });
  }
  return json({ loi: "không có đường này" }, 404);
}
