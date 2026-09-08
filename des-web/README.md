# DES Cipher Lab

Web demo minh họa DES (Data Encryption Standard): mã hóa/giải mã văn bản,
mã hóa/giải mã tệp, và so sánh trực quan chế độ ECB vs CBC.

## Cách 1: Chạy bằng Docker (khuyên dùng, đúng như bạn yêu cầu)

Yêu cầu: đã cài Docker (và Docker Compose, thường đi kèm sẵn).

```bash
cd des-web
docker compose up --build
```

Sau khi build xong, mở trình duyệt vào:

```
http://localhost:5000
```

Dừng chương trình: nhấn `Ctrl + C`, hoặc chạy `docker compose down` ở terminal khác.

### Không dùng docker-compose, dùng lệnh docker thuần

```bash
cd des-web
docker build -t des-lab .
docker run -p 5000:5000 des-lab
```

## Cách 2: Chạy trực tiếp bằng Python (không cần Docker)

```bash
cd des-web
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Mở trình duyệt: http://localhost:5000

## Cấu trúc project

```
des-web/
├── app.py                # Backend Flask, xử lý mã hóa/giải mã DES
├── requirements.txt      # Thư viện Python (Flask, pycryptodome)
├── Dockerfile            # Đóng gói ứng dụng thành image
├── docker-compose.yml    # Chạy nhanh bằng 1 lệnh
├── templates/
│   └── index.html        # Giao diện web
├── static/
│   ├── style.css
│   └── script.js
└── uploads/               # Nơi lưu tạm file đã mã hóa/giải mã
```

## Ghi chú kỹ thuật cho báo cáo đồ án

- Khóa DES thật sự chỉ có 56 bit hiệu dụng (8 byte, 1 bit mỗi byte dùng làm
  parity) — đây là nguyên nhân chính khiến DES bị brute-force được từ cuối
  thập niên 1990.
- App dùng chế độ **CBC** (Cipher Block Chaining) cho mã hóa văn bản/tệp vì an
  toàn hơn ECB (Electronic Codebook).
- Tab "ECB vs CBC" minh họa trực quan điểm yếu kinh điển của ECB: các khối
  plaintext giống nhau luôn cho ra ciphertext giống nhau, để lộ cấu trúc/mẫu
  của dữ liệu gốc — đây là lý do ECB gần như không bao giờ được dùng trong
  thực tế.
- Khóa nhập vào (passphrase) được rút gọn thành khóa DES 8 byte bằng MD5
  (chỉ để tiện demo, không phải kỹ thuật KDF chuẩn dùng trong sản phẩm thật).
