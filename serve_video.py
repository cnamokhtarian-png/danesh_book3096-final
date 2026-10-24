import os
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler

VIDEO_FILE = "Auralis_Handmade_Pearl_Box_Viral.mp4"

HTML_PAGE = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AURALIS — ویدیوی تبلیغاتی جعبه مرواریدی دست‌ساز</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 15%, #231d16 0%, #0d0b09 70%, #050404 100%);
      color: #f6e7c8;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .brand {
      letter-spacing: 0.4em;
      font-size: 1.5rem;
      font-weight: 600;
      color: #f6e0b2;
      margin-bottom: 6px;
      text-align: center;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #c8b08a;
      margin-bottom: 18px;
      text-align: center;
    }
    .player-card {
      background: rgba(20, 17, 14, 0.85);
      border: 1px solid rgba(218, 190, 138, 0.35);
      border-radius: 20px;
      padding: 14px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(218, 190, 138, 0.12);
      max-width: 400px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    video {
      width: 100%;
      aspect-ratio: 9 / 16;
      border-radius: 14px;
      background: #000;
      outline: none;
    }
    .actions {
      display: flex;
      gap: 12px;
      width: 100%;
      margin-top: 14px;
    }
    .btn {
      flex: 1;
      text-align: center;
      text-decoration: none;
      padding: 13px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-download {
      background: linear-gradient(135deg, #f3d79b 0%, #c69c53 100%);
      color: #16120c;
      box-shadow: 0 6px 20px rgba(198, 156, 83, 0.35);
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(198, 156, 83, 0.5);
    }
  </style>
</head>
<body>
  <div class="brand">A U R A L I S</div>
  <div class="subtitle">ویدیوی تبلیغاتی سینمایی جعبه مرواریدی دست‌ساز (9:16 Reels)</div>
  <div class="player-card">
    <video id="vid" controls autoplay loop playsinline poster="/preview.jpg">
      <source src="/Auralis_Handmade_Pearl_Box_Viral.mp4" type="video/mp4" />
      مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
    </video>
    <div class="actions">
      <a class="btn btn-download" href="/Auralis_Handmade_Pearl_Box_Viral.mp4" download="Auralis_Handmade_Pearl_Box_Viral.mp4">
        ⬇ دانلود مستقیم ویدیو (MP4 با کیفیت اصلی)
      </a>
    </div>
  </div>
</body>
</html>
"""


class RangeRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            data = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if self.path.startswith("/preview.jpg"):
            p = "output/preview_frame_535.jpg"
            if os.path.exists(p):
                with open(p, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return

        if self.path.startswith("/Auralis_Handmade_Pearl_Box_Viral.mp4"):
            if not os.path.exists(VIDEO_FILE):
                self.send_error(404, "File not found")
                return
            file_size = os.path.getsize(VIDEO_FILE)
            range_header = self.headers.get("Range")
            if range_header:
                m = re.match(r"bytes=(\d+)-(\d*)", range_header)
                if m:
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else file_size - 1
                    end = min(end, file_size - 1)
                    length = end - start + 1
                    self.send_response(206)
                    self.send_header("Content-Type", "video/mp4")
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                    self.send_header("Content-Length", str(length))
                    self.end_headers()
                    with open(VIDEO_FILE, "rb") as f:
                        f.seek(start)
                        self.wfile.write(f.read(length))
                    return

            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(file_size))
            self.end_headers()
            with open(VIDEO_FILE, "rb") as f:
                self.wfile.write(f.read())
            return

        super().do_GET()


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8080), RangeRequestHandler)
    print("Serving AURALIS video player on http://0.0.0.0:8080 ...")
    server.serve_forever()
