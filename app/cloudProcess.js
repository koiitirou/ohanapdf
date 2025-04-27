// components/CloudProcess.js
"use client";

import React, { useState } from "react";
import styles from "./CloudProcess.module.css"; // CSSモジュールをインポート

const CloudProcess = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  // ★ option1Text, option2Text state は削除
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [resultInfo, setResultInfo] = useState(null);
  // ★ excelData state は削除

  const cloudRunUrl =
    "https://pdf-processor-242078138933.asia-northeast2.run.app";

  const handlePdfChange = (event) => {
    setMessage("");
    setResultInfo(null);
    // ★ excelData のクリアは削除
    setPdfFile(event.target.files[0]);
  };

  const handleTxtChange = (event) => {
    setMessage("");
    setResultInfo(null);
    // ★ excelData のクリアは削除
    setPastedText("");
    setTxtFile(event.target.files[0]);
  };

  const handlePasteChange = (event) => {
    setMessage("");
    setResultInfo(null);
    // ★ excelData のクリアは削除
    setTxtFile(null);
    setPastedText(event.target.value);
  };

  // ★ option1, option2 のハンドラーは削除

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
    if (cloudRunUrl === "YOUR_CLOUD_RUN_SERVICE_URL") {
      setMessage("エラー: サービスの URL が設定されていません。");
      return;
    }

    setUploading(true);
    setMessage("データを処理中...");
    setResultInfo(null);
    // ★ excelData のクリアは削除

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    if (txtFile) {
      formData.append("txtFile", txtFile);
    } else if (pastedText !== "") {
      formData.append("textContent", pastedText);
    }
    // ★ option1Text, option2Text の追加は削除

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage("処理完了。ダウンロードを開始します..."); // メッセージ変更
        setResultInfo(data);
        // ★ excelData のセットは削除
        console.log("Cloud Run Success:", data);

        if (data && data.downloadUrl) {
          console.log("Download URL received:", data.downloadUrl);
          window.open(data.downloadUrl, "_blank");
          setMessage("処理が完了しました。ダウンロードが開始されます。"); // 元のメッセージに近いもの
        } else {
          setMessage(
            "処理は完了しましたが、ダウンロードリンクが提供されませんでした。"
          );
        }
      } else {
        // (エラーハンドリング内で excelData クリア削除)
        try {
          const errorData = await response.json();
          setMessage(
            `エラー: ${
              errorData.error ||
              `処理に失敗しました (Status: ${response.status})`
            } ${errorData.details ? `(${errorData.details})` : ""}`
          );
          console.error("Cloud Run Error:", errorData);
        } catch (jsonError) {
          setMessage(
            `エラー: 処理先から予期しない応答 (Status: ${response.status})。`
          );
          console.error(
            "Cloud Run Error: Unexpected response format.",
            response,
            jsonError
          );
        }
        setResultInfo(null);
      }
    } catch (error) {
      setMessage(`送信中にエラーが発生しました: ${error.message}`);
      console.error("Fetch Error:", error);
      setResultInfo(null);
      // ★ excelData のクリアは削除
    } finally {
      setUploading(false);
    }
  };

  const clearInputs = () => {
    setPdfFile(null);
    setTxtFile(null);
    setPastedText("");
    // ★ option1, option2 のクリアは削除
    const pdfInput = document.getElementById("pdfFileCloudRun");
    if (pdfInput) pdfInput.value = "";
    const txtInput = document.getElementById("txtFileCloudRun");
    if (txtInput) txtInput.value = "";
    setMessage("");
    setResultInfo(null);
    // ★ excelData のクリアは削除
  };

  const getGcsConsoleUrl = (bucket, object) => {
    if (!bucket || !object) return null;
    return `https://console.cloud.google.com/storage/browser/${bucket}/${encodeURIComponent(
      object
    )}`;
  };
  const getMessageClass = () => {
    if (uploading) return styles.messageInfo;
    if (message.startsWith("エラー")) return styles.messageError;
    if (message) return styles.messageSuccess;
    return "";
  };

  // ★ renderExcelTable 関数は削除

  return (
    <div className={styles.container}>
      <h2>PDF & テキスト処理</h2>
      {/* PDF Input */}
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
      {/* TXT Input / Paste */}
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
      {/* ★ Option Inputs は削除 */}

      {/* Submit Button */}
      <button
        onClick={handleSubmitToCloudRun}
        disabled={uploading || !pdfFile || (!txtFile && pastedText === "")}
        className={styles.button}
      >
        {uploading ? "処理中..." : "処理して保存"}
      </button>

      {/* Message Display */}
      {message && (
        <p className={`${styles.message} ${getMessageClass()}`}>{message}</p>
      )}

      {/* ★ Excel Table Display は削除 */}

      {/* GCS リンク表示 (変更なし) */}
      {resultInfo && resultInfo.bucket && resultInfo.object && (
        <div className={styles.resultInfo}>
          <p>
            結果は Cloud Storage に保存されました:
            <a
              href={getGcsConsoleUrl(resultInfo.bucket, resultInfo.object)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              gs://{resultInfo.bucket}/{resultInfo.object}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default CloudProcess;
