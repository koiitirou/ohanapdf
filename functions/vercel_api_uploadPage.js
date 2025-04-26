"use client";
import React, { useState } from "react";

const UploadForm = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [textFile, setTextFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePdfChange = (event) => {
    setPdfFile(event.target.files[0]);
  };

  const handleTextChange = (event) => {
    setTextFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!pdfFile) {
      setMessage("PDFファイルを選択してください。");
      return;
    }
    if (!textFile) {
      setMessage("file1.txt を選択してください。");
      return;
    }

    setUploading(true);
    setMessage("処理中...");

    const formData = new FormData();
    formData.append("pdfs", pdfFile); // 'pdfs' というキーで送信 (複数ファイル対応のため)
    formData.append("file1", textFile);

    try {
      const response = await fetch("/api/process-pdf", {
        // API Route のパス
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // PDF データを Blob として処理し、ダウンロードさせる
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sorted_report.pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage("PDF処理が完了し、ダウンロードを開始しました。");
      } else {
        // エラーレスポンスを JSON として解析
        try {
          const errorData = await response.json();
          setMessage(
            `PDF処理に失敗しました: ${errorData.error || response.statusText}`
          );
        } catch (error) {
          // JSON パースに失敗した場合 (サーバーが JSON で返していない場合)
          setMessage(
            `PDF処理に失敗しました: サーバーからのエラーレスポンスが不正です.`
          );
          console.error(
            "サーバーからのエラーレスポンスの解析に失敗しました:",
            error
          );
        }
      }
    } catch (error) {
      setMessage(`アップロード中にエラーが発生しました: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>PDF 並び替えフォーム</h1>
      <div>
        <label htmlFor="pdfFile">PDFファイルを選択:</label>
        <input
          type="file"
          id="pdfFile"
          accept="application/pdf"
          onChange={handlePdfChange}
        />
      </div>
      <div>
        <label htmlFor="textFile">file1.txt を選択:</label>
        <input
          type="file"
          id="textFile"
          accept="text/plain"
          onChange={handleTextChange}
        />
      </div>
      <button onClick={handleSubmit} disabled={uploading}>
        {uploading ? "処理中..." : "PDF を並び替える"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadForm;
