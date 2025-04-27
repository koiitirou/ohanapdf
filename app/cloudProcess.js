// components/CloudProcess.js
"use client";

import React, { useState } from "react";
// ★★★ CSS Modules をインポート ★★★
import styles from "./CloudProcess.module.css"; // CSSモジュールをインポート

const CloudProcess = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  // ★★★ 追加: option1 と option2 の state を追加 ★★★
  const [option1Text, setOption1Text] = useState("");
  const [option2Text, setOption2Text] = useState("");
  // --- ここまで追加 ---
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [resultInfo, setResultInfo] = useState(null);
  // excelData state は削除済み

  // サービスの HTTPS エンドポイント URL
  const cloudRunUrl =
    "https://pdf-processor-242078138933.asia-northeast2.run.app"; // 必要に応じて更新

  const handlePdfChange = (event) => {
    setMessage("");
    setResultInfo(null);
    setPdfFile(event.target.files[0]);
  };

  const handleTxtChange = (event) => {
    setMessage("");
    setResultInfo(null);
    setPastedText(""); // TXTファイル選択時は貼り付けテキストをクリア
    setTxtFile(event.target.files[0]);
  };

  const handlePasteChange = (event) => {
    setMessage("");
    setResultInfo(null);
    setTxtFile(null); // 貼り付け時はTXTファイル選択をクリア
    setPastedText(event.target.value);
  };

  // ★★★ 追加: option1 と option2 のハンドラーを追加 ★★★
  const handleOption1Change = (event) => {
    setOption1Text(event.target.value);
  };

  const handleOption2Change = (event) => {
    setOption2Text(event.target.value);
  };
  // --- ここまで追加 ---

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
    // cloudRunUrl のチェックは省略 (必要なら元に戻す)

    setUploading(true);
    setMessage("データを処理中...");
    setResultInfo(null);

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    if (txtFile) {
      formData.append("txtFile", txtFile);
    } else if (pastedText !== "") {
      formData.append("textContent", pastedText);
    }
    // ★★★ 追加: option1 と option2 のテキストを FormData に追加 ★★★
    formData.append("option1Text", option1Text);
    formData.append("option2Text", option2Text);
    // --- ここまで追加 ---

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // excelContent を期待しないため、メッセージを元に戻す
        setMessage("処理完了。ダウンロードを試行します...");
        setResultInfo(data);
        console.log("Cloud Run Success:", data);

        if (data && data.downloadUrl) {
          console.log("Download URL received:", data.downloadUrl);
          window.open(data.downloadUrl, "_blank");
          // メッセージを元の状態に戻す
          setMessage("処理が完了しました。ダウンロードが開始されます。");
        } else {
          setMessage(
            "処理は完了しましたが、ダウンロードリンクが提供されませんでした。"
          );
        }
      } else {
        // エラーハンドリング (変更なし)
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
    } finally {
      setUploading(false);
    }
  };

  const clearInputs = () => {
    setPdfFile(null);
    setTxtFile(null);
    setPastedText("");
    // ★★★ 追加: option1 と option2 もクリア ★★★
    setOption1Text("");
    setOption2Text("");
    // --- ここまで追加 ---
    const pdfInput = document.getElementById("pdfFileCloudRun");
    if (pdfInput) pdfInput.value = "";
    const txtInput = document.getElementById("txtFileCloudRun");
    if (txtInput) txtInput.value = "";
    setMessage("");
    setResultInfo(null);
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

  // renderExcelTable 関数は削除済み

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
      {/* ★★★ 修正: Option 1 テキスト入力 - 再度追加 ★★★ */}
      <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>
        <label
          htmlFor="option1Text"
          className={`${styles.label} ${styles.optionalLabel}`}
        >
          キーワード1 (Option 1):
        </label>
        <input
          type="text"
          id="option1Text"
          value={option1Text}
          onChange={handleOption1Change} // ハンドラーを紐付け
          disabled={uploading}
          placeholder="検索したいキーワード1を入力 (任意)"
          className={styles.input}
        />
      </div>
      {/* --- ここまで修正 --- */}
      {/* ★★★ 修正: Option 2 テキスト入力 - 再度追加 ★★★ */}
      <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>
        <label
          htmlFor="option2Text"
          className={`${styles.label} ${styles.optionalLabel}`}
        >
          キーワード2 (Option 2):
        </label>
        <input
          type="text"
          id="option2Text"
          value={option2Text}
          onChange={handleOption2Change} // ハンドラーを紐付け
          disabled={uploading}
          placeholder="検索したいキーワード2を入力 (任意)"
          className={styles.input}
        />
      </div>
      {/* --- ここまで修正 --- */}

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

      {/* Excel Table Display は削除済み */}

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
