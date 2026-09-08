"""
DES Cipher Lab - Flask web demo
--------------------------------
Minh họa DES (Data Encryption Standard): mã hóa/giải mã văn bản, file,
và so sánh trực quan chế độ ECB vs CBC.

Chạy trực tiếp:
    pip install -r requirements.txt
    python app.py
    -> mở http://localhost:5000

Chạy bằng Docker: xem README.md
"""

import hashlib
import os
import uuid

from flask import Flask, jsonify, render_template, request, send_file
from Crypto.Cipher import DES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

app = Flask(__name__)

BLOCK_SIZE = 8  # DES = khối 64-bit = 8 byte
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def derive_key(passphrase: str) -> bytes:
    """Chuyển một passphrase bất kỳ thành khóa DES 8 byte (demo, dùng MD5 rút gọn).

    Lưu ý: đây là cách rút gọn cho mục đích minh họa, không phải kỹ thuật KDF
    chuẩn (như PBKDF2) dùng trong hệ thống thực tế.
    """
    return hashlib.md5(passphrase.encode("utf-8")).digest()[:BLOCK_SIZE]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/encrypt-text", methods=["POST"])
def encrypt_text():
    data = request.get_json(force=True)
    key = derive_key(data.get("key", ""))
    plaintext = data.get("plaintext", "")

    cipher = DES.new(key, DES.MODE_CBC)
    ct = cipher.encrypt(pad(plaintext.encode("utf-8"), BLOCK_SIZE))

    return jsonify(
        key_hex=key.hex(),
        iv_hex=cipher.iv.hex(),
        ciphertext_hex=ct.hex(),
    )


@app.route("/api/decrypt-text", methods=["POST"])
def decrypt_text():
    data = request.get_json(force=True)
    key = derive_key(data.get("key", ""))
    try:
        iv = bytes.fromhex(data.get("iv_hex", ""))
        ct = bytes.fromhex(data.get("ciphertext_hex", ""))
        cipher = DES.new(key, DES.MODE_CBC, iv=iv)
        pt = unpad(cipher.decrypt(ct), BLOCK_SIZE)
        return jsonify(plaintext=pt.decode("utf-8"))
    except Exception as exc:
        return jsonify(error=f"Không giải mã được: khóa hoặc dữ liệu không đúng ({exc})"), 400


@app.route("/api/compare-modes", methods=["POST"])
def compare_modes():
    """So sánh ECB vs CBC trên plaintext có các khối lặp lại -> minh họa lộ pattern của ECB."""
    data = request.get_json(force=True)
    key = derive_key(data.get("key", ""))
    plaintext = data.get("plaintext", "AAAAAAAA" * 4).encode("utf-8")
    padded = pad(plaintext, BLOCK_SIZE)

    ecb = DES.new(key, DES.MODE_ECB)
    ct_ecb = ecb.encrypt(padded)

    cbc = DES.new(key, DES.MODE_CBC)
    ct_cbc = cbc.encrypt(padded)

    def to_blocks(b: bytes):
        return [b[i:i + BLOCK_SIZE].hex() for i in range(0, len(b), BLOCK_SIZE)]

    return jsonify(
        plaintext_blocks=to_blocks(padded),
        ecb_blocks=to_blocks(ct_ecb),
        cbc_blocks=to_blocks(ct_cbc),
    )


@app.route("/api/encrypt-file", methods=["POST"])
def encrypt_file():
    key = derive_key(request.form.get("key", ""))
    file = request.files["file"]
    data = file.read()

    cipher = DES.new(key, DES.MODE_CBC)
    ct = cipher.encrypt(pad(data, BLOCK_SIZE))

    out_name = f"{uuid.uuid4().hex}.enc"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    with open(out_path, "wb") as f:
        f.write(cipher.iv + ct)  # IV lưu ở 8 byte đầu file

    return send_file(
        out_path,
        as_attachment=True,
        download_name=f"{file.filename}.enc",
    )


@app.route("/api/decrypt-file", methods=["POST"])
def decrypt_file():
    key = derive_key(request.form.get("key", ""))
    file = request.files["file"]
    raw = file.read()
    iv, ct = raw[:BLOCK_SIZE], raw[BLOCK_SIZE:]

    try:
        cipher = DES.new(key, DES.MODE_CBC, iv=iv)
        pt = unpad(cipher.decrypt(ct), BLOCK_SIZE)
    except Exception as exc:
        return jsonify(error=f"Không giải mã được: khóa hoặc file không đúng ({exc})"), 400

    out_name = f"{uuid.uuid4().hex}.dec"
    out_path = os.path.join(UPLOAD_DIR, out_name)
    with open(out_path, "wb") as f:
        f.write(pt)

    original_name = file.filename[:-4] if file.filename.endswith(".enc") else f"decrypted_{file.filename}"
    return send_file(out_path, as_attachment=True, download_name=original_name)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
