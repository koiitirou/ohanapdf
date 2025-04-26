// components/CloudProcess.js
"use client";

import React, { useState } from "react";

const CloudProcess = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [resultInfo, setResultInfo] = useState(null); // 結果情報 (バケット名、オブジェクト名、downloadUrl など)

  // Cloud Run サービスの HTTPS エンドポイント URL はここで定義します
  // ★★★ ここはあなたが設定した実際のURLです。このままにします。 ★★★
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
    setTxtFile(event.target.files[0]);
  };

  const handleSubmitToCloudRun = async () => {
    // ファイルが選択されているかチェック
    if (!pdfFile) {
      setMessage("PDFファイルを選択してください。");
      return;
    }
    if (!txtFile) {
      setMessage("TXTファイルを選択してください。");
      return;
    }

    // ★★★ Cloud Run URL が元のプレースホルダーのままになっていないかチェック ★★★
    // あなたが実際のURLに設定したので、このif条件は通常falseになります。
    if (cloudRunUrl === "YOUR_CLOUD_RUN_SERVICE_URL") {
      // ★★★ 元のプレースホルダー文字列と比較 ★★★
      setMessage(
        "エラー: Cloud Run サービスの URL が設定されていません。コードを更新してください。"
      );
      setUploading(false);
      return;
    }

    setUploading(true);
    setMessage("Cloud Run にファイルを送信中...");
    setResultInfo(null); // 新しい送信開始で結果情報をクリア

    // --- formData をここで作成し、ファイルを追加します ---
    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    formData.append("txtFile", txtFile);
    // --- ここまで ---

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(
          "Cloud Run 処理が完了しました。Cloud Storage に保存されました。ダウンロードを試行します..."
        );
        setResultInfo(data);
        console.log("Cloud Run Success:", data);

        if (data && data.downloadUrl) {
          console.log(
            "Download URL received, attempting download:",
            data.downloadUrl
          );
          window.open(data.downloadUrl, "_blank");
          setMessage(
            "処理完了。Cloud Storage に保存されました。ダウンロードが自動で開始されない場合は、ポップアップブロックを確認するか、GCP Console から直接ダウンロードしてください。"
          );
        } else {
          setMessage(
            "処理は完了しましたが、ダウンロード URL が提供されませんでした。Cloud Storage を直接ご確認ください。"
          );
        }
      } else {
        try {
          const errorData = await response.json();
          const errorMessage =
            errorData.error ||
            `Cloud Run の処理に失敗しました (Status: ${response.status})`;
          const details = errorData.details || "";
          setMessage(
            `エラー: ${errorMessage} ${details ? `(${details})` : ""}`
          );
          console.error("Cloud Run Error:", errorData);
          setResultInfo(null);
        } catch (jsonError) {
          const errorMessage = `Cloud Run から予期しない応答がありました (Status: ${response.status})`;
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

  const getGcsConsoleUrl = (bucket, object) => {
    if (!bucket || !object) return null;
    return `https://console.cloud.google.com/storage/browser/${bucket}/${encodeURIComponent(
      object
    )}`;
  };

  return (
    <div>
      <h2>Cloud Run で PDF 処理 & Cloud Storage に保存</h2>
      <div>
        <label htmlFor="pdfFileCloudRun">PDFファイルを選択:</label>
        <input
          type="file"
          id="pdfFileCloudRun"
          accept="application/pdf"
          onChange={handlePdfChange}
          disabled={uploading}
        />
      </div>
      <div>
        <label htmlFor="txtFileCloudRun">並び替え順序 (TXT):</label>
        <input
          type="file"
          id="txtFileCloudRun"
          accept="text/plain"
          onChange={handleTxtChange}
          disabled={uploading}
        />
      </div>
      <button
        onClick={handleSubmitToCloudRun}
        // ★★★ disabled 条件修正: ファイルが選択されているか、かつcloudRunUrlが設定されているかを確認 ★★★
        disabled={
          uploading || !pdfFile || !txtFile || !cloudRunUrl // ★★★ cloudRunUrl が null, undefined, 空文字列でないかを確認 ★★★
        }
      >
        {uploading ? "送信中..." : "Cloud Run で処理して保存"}
      </button>

      {message && (
        <p
          style={{
            color: uploading
              ? "blue"
              : message.startsWith("エラー")
              ? "red"
              : "green",
          }}
        >
          {message}
        </p>
      )}

      {resultInfo && resultInfo.bucket && resultInfo.object && (
        <div>
          <p>保存先:</p>
          <p>
            バケット名: <code>{resultInfo.bucket}</code>
          </p>
          <p>
            オブジェクト名: <code>{resultInfo.object}</code>
          </p>
          <p>
            <a
              href={getGcsConsoleUrl(resultInfo.bucket, resultInfo.object)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloud Storage で結果を確認 (Google Cloud Console)
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default CloudProcess; // ★★★ 余分なセミコロンとコメントを削除 ★★★
