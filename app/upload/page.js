"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message);

    if (res.ok) {
      setDownloadUrl(`/uploads/${file.name}`);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setDownloadUrl("");
            setMessage("");
          }}
        />
        <button type="submit" style={{ marginLeft: "0.5rem" }}>
          アップロード
        </button>
      </form>

      {message && (
        <p style={{ marginTop: "1rem", color: "green" }}>{message}</p>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          style={{ display: "block", marginTop: "1rem", color: "blue" }}
        >
          📥 ダウンロードはこちら
        </a>
      )}
    </div>
  );
}
