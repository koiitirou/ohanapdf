// components/CloudProcess.js (Excel生成追加、キーワード入力削除)
"use client";

import React, { useState } from "react";
import styles from "./CloudProcess.module.css";

const CloudProcess = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  // --- option1, option2 の state を削除 ---
  // const [option1Text, setOption1Text] = useState("");
  // const [option2Text, setOption2Text] = useState("");
  // --- ここまで削除 ---
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  // resultInfo は不要

  // ★ エンドポイントURLは /zip-inputs のまま
  const cloudRunUrl =
    "https://zip-test-242078138933.us-central1.run.app/zip-inputs"; // ★★★ 必ず実際のURLに置き換えてください ★★★

  // --- handlePdfChange, handleTxtChange, handlePasteChange は変更なし ---
  const handlePdfChange = (event) => {
    setMessage("");
    setPdfFile(event.target.files[0]);
  };
  const handleTxtChange = (event) => {
    setMessage("");
    setPastedText("");
    setTxtFile(event.target.files[0]);
  };
  const handlePasteChange = (event) => {
    setMessage("");
    setTxtFile(null);
    setPastedText(event.target.value);
  };
  // --- ここまで変更なし ---

  // --- option1, option2 のハンドラーを削除 ---
  // const handleOption1Change = (event) => { setOption1Text(event.target.value); };
  // const handleOption2Change = (event) => { setOption2Text(event.target.value); };
  // --- ここまで削除 ---

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
    setMessage("ファイル処理中..."); // メッセージ更新

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    if (txtFile) {
      formData.append("txtFile", txtFile);
    } else if (pastedText !== "") {
      formData.append("textContent", pastedText);
    }
    // --- option1, option2 の FormData への追加を削除 ---
    // formData.append("option1Text", option1Text);
    // formData.append("option2Text", option2Text);
    // --- ここまで削除 ---

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
        // ★ デフォルトファイル名を変更
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
        // エラー処理 (変更なし)
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

  // --- clearInputs から option1, option2 を削除 ---
  const clearInputs = () => {
    setPdfFile(null);
    setTxtFile(null);
    setPastedText("");
    // setOption1Text(""); setOption2Text(""); // ← 削除
    const pdfInput = document.getElementById("pdfFileCloudRun");
    if (pdfInput) pdfInput.value = "";
    const txtInput = document.getElementById("txtFileCloudRun");
    if (txtInput) txtInput.value = "";
    setMessage("");
  };
  const getMessageClass = () => {
    /* 省略 */ return styles.messageSuccess;
  };
  // --- ここまで修正 ---

  return (
    <div className={styles.container}>
      <h2>PDF/TXT処理 (ZIPダウンロード)</h2> {/* タイトル変更 */}
      {/* PDF, TXT/Text 入力部分は変更なし */}
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
      {/* --- ★★★ キーワード入力欄を削除 ★★★ --- */}
      {/* <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>...</div> */}
      {/* <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>...</div> */}
      {/* --- ここまで削除 --- */}
      {/* --- ボタンテキスト変更 --- */}
      <button
        onClick={handleSubmitToCloudRun}
        disabled={uploading || !pdfFile || (!txtFile && pastedText === "")}
        className={styles.button}
      >
        {uploading ? "処理実行中..." : "処理を実行してZIPダウンロード"}
      </button>
      {message && (
        <p className={`${styles.message} ${getMessageClass()}`}>{message}</p>
      )}
    </div>
  );
};

export default CloudProcess;
