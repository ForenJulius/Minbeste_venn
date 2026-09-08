// --- Tab switching ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

function currentKey() {
  return document.getElementById("keyInput").value || "defaultkey";
}

function renderBlockStrip(hexBlocks, variant) {
  const strip = document.getElementById("blockStrip");
  strip.innerHTML = "";
  hexBlocks.forEach((hex) => {
    const chip = document.createElement("div");
    chip.className = "block-chip" + (variant ? ` ${variant}` : "");
    chip.textContent = hex;
    strip.appendChild(chip);
  });
}

function hexToBlocks(hex) {
  const blocks = [];
  for (let i = 0; i < hex.length; i += 16) blocks.push(hex.slice(i, i + 16));
  return blocks;
}

// --- Text encrypt / decrypt ---
document.getElementById("btnEncryptText").addEventListener("click", async () => {
  const plaintext = document.getElementById("plaintextInput").value;
  const out = document.getElementById("textOutput");
  out.className = "output";
  out.textContent = "Đang mã hóa...";

  try {
    const res = await fetch("/api/encrypt-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: currentKey(), plaintext }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Lỗi không xác định");

    document.getElementById("ivInput").value = data.iv_hex;
    document.getElementById("ciphertextInput").value = data.ciphertext_hex;

    out.className = "output success";
    out.textContent = `Khóa DES (hex, rút gọn từ passphrase): ${data.key_hex}\nĐã mã hóa thành công.`;

    renderBlockStrip(hexToBlocks(data.ciphertext_hex));
  } catch (err) {
    out.className = "output error";
    out.textContent = err.message;
  }
});

document.getElementById("btnDecryptText").addEventListener("click", async () => {
  const iv_hex = document.getElementById("ivInput").value;
  const ciphertext_hex = document.getElementById("ciphertextInput").value;
  const out = document.getElementById("textOutput");
  out.className = "output";
  out.textContent = "Đang giải mã...";

  try {
    const res = await fetch("/api/decrypt-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: currentKey(), iv_hex, ciphertext_hex }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Lỗi không xác định");

    out.className = "output success";
    out.textContent = `Văn bản giải mã: ${data.plaintext}`;
    document.getElementById("plaintextInput").value = data.plaintext;
  } catch (err) {
    out.className = "output error";
    out.textContent = err.message;
  }
});

// --- File encrypt / decrypt ---
document.getElementById("btnEncryptFile").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileEncryptInput");
  const out = document.getElementById("fileOutput");
  if (!fileInput.files.length) { out.className = "output error"; out.textContent = "Chọn một tệp trước đã."; return; }

  const formData = new FormData();
  formData.append("key", currentKey());
  formData.append("file", fileInput.files[0]);

  out.className = "output";
  out.textContent = "Đang mã hóa...";

  const res = await fetch("/api/encrypt-file", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json();
    out.className = "output error";
    out.textContent = data.error || "Lỗi mã hóa tệp.";
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  downloadBlob(blob, match ? match[1] : "encrypted.enc");
  out.className = "output success";
  out.textContent = "Đã mã hóa và tải xuống tệp.";
});

document.getElementById("btnDecryptFile").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileDecryptInput");
  const out = document.getElementById("fileOutput");
  if (!fileInput.files.length) { out.className = "output error"; out.textContent = "Chọn một tệp .enc trước đã."; return; }

  const formData = new FormData();
  formData.append("key", currentKey());
  formData.append("file", fileInput.files[0]);

  out.className = "output";
  out.textContent = "Đang giải mã...";

  const res = await fetch("/api/decrypt-file", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json();
    out.className = "output error";
    out.textContent = data.error || "Lỗi giải mã tệp.";
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  downloadBlob(blob, match ? match[1] : "decrypted");
  out.className = "output success";
  out.textContent = "Đã giải mã và tải xuống tệp.";
});

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// --- ECB vs CBC comparison ---
document.getElementById("btnCompare").addEventListener("click", async () => {
  const plaintext = document.getElementById("compareInput").value;
  const results = document.getElementById("compareResults");
  results.innerHTML = "Đang xử lý...";

  const res = await fetch("/api/compare-modes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: currentKey(), plaintext }),
  });
  const data = await res.json();

  results.innerHTML = "";

  const rows = [
    { label: "Plaintext (từng khối 8 byte, dạng hex)", blocks: data.plaintext_blocks, variant: "" },
    { label: "ECB — các khối giống nhau tạo ciphertext giống nhau", blocks: data.ecb_blocks, variant: "leak" },
    { label: "CBC — cùng plaintext nhưng ciphertext hoàn toàn khác nhau", blocks: data.cbc_blocks, variant: "safe" },
  ];

  rows.forEach((row) => {
    const wrap = document.createElement("div");
    wrap.className = "compare-row";
    const label = document.createElement("label");
    label.textContent = row.label;
    const blockWrap = document.createElement("div");
    blockWrap.className = "compare-blocks";
    row.blocks.forEach((hex) => {
      const chip = document.createElement("div");
      chip.className = "block-chip" + (row.variant ? ` ${row.variant}` : "");
      chip.textContent = hex;
      blockWrap.appendChild(chip);
    });
    wrap.appendChild(label);
    wrap.appendChild(blockWrap);
    results.appendChild(wrap);
  });

  renderBlockStrip(data.ecb_blocks, "leak");
});
