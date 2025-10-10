"use client";

import React, { useState } from "react";

// スタイルは変更ありません
const FileUploadStyles = () => (
  <style jsx global>{`
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }
    .drop-zone p {
      margin: 0;
      color: #666;
    }
    .drop-zone.dragging-over {
      border-color: #4285f4;
      background-color: #eaf2ff;
    }
    .file-name {
      font-weight: bold;
      color: #1b5e20;
      margin-top: 0.5rem;
      display: block;
    }
    .file-upload-container {
      max-width: 90%;
      margin: 2rem auto;
    }
    .file-upload-results {
      margin-top: 2rem;
      padding: 1.5rem;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      overflow-x: auto;
    }
    .file-upload-results h3 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #4285f4;
      padding-bottom: 0.5rem;
    }
    .file-upload-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
    .file-upload-table th,
    .file-upload-table td {
      border: 1px solid #dee2e6;
      padding: 10px 12px;
      text-align: left;
      white-space: nowrap;
    }
    .file-upload-table thead {
      background-color: #e9ecef;
      font-weight: bold;
      color: #495057;
    }
    .file-upload-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .file-upload-table tbody tr:hover {
      background-color: #e2e6ea;
    }
    .search-queries-section {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .search-queries-section h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #333;
    }
    .search-queries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
    .search-query-item label {
      font-weight: 600;
      color: #555;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      display: block;
    }
    .search-query-item input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-sizing: border-box;
    }
    .file-upload-container {
      background-color: #ffffff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
      border-top: 5px solid #4285f4;
    }
    .file-upload-container h2 {
      text-align: center;
      color: #333;
      margin-bottom: 1.5rem;
    }
    .file-upload-inputGroup {
      margin-bottom: 1.5rem;
    }
    .file-upload-label {
      display: block;
      font-weight: 600;
      color: #555;
      margin-bottom: 0.5rem;
    }
    .file-upload-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .file-upload-input:focus {
      border-color: #4285f4;
      outline: none;
    }
    .file-upload-textInputOption {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .file-upload-orSeparator {
      text-align: center;
      color: #888;
      font-weight: bold;
      margin: 0.25rem 0;
    }
    .file-upload-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      resize: vertical;
      font-family: inherit;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    .file-upload-textarea:focus {
      border-color: #4285f4;
      outline: none;
    }
    .file-upload-buttonGroup {
      text-align: center;
    }
    .file-upload-button {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s, box-shadow 0.3s;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .file-upload-button:hover:not(:disabled) {
      background-color: #357ae8;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }
    .file-upload-button:disabled {
      background-color: #b0b0b0;
      cursor: not-allowed;
    }
    .file-upload-message {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      word-wrap: break-word;
    }
    .file-upload-messageInfo {
      background-color: #e1f5fe;
      color: #01579b;
    }
    .file-upload-messageSuccess {
      background-color: #e8f5e9;
      color: #1b5e20;
      font-weight: bold;
    }
    .file-upload-messageError {
      background-color: #ffebee;
      color: #c62828;
      font-weight: bold;
    }
  `}</style>
);

const FileUpload = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [csvData, setCsvData] = useState("");
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [isTxtDragging, setIsTxtDragging] = useState(false);

  const initialQueries = [
    { label: "居宅", query: "居宅療養管理指導\\s*内科" },
    { label: "診療記録", query: "往診記録" },
    { label: "処方", query: "在宅院外処方箋" },
    { label: "データ提出", query: "外来・在宅データ提出加算" },
    { label: "追加検索1", query: "" },
    { label: "追加検索2", query: "" },
  ];
  const [searchQueries, setSearchQueries] = useState(initialQueries);

  const cloudRunUrl =
    "https://hello-world-service-242078138933.us-central1.run.app";

  const resetState = () => {
    setResponseMessage("");
    setErrorMessage("");
    setCsvData("");
  };
  const handlePdfChange = (event) => {
    resetState();
    setPdfFile(event.target.files[0]);
  };
  const handleTxtChange = (event) => {
    resetState();
    setPastedText("");
    setTxtFile(event.target.files[0]);
  };
  const handlePasteChange = (event) => {
    resetState();
    setTxtFile(null);
    const txtInput = document.getElementById("txtFileInput");
    if (txtInput) txtInput.value = "";
    setPastedText(event.target.value);
  };
  const handleSearchQueryChange = (index, newQuery) => {
    const newQueries = [...searchQueries];
    newQueries[index].query = newQuery;
    setSearchQueries(newQueries);
  };

  const handleSubmit = async () => {
    // ★★★ 修正: PDFファイルの存在のみをチェック ★★★
    if (!pdfFile) {
      setErrorMessage("PDFファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    resetState();
    setResponseMessage("PDFチェック中...");

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);

    // テキストファイル or テキスト入力がある場合のみ追加
    if (txtFile) {
      formData.append("txtFile", txtFile);
    } else if (pastedText.trim() !== "") {
      const textBlob = new Blob([pastedText], { type: "text/plain" });
      formData.append("txtFile", textBlob, "pasted_text.txt");
    }

    formData.append("searchQueries", JSON.stringify(searchQueries));

    try {
      const response = await fetch(cloudRunUrl, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setResponseMessage(
          data.message || "成功しましたが、メッセージがありません。"
        );
        setCsvData(data.csv_data || "");
      } else {
        setErrorMessage(
          data.error || `サーバーエラー (Status: ${response.status})`
        );
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setErrorMessage(`送信エラー: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ★★★ 修正: 省略されていた関数の中身を完全に記述 ★★★
  const CsvTable = ({ csvString }) => {
    if (!csvString || typeof csvString !== "string") return null;
    const lines = csvString
      .trim()
      .split("\n")
      .filter((line) => line);
    if (lines.length < 2) return null; // ヘッダーとデータ行が最低でも必要
    const headers = lines[0].split(",");
    const rows = lines.slice(1);
    return (
      <div className="file-upload-results">
        <h3>解析結果</h3>
        <table className="file-upload-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.split(",").map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getMessageClass = () => {
    let classes = "file-upload-message";
    if (isUploading) return `${classes} file-upload-messageInfo`;
    if (errorMessage) return `${classes} file-upload-messageError`;
    if (responseMessage) return `${classes} file-upload-messageSuccess`;
    return classes;
  };

  const handleDragEnter = (e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(true);
  };
  const handleDragLeave = (e, setter) => {
    e.preventDefault();
    e.stopPropagation();
    setter(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handlePdfDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPdfDragging(false);
    resetState();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].type === "application/pdf") {
        setPdfFile(files[0]);
      } else {
        setErrorMessage("PDFファイルのみドロップできます。");
      }
    }
  };
  const handleTxtDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTxtDragging(false);
    resetState();
    setPastedText("");
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].type === "text/plain") {
        setTxtFile(files[0]);
      } else {
        setErrorMessage("TXTファイルのみドロップできます。");
      }
    }
  };
  // ★★★ ここまで修正 ★★★

  return (
    <>
      <FileUploadStyles />
      <div className="file-upload-container">
        <h2>pdfチェッカー（記録確認用）</h2>

        <div className="file-upload-inputGroup">
          <label className="file-upload-label">1. PDFファイルを選択:</label>
          <div
            className={`drop-zone ${isPdfDragging ? "dragging-over" : ""}`}
            onDragEnter={(e) => handleDragEnter(e, setIsPdfDragging)}
            onDragLeave={(e) => handleDragLeave(e, setIsPdfDragging)}
            onDragOver={handleDragOver}
            onDrop={handlePdfDrop}
            onClick={() => document.getElementById("pdfFileInput").click()}
          >
            <p>ここにPDFファイルをドロップするか、クリックして選択</p>
            {pdfFile && <span className="file-name">{pdfFile.name}</span>}
            <input
              type="file"
              id="pdfFileInput"
              className="file-upload-input"
              accept="application/pdf"
              onChange={handlePdfChange}
              disabled={isUploading}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="file-upload-inputGroup">
          <label className="file-upload-label">2. テキスト入力 (任意):</label>
          <div className="file-upload-textInputOption">
            <div
              className={`drop-zone ${isTxtDragging ? "dragging-over" : ""}`}
              onDragEnter={(e) => handleDragEnter(e, setIsTxtDragging)}
              onDragLeave={(e) => handleDragLeave(e, setIsTxtDragging)}
              onDragOver={handleDragOver}
              onDrop={handleTxtDrop}
              onClick={() => document.getElementById("txtFileInput").click()}
            >
              <p>TXTファイルをドロップするか、クリックして選択</p>
              {txtFile && <span className="file-name">{txtFile.name}</span>}
              <input
                type="file"
                id="txtFileInput"
                className="file-upload-input"
                accept="text/plain"
                onChange={handleTxtChange}
                disabled={isUploading || !!pastedText}
                style={{ display: "none" }}
              />
            </div>
            <p className="file-upload-orSeparator">または</p>
            <textarea
              id="pastedText"
              className="file-upload-textarea"
              rows="4"
              placeholder="ここにテキストを貼り付け"
              value={pastedText}
              onChange={handlePasteChange}
              disabled={isUploading || !!txtFile}
            />
          </div>
        </div>

        <div className="search-queries-section">
          <h3>検索キーワード設定 (正規表現が使用できます)</h3>
          <div className="search-queries-grid">
            {searchQueries.map((item, index) => (
              <div key={index} className="search-query-item">
                <label htmlFor={`query-${index}`}>{item.label}</label>
                <input
                  type="text"
                  id={`query-${index}`}
                  value={item.query}
                  onChange={(e) =>
                    handleSearchQueryChange(index, e.target.value)
                  }
                  disabled={isUploading}
                  className="file-upload-input"
                  placeholder="検索したい文字列を入力"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="file-upload-buttonGroup">
          {/* ★★★ 修正: ボタンのdisabled条件を修正 ★★★ */}
          <button
            onClick={handleSubmit}
            className="file-upload-button"
            disabled={isUploading || !pdfFile}
          >
            {isUploading ? "pdfチェック中..." : "pdfチェック"}
          </button>
        </div>

        {(responseMessage || errorMessage) && (
          <div className={getMessageClass()}>
            {errorMessage || responseMessage}
          </div>
        )}
        <CsvTable csvString={csvData} />
      </div>
    </>
  );
};

export default FileUpload;
