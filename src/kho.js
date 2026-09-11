// Kho nhớ tạm trên Cloudflare KV. Mỗi khách (PSID) có:
//  - ls:<psid>     lịch sử 20 lượt gần nhất để AI nhớ ngữ cảnh
//  - nguoi:<psid>  dấu "người thật đang trả lời", bot im trong GIO_NGUOI_TRUC giờ
//  - mid:<mid>     dấu đã xử lý tin này (Facebook có thể gửi lại cùng một tin)
// Toàn cục: bot:trang-thai (bat|tat), chuyen-list (khách cần người), log (lỗi gần nhất)

const GIOI_HAN_LICH_SU = 20;

export async function layLichSu(env, psid) {
  const raw = await env.KHO.get(`ls:${psid}`);
  return raw ? JSON.parse(raw) : [];
}

export async function luuLichSu(env, psid, lichSu) {
  const cat = lichSu.slice(-GIOI_HAN_LICH_SU);
  await env.KHO.put(`ls:${psid}`, JSON.stringify(cat), { expirationTtl: 60 * 60 * 24 * 30 });
}

export async function daXuLy(env, mid) {
  if (!mid) return false;
  const co = await env.KHO.get(`mid:${mid}`);
  if (co) return true;
  await env.KHO.put(`mid:${mid}`, "1", { expirationTtl: 60 * 60 * 24 });
  return false;
}

export async function nguoiDangTruc(env, psid) {
  return Boolean(await env.KHO.get(`nguoi:${psid}`));
}

export async function danhDauNguoiTruc(env, psid) {
  const gio = Number(env.GIO_NGUOI_TRUC || 6);
  await env.KHO.put(`nguoi:${psid}`, new Date().toISOString(), { expirationTtl: Math.max(60, gio * 3600) });
}

export async function botDangBat(env) {
  const tt = await env.KHO.get("bot:trang-thai");
  return tt !== "tat";
}

export async function datTrangThaiBot(env, bat) {
  await env.KHO.put("bot:trang-thai", bat ? "bat" : "tat");
}

async function themVaoDanhSach(env, khoa, muc, toiDa) {
  const raw = await env.KHO.get(khoa);
  const ds = raw ? JSON.parse(raw) : [];
  ds.unshift({ luc: new Date().toISOString(), ...muc });
  await env.KHO.put(khoa, JSON.stringify(ds.slice(0, toiDa)));
}

export const ghiChuyenNguoi = (env, muc) => themVaoDanhSach(env, "chuyen-list", muc, 100);
export const ghiLog = (env, muc) => themVaoDanhSach(env, "log", muc, 50);

export async function docDanhSach(env, khoa) {
  const raw = await env.KHO.get(khoa);
  return raw ? JSON.parse(raw) : [];
}

// Hàng đợi "khách chờ trả lời" cho bộ não bên ngoài (Claude Code trên máy anh).
export async function danhDauCho(env, psid, tin) {
  await env.KHO.put(`cho:${psid}`, JSON.stringify({ psid, tin, luc: new Date().toISOString() }), { expirationTtl: 60 * 60 * 48 });
  const raw = await env.KHO.get("cho-list");
  const ds = raw ? JSON.parse(raw) : [];
  if (!ds.includes(psid)) ds.push(psid);
  await env.KHO.put("cho-list", JSON.stringify(ds.slice(-500)));
}

export async function xoaCho(env, psid) {
  await env.KHO.delete(`cho:${psid}`);
  const raw = await env.KHO.get("cho-list");
  const ds = (raw ? JSON.parse(raw) : []).filter(p => p !== psid);
  await env.KHO.put("cho-list", JSON.stringify(ds));
}

export async function danhSachCho(env) {
  const raw = await env.KHO.get("cho-list");
  const ds = raw ? JSON.parse(raw) : [];
  const ra = [];
  for (const psid of ds) {
    const c = await env.KHO.get(`cho:${psid}`);
    if (c) ra.push(JSON.parse(c));
  }
  return ra;
}

export async function layTen(env, psid) { return (await env.KHO.get(`ten:${psid}`)) || ""; }
export async function luuTen(env, psid, ten) { if (ten) await env.KHO.put(`ten:${psid}`, ten, { expirationTtl: 60 * 60 * 24 * 90 }); }

// Bot tự "chuyển người": im NGẮN (mặc định 10 phút) để chủ doanh nghiệp kịp vào; không ai vào thì bot lại trả lời.
export async function danhDauChoNguoi(env, psid) {
  const phut = Number(env.PHUT_CHO_NGUOI ?? 0);
  if (phut <= 0) return; // 0 = không im; bot nói tiếp, chỉ ghi sổ để chủ doanh nghiệp biết
  await env.KHO.put(`nguoi:${psid}`, "cho-nguoi", { expirationTtl: Math.max(60, phut * 60) });
}
