#!/usr/bin/env python3
"""Bộ não bên ngoài: lấy khách đang chờ từ worker → Claude Code soạn theo kịch bản → gửi qua worker.

Chạy: python3 local/tra-loi.py            (xử lý hàng chờ một lượt)
      python3 local/tra-loi.py --vong-lap  (chạy liên tục, task Windows gọi cách này)
      python3 local/tra-loi.py --thu "câu của khách" ["Tên Facebook"]   (chỉ soạn, không gửi)
Log:  local/tra-loi.log
"""
import json, os, sys, subprocess, urllib.request, datetime, fcntl, re, time

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKER = os.environ.get("BOT_WORKER", "https://<ten-worker>.<tai-khoan>.workers.dev").rstrip("/")  # sửa thành địa chỉ worker của bạn
SKILL = os.path.join(GOC, "kich-ban")  # kịch bản chốt đơn + mẫu tin của tiệm bạn
MODEL = os.environ.get("BOT_MODEL", "sonnet")
LOG = os.path.join(GOC, "local", "tra-loi.log")
# Thêm node/claude của nvm vào PATH (task Windows gọi vào WSL không có PATH đầy đủ)
_nvm = os.path.expanduser("~/.nvm/versions/node")
if os.path.isdir(_nvm):
    _v = sorted(os.listdir(_nvm))
    if _v: os.environ["PATH"] = os.path.join(_nvm, _v[-1], "bin") + ":" + os.environ.get("PATH", "")

def log(*a):
    dong = f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  " + " ".join(str(x) for x in a)
    if sys.stdout.isatty(): print(dong)  # chạy tay thì in ra, chạy nền thì chỉ ghi file (tránh ghi đúp)
    with open(LOG, "a", encoding="utf-8") as f: f.write(dong + "\n")

def doc(p):
    with open(p, encoding="utf-8") as f: return f.read()

def goi_worker(duong, body=None):
    key = doc(os.path.join(GOC, ".secret.admin")).strip()
    url = f"{WORKER}{duong}{'&' if '?' in duong else '?'}key={key}"
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"content-type": "application/json", "user-agent": "bot-tiem-nao/1.0"},  # Cloudflare chặn User-Agent mặc định của Python (lỗi 1010)
                                 method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        return {"ok": False, "loi": f"HTTP {e.code}: {e.read().decode(errors='ignore')[:300]}"}

def nhan_cach():
    js = doc(os.path.join(GOC, "src", "nhan-cach.js"))
    m = re.search(r"`(.*)`", js, re.S)
    return m.group(1) if m else ""

def ghep_prompt(lich_su, tin_moi, ten=""):
    kien_thuc = doc(os.path.join(GOC, "kien-thuc", "mo-dung.md"))
    kich_ban = doc(os.path.join(SKILL, "kich-ban-chot-don.md")) if os.path.exists(os.path.join(SKILL, "kich-ban-chot-don.md")) else ""
    mau_tin = doc(os.path.join(SKILL, "mau-tin-nhan.md")) if os.path.exists(os.path.join(SKILL, "mau-tin-nhan.md")) else ""
    ls = "\n".join(f"[{'KHÁCH' if m['role']=='user' else ('CHỦ TIỆM' if m.get('nguoi') else 'BOT')}] {m['content']}" for m in lich_su[-20:])
    return f"""{nhan_cach()}

===== SÁCH GIÁO KHOA VỀ MỢ DUNG (nguồn sự thật duy nhất) =====
{kien_thuc}

===== KỊCH BẢN NÓI CHUYỆN CỦA TIỆM (đi hết các bước rồi nhường người) =====
{kich_ban}

===== MẪU TIN THAM KHẢO (giọng, cách xử lý khách rép) =====
{mau_tin}

===== HỘI THOẠI TRƯỚC ĐÓ (cũ → mới) =====
{ls or '(chưa có)'}

===== KHÁCH =====
Tên Facebook của khách: {ten or "(không có)"}

===== TIN MỚI CỦA KHÁCH =====
{tin_moi}

Soạn tin trả lời tiếp theo. KHÔNG dùng bất kỳ công cụ nào (không tìm web, không đọc file, không chạy lệnh), chỉ dựa vào chữ ở trên. Trả về ĐÚNG một khối JSON, không chữ nào khác:
{{"tra_loi": "...", "chuyen_nguoi": true|false, "ly_do": "..."}}"""

def hoi_claude(prompt, thu_lai=1):
    cmd = ["claude", "-p", "--model", MODEL, "--output-format", "json", "--max-turns", "1", "--tools", ""]  # --tools "" = không công cụ
    r = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=180)
    if r.returncode != 0:
        if thu_lai > 0:  # Claude Code thỉnh thoảng thoát mã 1 không lý do, thử lại một lần
            return hoi_claude(prompt, thu_lai - 1)
        raise RuntimeError(f"claude rc={r.returncode}: {(r.stderr or r.stdout)[:400]}")
    d = json.loads(r.stdout)
    if d.get("is_error"): raise RuntimeError(f"claude is_error: {d.get('result')}")
    text = d.get("result", "")
    bat, ket = text.find("{"), text.rfind("}")
    o = json.loads(text[bat:ket + 1])
    return {"tra_loi": o.get("tra_loi", "").strip(), "chuyen_nguoi": bool(o.get("chuyen_nguoi")),
            "ly_do": o.get("ly_do", ""), "cost": d.get("total_cost_usd"), "ms": d.get("duration_ms")}

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--thu":
        kq = hoi_claude(ghep_prompt([], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else ""))
        print(json.dumps(kq, ensure_ascii=False, indent=1)); return

    khoa = open(os.path.join(GOC, "local", ".lock"), "w")
    try: fcntl.flock(khoa, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: return  # đã có một bản đang chạy vòng lặp

    # --vong-lap: chạy liên tục, 5 giây ngó hàng chờ một lần, tự thoát sau 50 phút để task Windows khởi động lại bản mới.
    if len(sys.argv) >= 2 and sys.argv[1] == "--vong-lap":
        log("bắt đầu vòng lặp")
        het = time.time() + 50 * 60
        while time.time() < het:
            try: mot_vong()
            except Exception as e: log("LỖI vòng lặp:", e)
            time.sleep(5)
        log("hết 50 phút, thoát để khởi động lại"); return

    mot_vong()

LOI_THEO_KHACH = {}  # psid -> số lần Claude lỗi liên tiếp

def mot_vong():
    d = goi_worker("/admin/cho-xu-ly")
    if "khach" not in d:
        log("LỖI gọi worker /admin/cho-xu-ly:", d.get("loi", d)); return
    khach = d.get("khach", [])
    if not khach: return  # yên lặng khi không có việc
    log(f"có {len(khach)} khách chờ")
    for k in khach:
        psid, tin = k["psid"], k["tin"]
        try:
            kq = hoi_claude(ghep_prompt(k.get("lichSu", []), tin, k.get("ten", "")))
            LOI_THEO_KHACH.pop(psid, None)
        except Exception as e:
            n = LOI_THEO_KHACH.get(psid, 0) + 1; LOI_THEO_KHACH[psid] = n
            log(f"psid ..{psid[-6:]} LỖI Claude lần {n}: {str(e)[:200]}")
            if n >= 2:  # không thử mãi: nhắn khách một câu, nhường người, rút khỏi hàng chờ
                g = goi_worker("/admin/gui", {"psid": psid, "text": "Dạ em ghi nhận rồi ạ, chủ tiệm sẽ vào trả lời anh/chị sớm nhất nhé.",
                                              "nao": "du-phong", "chuyen_nguoi": True, "ly_do": "AI lỗi 2 lần: " + str(e)[:120], "tin": tin})
                log(f"psid ..{psid[-6:]} → gửi câu chờ + chuyển người: {'OK' if g.get('ok') else g.get('loi')}")
                LOI_THEO_KHACH.pop(psid, None)
            continue
        text = kq["tra_loi"] or "Dạ em ghi nhận rồi ạ, chủ tiệm sẽ vào trả lời anh/chị sớm nhất nhé."
        g = goi_worker("/admin/gui", {"psid": psid, "text": text, "nao": f"claude-code/{MODEL}",
                                      "chuyen_nguoi": kq["chuyen_nguoi"], "ly_do": kq["ly_do"], "tin": tin})
        log(f"psid ..{psid[-6:]} | {kq['ms']}ms ${kq['cost']} | chuyen_nguoi={kq['chuyen_nguoi']} | gửi={'OK' if g.get('ok') else g.get('loi')} | {text[:80]!r}")

if __name__ == "__main__":
    main()
