"use client";

import React, { useState, useCallback } from "react";
import styles from "./CloudProcess.module.css";

const CloudProcess = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  // State for drag & drop UI feedback
  const [isDragging, setIsDragging] = useState(false);

  // ★★★ Please replace with your actual Cloud Run URL ★★★
  const cloudRunUrl =
    "https://simple-242078138933.asia-northeast2.run.app/zip-inputs";

  // --- File input change handlers ---
  const handlePdfChange = (event) => {
    setMessage("");
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  };

  const handleTxtChange = (event) => {
    setMessage("");
    const file = event.target.files[0];
    if (file && file.type === "text/plain") {
      setPastedText(""); // Clear pasted text if a file is selected
      setTxtFile(file);
    }
  };

  const handlePasteChange = (event) => {
    setMessage("");
    setTxtFile(null); // Clear file selection if text is pasted
    setPastedText(event.target.value);
  };

  // --- Drag and Drop Event Handlers ---
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // This is necessary to allow dropping
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setMessage("");

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      return;
    }

    // Find the first PDF and first TXT file from the dropped items
    const droppedPdf = Array.from(files).find(
      (file) => file.type === "application/pdf"
    );
    const droppedTxt = Array.from(files).find(
      (file) => file.type === "text/plain"
    );

    if (droppedPdf) {
      setPdfFile(droppedPdf);
    }
    if (droppedTxt) {
      setTxtFile(droppedTxt);
      setPastedText(""); // Clear pasted text if a TXT file is dropped
    }

    if (!droppedPdf && !droppedTxt) {
      setMessage(
        "ドロップされたファイルにPDFまたはTXTファイルが見つかりませんでした。"
      );
    }
  }, []);

  const handleSubmitToCloudRun = async () => {
    if (!pdfFile) {
      setMessage("PDFファイルを選択してください。");
      return;
    }
    if (!txtFile && pastedText === "") {
      setMessage(
        "TXTファイルをアップロードするか、テキストを直接貼り付けてください。"
      );
      return;
    }
    if (cloudRunUrl.includes("<YOUR_SERVICE_URL_HERE>")) {
      setMessage(
        "エラー: サービスの URL が設定されていません。コードを更新してください。"
      );
      return;
    }

    setUploading(true);
    setMessage("ファイル処理中...");

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    if (txtFile) {
      formData.append("txtFile", txtFile);
    } else if (pastedText !== "") {
      formData.append("textContent", pastedText);
    }

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setMessage("処理完了。ZIPファイルをダウンロードします...");
        console.log("Cloud Run Success (Full Process):", response.status);

        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition");
        let filename = "full_processed_output.zip";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch.length > 1) {
            filename = filenameMatch[1];
          }
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setMessage("処理完了。ZIPファイルのダウンロードを開始しました。");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage =
            errorData.error || `処理失敗 (Status: ${response.status})`;
          const details = errorData.details || "";
          setMessage(
            `エラー: ${errorMessage} ${details ? `(${details})` : ""}`
          );
          console.error("Cloud Run Error Data:", errorData);
        } catch (jsonError) {
          const errorText = await response.text();
          const errorMessage = `予期しない応答 (Status: ${response.status})`;
          setMessage(
            `エラー: ${errorMessage}. ${
              errorText ? `詳細: ${errorText}` : "ログ確認推奨"
            }`
          );
          console.error(
            "Cloud Run Error: Unexpected response.",
            response,
            jsonError
          );
        }
      }
    } catch (error) {
      setMessage(`送信エラー: ${error.message}`);
      console.error("Fetch Error:", error);
    } finally {
      setUploading(false);
    }
  };

  const clearInputs = () => {
    setPdfFile(null);
    setTxtFile(null);
    setPastedText("");
    const pdfInput = document.getElementById("pdfFileCloudRun");
    if (pdfInput) pdfInput.value = "";
    const txtInput = document.getElementById("txtFileCloudRun");
    if (txtInput) txtInput.value = "";
    setMessage("");
  };

  const getMessageClass = () => {
    if (message.includes("エラー")) return styles.messageError;
    if (message.includes("処理中") || message.includes("ダウンロード"))
      return styles.messageInProgress;
    if (message.includes("完了")) return styles.messageSuccess;
    return styles.messageDefault;
  };

  return (
    <div
      className={`${styles.container} ${
        isDragging ? styles.dropzoneActive : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h2>PDF/TXT処理 (ZIPダウンロード)</h2>
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
        {pdfFile && <p className={styles.fileName}>選択中: {pdfFile.name}</p>}
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="txtFileInput" className={styles.label}>
          テキスト入力 (ファイル または 貼り付け):
        </label>
        <div id="txtFileInput" className={styles.textInputOption}>
          <div>
            <label htmlFor="txtFileCloudRun" className={styles.label}>
              TXTファイルを選択:
            </label>
            <input
              type="file"
              id="txtFileCloudRun"
              accept="text/plain"
              onChange={handleTxtChange}
              disabled={uploading || pastedText !== ""}
              className={styles.input}
            />
            {txtFile && (
              <p className={styles.fileName}>選択中: {txtFile.name}</p>
            )}
          </div>
          <p className={styles.orSeparator}>- または -</p>
          <div>
            <label htmlFor="pastedText" className={styles.label}>
              テキストを直接貼り付け:
            </label>
            <textarea
              id="pastedText"
              rows="5"
              cols="50"
              value={pastedText}
              onChange={handlePasteChange}
              disabled={uploading || txtFile !== null}
              placeholder="ここにテキストを貼り付けてください"
              className={styles.textarea}
            />
          </div>
        </div>
      </div>
      <div className={styles.buttonGroup}>
        <button
          onClick={handleSubmitToCloudRun}
          disabled={uploading || !pdfFile || (!txtFile && pastedText === "")}
          className={styles.button}
        >
          {uploading ? "処理実行中..." : "処理を実行してZIPダウンロード"}
        </button>
        <button
          onClick={clearInputs}
          disabled={uploading}
          className={`${styles.button} ${styles.clearButton}`}
        >
          クリア
        </button>
      </div>
      {message && (
        <p className={`${styles.message} ${getMessageClass()}`}>{message}</p>
      )}
      {isDragging && (
        <div className={styles.dropOverlay}>
          <p>ファイルをドロップ</p>
        </div>
      )}
    </div>
  );
};

export default CloudProcess;
