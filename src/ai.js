// Gọi AI qua máy chủ tương thích OpenAI (chat/completions, HTTP thuần).
// Máy chủ đặt ở [vars] AI_BASE_URL (OpenAI hoặc dịch vụ tương thích).
// MODEL là DANH SÁCH cách nhau bằng dấu phẩy: con đầu lỗi (hết hạn mức, 5xx, không có model)
// thì thử con sau. Ghim tên model cụ thể, KHÔNG dùng bí danh best/cheap/fast, KHÔNG dùng deepseek.
// Vào: lịch sử + tin mới của khách. Ra: { traLoi, chuyenNguoi, lyDo, usage, model }.

import KIEN_THUC from "../kien-thuc/mo-dung.md";
import { NHAN_CACH } from "./nhan-cach.js";

const MAC_DINH_URL = "https://api.openai.com/v1";
const MAC_DINH_MODEL = "gpt-4.1";

function ghepSystem() {
  return `${NHAN_CACH}\n\n===== SÁCH GIÁO KHOA VỀ TIỆM (nguồn sự thật duy nhất) =====\n${KIEN_THUC}`;
}

export function danhSachModel(env) {
  return String(env.MODEL || MAC_DINH_MODEL).split(",").map(s => s.trim()).filter(Boolean);
}

// Lấy khối JSON đầu tiên trong câu trả lời; không có thì coi cả câu là lời đáp.
function bocJson(text) {
  const bat = text.indexOf("{");
  const ket = text.lastIndexOf("}");
  if (bat >= 0 && ket > bat) {
    try {
      const o = JSON.parse(text.slice(bat, ket + 1));
      if (typeof o.tra_loi === "string") {
        return { traLoi: o.tra_loi.trim(), chuyenNguoi: Boolean(o.chuyen_nguoi), lyDo: o.ly_do || "" };
      }
    } catch { /* rơi xuống dưới */ }
  }
  return { traLoi: text.trim(), chuyenNguoi: false, lyDo: "khong-phai-json" };
}

async function goiMotModel(env, base, model, messages) {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages, max_tokens: 600, temperature: 0.4 }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`${model} → ${r.status}: ${data.error?.message || JSON.stringify(data).slice(0, 200)}`);
    e.status = r.status;
    throw e;
  }
  return data;
}

export async function hoiAI(env, lichSu, tinMoi) {
  if (!env.OPENAI_API_KEY) throw new Error("Chưa đặt secret OPENAI_API_KEY");
  const base = (env.AI_BASE_URL || MAC_DINH_URL).replace(/\/+$/, "");
  const messages = [
    { role: "system", content: ghepSystem() },
    ...lichSu.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: tinMoi },
  ];

  const loi = [];
  for (const model of danhSachModel(env)) {
    let data;
    try {
      data = await goiMotModel(env, base, model, messages);
    } catch (e) {
      loi.push(String(e.message));
      if (e.status === 401) break; // khoá sai thì đổi model cũng vô ích
      continue;
    }
    const choice = data.choices?.[0];
    if (!choice) { loi.push(`${model} → không có choices`); continue; }
    if (choice.finish_reason === "content_filter") {
      return { traLoi: "", chuyenNguoi: true, lyDo: "ai-tu-choi", usage: data.usage, model: data.model || model };
    }
    return { ...bocJson(choice.message?.content || ""), usage: data.usage, model: data.model || model, daThu: loi };
  }
  throw new Error("Mọi model đều lỗi: " + loi.join(" | "));
}
