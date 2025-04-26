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

  // サービスの HTTPS エンドポイント URL
  const cloudRunUrl =
    "https://pdf-processor-242078138933.asia-northeast2.run.app";

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

    if (cloudRunUrl === "YOUR_CLOUD_RUN_SERVICE_URL") {
      setMessage(
        "エラー: サービスの URL が設定されていません。コードを更新してください。"
      );
      setUploading(false);
      return;
    }

    setUploading(true);
    setMessage("データを処理中...");
    setResultInfo(null);

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);

    if (txtFile) {
      formData.append("txtFile", txtFile);
      console.log("Appending txtFile:", txtFile.name);
    } else if (pastedText !== "") {
      formData.append("textContent", pastedText);
      console.log("Appending pastedText:", pastedText.substring(0, 50) + "...");
    }

    // ★★★ 追加: option1 と option2 のテキストを FormData に追加 ★★★
    // 空文字列でも送信するようにします（バックエンドで空かどうかを判定）
    formData.append("option1Text", option1Text);
    formData.append("option2Text", option2Text);
    console.log("Appending option1Text:", option1Text);
    console.log("Appending option2Text:", option2Text);
    // --- ここまで追加 ---

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(
          "処理が完了しました。保存されました。ダウンロードを試行します..."
        );
        setResultInfo(data);
        console.log("Cloud Run Success:", data);

        if (data && data.downloadUrl) {
          console.log(
            "Download URL received, attempting download:",
            data.downloadUrl
          );
          window.open(data.downloadUrl, "_blank");
          setMessage("処理完了。使用した一時ファイルは自動的に削除されます。");
        } else {
          setMessage(
            "処理は完了しましたが、ダウンロードが提供されませんでした。"
          );
        }
      } else {
        try {
          const errorData = await response.json();
          const errorMessage =
            errorData.error ||
            `処理に失敗しました (Status: ${response.status})`;
          const details = errorData.details || "";
          setMessage(
            `エラー: ${errorMessage} ${details ? `(${details})` : ""}`
          );
          console.error("Cloud Run Error:", errorData);
          setResultInfo(null);
        } catch (jsonError) {
          const errorMessage = `処理先から予期しない応答がありました (Status: ${response.status})`;
          setMessage(
            `エラー: ${errorMessage}。応答形式が不正です。ログを確認してください。`
          );
          console.error(
            "Cloud Run Error: Unexpected response format.",
            response,
            jsonError
          );
          setResultInfo(null);
        }
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
    return ""; // メッセージがない場合は何もクラスを適用しない
  };

  return (
    // ★★★ コンテナにクラス名を適用 ★★★
    <div className={styles.container}>
      <h2>PDF & テキスト処理</h2> {/* タイトル更新 */}
      {/* ★★★ 各入力グループにクラス名を適用 ★★★ */}
      <div className={styles.inputGroup}>
        {/* ★★★ ラベルにクラス名を適用 ★★★ */}
        <label htmlFor="pdfFileCloudRun" className={styles.label}>
          PDFファイルを選択:
        </label>
        {/* ★★★ input にクラス名を適用 ★★★ */}
        <input
          type="file"
          id="pdfFileCloudRun"
          accept="application/pdf"
          onChange={handlePdfChange}
          disabled={uploading}
          className={styles.input} // input フィールドにスタイル適用
        />
      </div>
      {/* ★★★ TXTファイルアップロード または テキスト貼り付け グループ ★★★ */}
      <div className={styles.inputGroup}>
        <label htmlFor="txtFileInput" className={styles.label}>
          テキスト入力 (ファイル または 貼り付け):
        </label>
        <div id="txtFileInput" className={styles.textInputOption}>
          {" "}
          {/* オプションを囲むdiv */}
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
              className={styles.input} // input フィールドにスタイル適用
            />
          </div>
          {/* ★★★ 区切り文字にクラス名を適用 ★★★ */}
          <p className={styles.orSeparator}>- または -</p>
          <div>
            <label htmlFor="pastedText" className={styles.label}>
              テキストを直接貼り付け:
            </label>
            {/* ★★★ textarea にクラス名を適用 ★★★ */}
            <textarea
              id="pastedText"
              rows="5"
              cols="50"
              value={pastedText}
              onChange={handlePasteChange}
              disabled={uploading || txtFile !== null}
              placeholder="ここにテキストを貼り付けてください"
              className={styles.textarea} // textarea フィールドにスタイル適用
            />
          </div>
        </div>
      </div>
      {/* ★★★ 修正: Option 1 テキスト入力 - クラス名を追加 ★★★ */}
      <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>
        {" "}
        {/* inputGroup と optionalInputGroup を両方適用 */}
        <label
          htmlFor="option1Text"
          className={`${styles.label} ${styles.optionalLabel}`}
        >
          {" "}
          {/* label と optionalLabel を両方適用 */}
          キーワード1 (Option 1):
        </label>
        <input
          type="text"
          id="option1Text"
          value={option1Text}
          onChange={handleOption1Change}
          disabled={uploading}
          placeholder="検索したいキーワード1を入力 (任意)"
          className={styles.input} // inputは既存のスタイルをそのまま使うか、必要なら新しいクラスを追加
        />
      </div>
      {/* --- ここまで修正 --- */}
      {/* ★★★ 修正: Option 2 テキスト入力 - クラス名を追加 ★★★ */}
      <div className={`${styles.inputGroup} ${styles.optionalInputGroup}`}>
        {" "}
        {/* inputGroup と optionalInputGroup を両方適用 */}
        <label
          htmlFor="option2Text"
          className={`${styles.label} ${styles.optionalLabel}`}
        >
          {" "}
          {/* label と optionalLabel を両方適用 */}
          キーワード2 (Option 2):
        </label>
        <input
          type="text"
          id="option2Text"
          value={option2Text}
          onChange={handleOption2Change}
          disabled={uploading}
          placeholder="検索したいキーワード2を入力 (任意)"
          className={styles.input} // inputは既存のスタイルをそのまま使うか、必要なら新しいクラスを追加
        />
      </div>
      {/* --- ここまで修正 --- */}
      {/* ★★★ ボタンにクラス名を適用 ★★★ */}
      <button
        onClick={handleSubmitToCloudRun}
        disabled={uploading || !pdfFile || (!txtFile && pastedText === "")}
        className={styles.button} // ボタンにスタイル適用
      >
        {uploading ? "処理中..." : "処理して保存"}
      </button>
      {/* メッセージ表示部分 */}
      {message && (
        // ★★★ メッセージのスタイルをCSS Modulesで管理 ★★★
        <p className={`${styles.message} ${getMessageClass()}`}>{message}</p>
      )}
      {/* 結果表示部分は現在コメントアウトされていますが、スタイルを追加する場合もCSS Modulesを使います */}
      {/* {resultInfo && resultInfo.bucket && resultInfo.object && (
        <div className={styles.resultInfo}>
          ...結果表示の内容...
        </div>
      )} */}
    </div>
  );
};

export default CloudProcess;
