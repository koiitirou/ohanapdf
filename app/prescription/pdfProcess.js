// components/pdfProcess.js (PDF出力に戻し、デバッグログはサーバー側)
"use client";

import React, { useState } from "react";
import styles from "./CloudProcess.module.css"; // CSSモジュールのパスを確認してください
import Link from "next/link";

const PdfProcess = () => {
  // コンポーネント名を実際のファイルに合わせてください
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // ★★★ Cloud Run エンドポイント URL ★★★
  // 前回と同じエンドポイントを想定
  const cloudRunUrl =
    "https://prescription-242078138933.us-central1.run.app/filter-pdf-by-earliest-date"; // ★★★ 要確認・更新 ★★★

  const handlePdfChange = (event) => {
    setMessage("");
    setPdfFile(event.target.files[0]);
  };
  const clearInputs = () => {
    setPdfFile(null);
    const pdfInput = document.getElementById("pdfFileCloudRun");
    if (pdfInput) pdfInput.value = "";
    setMessage("");
  };
  const getMessageClass = () => {
    /* 省略 */ return styles.messageSuccess;
  };

  const handleSubmitToCloudRun = async () => {
    if (!pdfFile) {
      setMessage("PDFファイルを選択してください。");
      return;
    }
    if (cloudRunUrl.includes("<YOUR_SERVICE_URL_HERE>")) {
      setMessage("エラー: サービスの URL が設定されていません。");
      return;
    }

    setUploading(true);
    setMessage("PDFを日付でフィルタリング中...");

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);

    let response;

    try {
      response = await fetch(cloudRunUrl, { method: "POST", body: formData });

      // エラーハンドリング (前回修正したものをそのまま使用)
      if (!response.ok) {
        let errorMessage = `サーバーエラー (Status: ${response.status})`;
        let errorDetails = "";
        let rawErrorText = "";
        try {
          rawErrorText = await response.text(); // Read once
          try {
            const errorData = JSON.parse(rawErrorText);
            errorMessage = errorData.error || errorMessage;
            errorDetails = errorData.details || "";
            console.error("Cloud Run Error Data (Parsed):", errorData);
          } catch (parseError) {
            errorDetails =
              rawErrorText.substring(0, 200) || "サーバーからの詳細不明";
            console.warn(
              "Failed to parse error response as JSON. Raw text:",
              rawErrorText
            );
          }
        } catch (readError) {
          errorMessage = `サーバー応答読取失敗 (Status: ${response.status})`;
          console.error("Failed to read error response body:", readError);
        }
        setMessage(
          `エラー: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ""}`
        );
        throw new Error(errorMessage);
      }

      // --- 成功時の処理 (PDFを期待) ---
      setMessage("フィルタリング完了。PDFファイルをダウンロードします...");
      console.log("Cloud Run Success (Filter by Date):", response.status);

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "filtered_output.pdf"; // PDFを期待するデフォルト名
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      // ダウンロードリンク作成・クリック
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("フィルタリングされたPDFのダウンロードを開始しました。");
      // --- 成功処理ここまで ---
    } catch (error) {
      if (!message.startsWith("エラー:")) {
        setMessage(`予期せぬエラー: ${error.message}`);
      }
      console.error("Error in handleSubmitToCloudRun:", error);
    } finally {
      setUploading(false);
    }
  };

  // --- return JSX (PDF入力のみ) ---
  return (
    <div className={styles.container}>
      <h2>PDF日付フィルター (最古日抽出)</h2>
      <div className={styles.inputGroup}>
        <label htmlFor="pdfFileCloudRun" className={styles.label}>
          PDFファイルを選択:
        </label>
        <input
          type="file"
          id="pdfFileCloudRun"
          accept="application/pdf"
          onChange={handlePdfChange}
          disabled={uploading}
          className={styles.input}
        />
      </div>
      <button
        onClick={handleSubmitToCloudRun}
        disabled={uploading || !pdfFile}
        className={styles.button}
      >
        {uploading ? "フィルタリング中..." : "最古日でPDFをフィルタリング"}
      </button>
      {message && (
        <p className={`${styles.message} ${getMessageClass()}`}>{message}</p>
      )}
    </div>
  );
};

export default PdfProcess; // コンポーネント名に合わせて変更
